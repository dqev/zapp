import { useEffect, useRef, useState, useCallback } from 'react';

// ─── Public interfaces ────────────────────────────────────────────────────────
export interface TransferItem {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;   // 0–100 (aggregate across all receivers when hosting)
  speed: number;      // bytes/sec (aggregate)
  eta: number;        // seconds
  status: 'queued' | 'transferring' | 'paused' | 'completed' | 'failed' | 'cancelled';
  direction: 'send' | 'receive';
  previewUrl?: string;
  // Multi-peer: per-receiver breakdown (only populated when isHost)
  peers?: { peerId: string; progress: number; speed: number; status: string }[];
}

export interface TextMessage {
  id: string;
  sender: 'self' | 'peer';
  content: string;
  timestamp: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CHUNK_SIZE            = 262144;           // 256 KB
const BUFFER_HIGH_WATERMARK = 4 * 1024 * 1024; // 4 MB
const BUFFER_LOW_WATERMARK  = 512 * 1024;       // 512 KB
const STATS_INTERVAL_MS     = 300;
const MAX_ICE_RESTARTS      = 3;

// ─── Internal types ───────────────────────────────────────────────────────────
interface SenderEntry {
  file: File;
  fileId: string;     // shared ID used in metadata/end/cancel messages
  offset: number;
  paused: boolean;
  cancelled: boolean;
  startTime: number;
  lastReportedBytes: number;
  lastReportedTime: number;
  resolvePump?: () => void;
}

interface PeerState {
  pc: RTCPeerConnection;
  dc: RTCDataChannel | null;
  sendQueue: SenderEntry[];
  activeSender: SenderEntry | null;
  pumpRunning: boolean;
  iceRestartCount: number;
}

interface ReceiverState {
  id: string; name: string; size: number; type: string;
  chunks: ArrayBuffer[];
  bytesReceived: number;
  startTime: number;
  lastReportedBytes: number;
  lastReportedTime: number;
}

// ─── Thumbnail helper ─────────────────────────────────────────────────────────
function generateThumbnail(file: File): Promise<string | undefined> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) { resolve(undefined); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 120;
        let w = img.width, h = img.height;
        if (w > h) { if (w > maxDim) { h = Math.round(h * maxDim / w); w = maxDim; } }
        else        { if (h > maxDim) { w = Math.round(w * maxDim / h); h = maxDim; } }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) { ctx.drawImage(img, 0, 0, w, h); resolve(canvas.toDataURL('image/jpeg', 0.6)); }
        else resolve(undefined);
      };
      img.onerror = () => resolve(undefined);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(file);
  });
}

// ─── RTCPeerConnection config ─────────────────────────────────────────────────
function buildIceConfig(): RTCConfiguration {
  const iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302'  },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'turn:openrelay.metered.ca:80',              username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443',             username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
  ];
  const turnUrl = import.meta.env.VITE_TURN_URL;
  if (turnUrl) {
    iceServers.push({
      urls: turnUrl,
      username:   import.meta.env.VITE_TURN_USERNAME   || undefined,
      credential: import.meta.env.VITE_TURN_CREDENTIAL || undefined,
    });
  }
  return {
    iceServers,
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useWebRTC(roomId: string) {
  const [peerId]         = useState(() => Math.random().toString(36).substring(2, 9));
  const [isHost, setIsHost]             = useState(false);
  const [hostId, setHostId]             = useState<string | null>(null);
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);  // live peer IDs
  const [connectionState, setConnectionState] = useState<
    'disconnected' | 'connecting' | 'connected' | 'failed'
  >('disconnected');
  const [textMessages, setTextMessages] = useState<TextMessage[]>([]);
  const [transferQueue, setTransferQueue] = useState<TransferItem[]>([]);

  const wsRef = useRef<WebSocket | null>(null);

  // Star topology: one PeerState per remote peer
  // Host: Map has one entry per receiver
  // Receiver: Map has exactly one entry (the host)
  const peersRef = useRef<Map<string, PeerState>>(new Map());

  // Receiver-side state (only used when !isHost)
  const receivingRef = useRef<ReceiverState | null>(null);

  const isHostRef = useRef(false); // sync copy for callbacks

  // ── Helpers ────────────────────────────────────────────────────────────────
  const updateItem = useCallback((id: string, patch: Partial<TransferItem>) => {
    setTransferQueue(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item));
  }, []);

  const signalTo = useCallback((targetId: string, signalData: object) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'signal', roomId, peerId, targetId, signalData }));
  }, [roomId, peerId]);

  // ── Send pump — runs independently per peer ───────────────────────────────
  const runPumpForPeer = useCallback(async (remotePeerId: string) => {
    const peerState = peersRef.current.get(remotePeerId);
    if (!peerState || peerState.pumpRunning) return;
    peerState.pumpRunning = true;

    try {
      while (true) {
        const ps = peersRef.current.get(remotePeerId);
        if (!ps) break;

        // Pick next file from this peer's queue
        if (!ps.activeSender) {
          const next = ps.sendQueue.find(e => !e.cancelled && e.offset < e.file.size);
          if (!next) break;
          ps.activeSender = next;
          next.startTime         = Date.now();
          next.lastReportedBytes = 0;
          next.lastReportedTime  = Date.now();
          // Update aggregate status — only set transferring if not already
          updateItem(next.fileId, { status: 'transferring' });
        }

        const sender = ps.activeSender;
        const dc     = ps.dc;

        if (!dc || dc.readyState !== 'open') break;
        if (sender.cancelled) { ps.activeSender = null; continue; }

        if (sender.paused) {
          await new Promise<void>(resolve => { sender.resolvePump = resolve; });
          continue;
        }

        if (dc.bufferedAmount > BUFFER_HIGH_WATERMARK) {
          await new Promise<void>(resolve => { sender.resolvePump = resolve; });
          continue;
        }

        // Inner chunk loop
        while (sender.offset < sender.file.size && !sender.paused && !sender.cancelled) {
          if (dc.bufferedAmount > BUFFER_HIGH_WATERMARK) {
            await new Promise<void>(resolve => { sender.resolvePump = resolve; });
            const currentPeer = peersRef.current.get(remotePeerId);
            if (!currentPeer?.dc || currentPeer.dc.readyState !== 'open') break;
            break;
          }

          const end   = Math.min(sender.offset + CHUNK_SIZE, sender.file.size);
          const chunk = await sender.file.slice(sender.offset, end).arrayBuffer();

          const currentPeer = peersRef.current.get(remotePeerId);
          const currentDc   = currentPeer?.dc;
          if (!currentDc || currentDc.readyState !== 'open') {
            updateItem(sender.fileId, { status: 'failed', speed: 0, eta: 0 });
            sender.cancelled = true;
            break;
          }
          if (sender.cancelled) break;

          try {
            currentDc.send(chunk);
          } catch (err) {
            console.error(`[Pump:${remotePeerId}] Send error:`, err);
            updateItem(sender.fileId, { status: 'failed', speed: 0, eta: 0 });
            try { currentDc.send(JSON.stringify({ type: 'file-error', id: sender.fileId })); } catch { /* */ }
            sender.cancelled = true;
            break;
          }

          sender.offset = end;

          // Stats update (per-peer, then aggregate across all peers for same fileId)
          const now = Date.now();
          if (now - sender.lastReportedTime >= STATS_INTERVAL_MS || sender.offset === sender.file.size) {
            const bytesDiff = sender.offset - sender.lastReportedBytes;
            const elapsed   = Math.max(1, now - sender.lastReportedTime);
            const speed     = (bytesDiff / elapsed) * 1000;
            const remaining = sender.file.size - sender.offset;
            const eta       = speed > 0 ? Math.round(remaining / speed) : 0;
            const progress  = Math.round((sender.offset / sender.file.size) * 100);
            sender.lastReportedBytes = sender.offset;
            sender.lastReportedTime  = now;

            // Aggregate: compute average progress across all peers sending this file
            let totalProgress = 0, totalSpeed = 0, peerCount = 0;
            peersRef.current.forEach(ps2 => {
              const entry = [...ps2.sendQueue, ps2.activeSender].filter(Boolean).find(e => e?.fileId === sender.fileId);
              if (entry) {
                totalProgress += Math.round((entry.offset / entry.file.size) * 100);
                peerCount++;
              }
            });
            // This peer's progress counts too (already updated)
            if (peerCount === 0) peerCount = 1;
            const avgProgress = peerCount > 1 ? Math.round(totalProgress / peerCount) : progress;

            updateItem(sender.fileId, { progress: avgProgress, speed: totalSpeed + speed, eta });
          }
        }

        // Done sending to this peer?
        const currentPeer2 = peersRef.current.get(remotePeerId);
        const currentDc2   = currentPeer2?.dc;
        if (!sender.cancelled && sender.offset >= sender.file.size) {
          if (currentDc2 && currentDc2.readyState === 'open') {
            currentDc2.send(JSON.stringify({ type: 'file-end', id: sender.fileId }));
          }
          // Check if ALL peers have finished this file
          let allDone = true;
          peersRef.current.forEach(ps2 => {
            const isActive = ps2.activeSender?.fileId === sender.fileId && ps2.activeSender.offset < ps2.activeSender.file.size;
            const isQueued = ps2.sendQueue.some(e => e.fileId === sender.fileId && !e.cancelled && e.offset < e.file.size);
            if (isActive || isQueued) allDone = false;
          });
          if (allDone) {
            updateItem(sender.fileId, { progress: 100, status: 'completed', speed: 0, eta: 0 });
          }
          ps.sendQueue = ps.sendQueue.filter(e => e.fileId !== sender.fileId);
          ps.activeSender = null;
        } else if (sender.cancelled) {
          ps.sendQueue    = ps.sendQueue.filter(e => e.fileId !== sender.fileId);
          ps.activeSender = null;
        }
      }
    } finally {
      const ps = peersRef.current.get(remotePeerId);
      if (ps) ps.pumpRunning = false;
    }
  }, [updateItem]);

  // ── Setup DataChannel ─────────────────────────────────────────────────────
  const setupDataChannel = useCallback((remotePeerId: string, dc: RTCDataChannel) => {
    const ps = peersRef.current.get(remotePeerId);
    if (!ps) return;
    ps.dc = dc;
    dc.binaryType = 'arraybuffer';
    dc.bufferedAmountLowThreshold = BUFFER_LOW_WATERMARK;

    dc.onopen = () => {
      console.log(`[DC:${remotePeerId}] Opened`);
      setConnectedPeers(prev => prev.includes(remotePeerId) ? prev : [...prev, remotePeerId]);
      setConnectionState('connected');
      if (ps.sendQueue.length > 0) runPumpForPeer(remotePeerId);
    };

    dc.onclose = () => {
      console.log(`[DC:${remotePeerId}] Closed`);
      setConnectedPeers(prev => prev.filter(id => id !== remotePeerId));
      // If no peers left, go back to connecting/disconnected
      setConnectedPeers(prev => {
        if (prev.length === 0) setConnectionState('disconnected');
        return prev;
      });
    };

    dc.onmessage = (event) => handleIncomingMessage(remotePeerId, event);

    dc.onbufferedamountlow = () => {
      const currentPs = peersRef.current.get(remotePeerId);
      const sender = currentPs?.activeSender;
      if (sender?.resolvePump) {
        const resolve = sender.resolvePump;
        sender.resolvePump = undefined;
        resolve();
      } else if (currentPs && !currentPs.pumpRunning && currentPs.sendQueue.length > 0) {
        runPumpForPeer(remotePeerId);
      }
    };
  }, [runPumpForPeer]); // handleIncomingMessage via ref below

  // ── Incoming message router ───────────────────────────────────────────────
  // Use a ref so callbacks always have fresh state without stale closures
  const dispatchRef = useRef<{
    onText: (msg: { id: string; content: string }) => void;
    onFileMetadata: (msg: { id: string; name: string; size: number; fileType: string; preview?: string }) => void;
    onFileEnd: (id: string) => void;
    onFileError: (id: string) => void;
    onFileCancel: (id: string) => void;
    onBinaryChunk: (data: ArrayBuffer) => void;
  }>({
    onText: () => {},
    onFileMetadata: () => {},
    onFileEnd: () => {},
    onFileError: () => {},
    onFileCancel: () => {},
    onBinaryChunk: () => {},
  });

  // Keep dispatch ref fresh
  useEffect(() => {
    dispatchRef.current = {
      onText: (msg) => {
        setTextMessages(prev => [...prev, {
          id: msg.id, sender: 'peer', content: msg.content,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      },
      onFileMetadata: (msg) => {
        receivingRef.current = {
          id: msg.id, name: msg.name, size: msg.size, type: msg.fileType,
          chunks: [], bytesReceived: 0,
          startTime: Date.now(), lastReportedBytes: 0, lastReportedTime: Date.now()
        };
        setTransferQueue(prev => [...prev, {
          id: msg.id, name: msg.name, size: msg.size, type: msg.fileType,
          progress: 0, speed: 0, eta: 0,
          status: 'transferring', direction: 'receive',
          previewUrl: msg.preview
        }]);
      },
      onFileEnd: (id) => {
        const recv = receivingRef.current;
        if (!recv || recv.id !== id) return;
        const blob = new Blob(recv.chunks, { type: recv.type });
        const url  = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = recv.name;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTransferQueue(prev => prev.map(item =>
          item.id === id
            ? { ...item, progress: 100, status: 'completed', speed: 0, eta: 0,
                previewUrl: recv.type.startsWith('image/') ? url : item.previewUrl }
            : item
        ));
        receivingRef.current = null;
      },
      onFileError: (id) => {
        setTransferQueue(prev => prev.map(item =>
          item.id === id ? { ...item, status: 'failed' } : item
        ));
        if (receivingRef.current?.id === id) receivingRef.current = null;
      },
      onFileCancel: (id) => {
        if (receivingRef.current?.id === id) receivingRef.current = null;
        setTransferQueue(prev => prev.map(item =>
          item.id === id ? { ...item, status: 'cancelled', speed: 0, eta: 0 } : item
        ));
      },
      onBinaryChunk: (data) => {
        const recv = receivingRef.current;
        if (!recv) return;
        recv.chunks.push(data);
        recv.bytesReceived += data.byteLength;
        const now = Date.now();
        if (now - recv.lastReportedTime >= STATS_INTERVAL_MS || recv.bytesReceived === recv.size) {
          const bytesDiff = recv.bytesReceived - recv.lastReportedBytes;
          const elapsed   = Math.max(1, now - recv.lastReportedTime);
          const speed     = (bytesDiff / elapsed) * 1000;
          const remaining = recv.size - recv.bytesReceived;
          const eta       = speed > 0 ? Math.round(remaining / speed) : 0;
          const progress  = Math.round((recv.bytesReceived / recv.size) * 100);
          recv.lastReportedBytes = recv.bytesReceived;
          recv.lastReportedTime  = now;
          setTransferQueue(prev => prev.map(item =>
            item.id === recv.id ? { ...item, progress, speed, eta } : item
          ));
        }
      }
    };
  }); // no deps — always fresh

  const handleIncomingMessage = useCallback((_remotePeerId: string, event: MessageEvent) => {
    if (typeof event.data === 'string') {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'text':         dispatchRef.current.onText(msg); break;
          case 'file-metadata':dispatchRef.current.onFileMetadata(msg); break;
          case 'file-end':     dispatchRef.current.onFileEnd(msg.id); break;
          case 'file-error':   dispatchRef.current.onFileError(msg.id); break;
          case 'file-cancel':  dispatchRef.current.onFileCancel(msg.id); break;
        }
      } catch (e) { console.error('[DC] Parse error:', e); }
    } else {
      dispatchRef.current.onBinaryChunk(event.data as ArrayBuffer);
    }
  }, []);

  // ── Cleanup a single peer's connection ───────────────────────────────────
  const cleanupPeer = useCallback((remotePeerId: string) => {
    const ps = peersRef.current.get(remotePeerId);
    if (!ps) return;
    if (ps.activeSender) {
      ps.activeSender.cancelled = true;
      ps.activeSender.resolvePump?.();
    }
    ps.dc?.close();
    ps.pc.onicecandidate          = null;
    ps.pc.onconnectionstatechange = null;
    ps.pc.ondatachannel           = null;
    ps.pc.close();
    peersRef.current.delete(remotePeerId);
    setConnectedPeers(prev => {
      const next = prev.filter(id => id !== remotePeerId);
      if (next.length === 0) setConnectionState('disconnected');
      return next;
    });
  }, []);

  // ── Cleanup all peers ─────────────────────────────────────────────────────
  const cleanupAllPeers = useCallback(() => {
    peersRef.current.forEach((_, pid) => cleanupPeer(pid));
    setConnectionState('disconnected');
    setConnectedPeers([]);
    receivingRef.current = null;
  }, [cleanupPeer]);

  // ── Initiate connection to a specific peer ────────────────────────────────
  const initiatePeerConnection = useCallback((remotePeerId: string, isCaller: boolean) => {
    console.log(`[WebRTC] Connect to ${remotePeerId}, isCaller: ${isCaller}`);

    // Clean up any existing connection to this peer
    cleanupPeer(remotePeerId);

    const pc = new RTCPeerConnection(buildIceConfig());
    const ps: PeerState = {
      pc, dc: null,
      sendQueue: [], activeSender: null,
      pumpRunning: false, iceRestartCount: 0
    };
    peersRef.current.set(remotePeerId, ps);

    pc.onicecandidate = (event) => {
      if (event.candidate) signalTo(remotePeerId, { candidate: event.candidate });
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      const currentPs = peersRef.current.get(remotePeerId);
      if (!currentPs) return;
      console.log(`[PC:${remotePeerId}] State: ${state}`);

      if (state === 'connected') {
        currentPs.iceRestartCount = 0;
      } else if (state === 'failed') {
        if (currentPs.iceRestartCount < MAX_ICE_RESTARTS) {
          currentPs.iceRestartCount++;
          console.log(`[PC:${remotePeerId}] ICE restart ${currentPs.iceRestartCount}/${MAX_ICE_RESTARTS}`);
          pc.restartIce();
        } else {
          console.warn(`[PC:${remotePeerId}] Max ICE restarts — giving up`);
          cleanupPeer(remotePeerId);
        }
      } else if (state === 'disconnected') {
        setTimeout(() => {
          const p2 = peersRef.current.get(remotePeerId);
          if (!p2) return;
          if (p2.pc.connectionState === 'disconnected' || p2.pc.connectionState === 'failed') {
            if (p2.iceRestartCount < MAX_ICE_RESTARTS) {
              p2.iceRestartCount++;
              p2.pc.restartIce();
            } else {
              cleanupPeer(remotePeerId);
            }
          }
        }, 5000);
      } else if (state === 'closed') {
        cleanupPeer(remotePeerId);
      }
    };

    if (isCaller) {
      // Host creates the DataChannel
      const dc = pc.createDataChannel('zapp-transfer', { ordered: true });
      setupDataChannel(remotePeerId, dc);
      pc.createOffer().then(async (offer) => {
        await pc.setLocalDescription(offer);
        signalTo(remotePeerId, { sdp: pc.localDescription });
      });
    } else {
      // Receiver waits for the DataChannel from the host
      pc.ondatachannel = (event) => setupDataChannel(remotePeerId, event.channel);
    }
  }, [signalTo, cleanupPeer, setupDataChannel]);

  // ── WebSocket signaling ───────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;
    let active = true;
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let heartbeatInterval: ReturnType<typeof setInterval>;

    const connectSignaling = () => {
      if (!active) return;
      const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname)
                   || window.location.hostname.startsWith('192.168.');
      const wsUrl = isLocal
        ? `ws://${window.location.hostname}:8080`
        : 'wss://devchauhann-zapp.hf.space';

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected to signaling server');
        setConnectionState(prev => prev === 'connected' ? 'connected' : 'connecting');
        ws.send(JSON.stringify({ type: 'join', roomId, peerId }));
        heartbeatInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
        }, 25000);
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          switch (data.type) {

            case 'joined': {
              // Server tells us our role and who's already in the room
              const meIsHost = data.isHost as boolean;
              isHostRef.current = meIsHost;
              setIsHost(meIsHost);
              setHostId(data.hostId as string | null);

              if (meIsHost) {
                // Host: connect to every existing peer (receivers already in the room)
                const existingPeers: string[] = data.peers || [];
                existingPeers.forEach(rid => initiatePeerConnection(rid, true));
              } else {
                // Receiver: connect to the host
                const hid = data.hostId as string;
                if (hid && hid !== peerId) initiatePeerConnection(hid, false);
              }
              break;
            }

            case 'peer-joined': {
              // A new peer joined the room
              const newPeerId = data.peerId as string;
              if (newPeerId === peerId) break; // ignore self

              if (isHostRef.current) {
                // Host: a new receiver arrived — open a connection to them
                initiatePeerConnection(newPeerId, true);
              }
              // Receivers don't connect to each other — only the host initiates
              break;
            }

            case 'signal': {
              const { peerId: senderPeerId, signalData } = data;
              if (!peersRef.current.has(senderPeerId)) {
                // Receiver getting offer from host before peer-joined was processed
                initiatePeerConnection(senderPeerId, false);
              }
              const ps = peersRef.current.get(senderPeerId);
              if (!ps) break;

              if (signalData.sdp) {
                await ps.pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
                if (signalData.sdp.type === 'offer') {
                  const answer = await ps.pc.createAnswer();
                  await ps.pc.setLocalDescription(answer);
                  signalTo(senderPeerId, { sdp: ps.pc.localDescription });
                }
              } else if (signalData.candidate) {
                try { await ps.pc.addIceCandidate(new RTCIceCandidate(signalData.candidate)); }
                catch (e) { console.error('[WS] ICE candidate error:', e); }
              }
              break;
            }

            case 'peer-left': {
              // Any peer disconnected
              const leftId = data.peerId as string;
              cleanupPeer(leftId);
              break;
            }

            case 'host-left': {
              // The broadcaster disconnected — session is over for all receivers
              console.log('[WS] Host left — cleaning up all connections');
              cleanupAllPeers();
              setHostId(null);
              setIsHost(false);
              isHostRef.current = false;
              break;
            }

            case 'error': {
              console.warn('[WS] Server error:', data.message);
              setConnectionState('failed');
              break;
            }
          }
        } catch (err) {
          console.error('[WS] Error processing message:', err);
        }
      };

      ws.onerror = (err) => console.error('[WS] Error:', err);
      ws.onclose = () => {
        console.log('[WS] Disconnected');
        clearInterval(heartbeatInterval);
        if (active) reconnectTimeout = setTimeout(connectSignaling, 3000);
      };
    };

    connectSignaling();
    return () => {
      active = false;
      clearTimeout(reconnectTimeout);
      clearInterval(heartbeatInterval);
      wsRef.current?.close();
      cleanupAllPeers();
    };
  }, [roomId, peerId, initiatePeerConnection, cleanupPeer, cleanupAllPeers, signalTo]);

  // ── Public: sendFiles — fans out to all connected receivers ───────────────
  const sendFiles = useCallback(async (files: File[]) => {
    // Check at least one peer is connected
    const openPeers = Array.from(peersRef.current.entries()).filter(
      ([, ps]) => ps.dc && ps.dc.readyState === 'open'
    );
    if (openPeers.length === 0) return; // no connected peers — caller handles UI

    for (const file of files) {
      const fileId = Math.random().toString(36).substring(2, 9);
      const localPreviewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;

      // Add one UI row per file (aggregate row, not per-peer)
      setTransferQueue(prev => [...prev, {
        id: fileId, name: file.name, size: file.size,
        type: file.type || 'application/octet-stream',
        progress: 0, speed: 0, eta: 0,
        status: 'queued', direction: 'send',
        previewUrl: localPreviewUrl
      }]);

      const thumb = await generateThumbnail(file);

      // Fan-out: send metadata + queue file for every connected peer
      for (const [remotePeerId, ps] of peersRef.current.entries()) {
        const dc = ps.dc;
        if (!dc || dc.readyState !== 'open') continue;

        // Send metadata
        dc.send(JSON.stringify({
          type: 'file-metadata', id: fileId,
          name: file.name, size: file.size,
          fileType: file.type || 'application/octet-stream',
          preview: thumb
        }));

        // Push a fresh SenderEntry (independent offset per peer)
        ps.sendQueue.push({
          file, fileId, offset: 0,
          paused: false, cancelled: false,
          startTime: Date.now(), lastReportedBytes: 0, lastReportedTime: Date.now()
        });

        // Kick off this peer's pump (idempotent)
        runPumpForPeer(remotePeerId);
      }
    }
  }, [runPumpForPeer]);

  const sendFile = useCallback((file: File) => sendFiles([file]), [sendFiles]);

  // ── Public: sendText ──────────────────────────────────────────────────────
  const sendText = useCallback((content: string) => {
    let sent = false;
    peersRef.current.forEach(ps => {
      if (ps.dc && ps.dc.readyState === 'open') {
        const messageId = Math.random().toString(36).substring(2, 9);
        ps.dc.send(JSON.stringify({ type: 'text', id: messageId, content }));
        sent = true;
      }
    });
    if (sent) {
      setTextMessages(prev => [...prev, {
        id: Math.random().toString(36).substring(2, 9),
        sender: 'self', content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }
  }, []);

  // ── Public: pauseTransfer ────────────────────────────────────────────────
  const pauseTransfer = useCallback((id: string) => {
    peersRef.current.forEach(ps => {
      const entry = [...ps.sendQueue, ps.activeSender].filter(Boolean).find(e => e?.fileId === id);
      if (entry && !entry.paused) {
        entry.paused = true;
      }
    });
    updateItem(id, { status: 'paused', speed: 0, eta: 0 });
  }, [updateItem]);

  // ── Public: resumeTransfer ───────────────────────────────────────────────
  const resumeTransfer = useCallback((id: string, remotePeerId?: string) => {
    const targetPeers = remotePeerId
      ? [peersRef.current.get(remotePeerId)].filter(Boolean) as PeerState[]
      : Array.from(peersRef.current.values());

    targetPeers.forEach(ps => {
      const entry = [...ps.sendQueue, ps.activeSender].filter(Boolean).find(e => e?.fileId === id);
      if (!entry?.paused) return;
      entry.paused = false;
      if (ps.activeSender?.fileId === id) {
        const resolve = entry.resolvePump;
        entry.resolvePump = undefined;
        resolve?.();
      }
    });

    // Find which remote peer has this as activeSender to get id for runPumpForPeer
    peersRef.current.forEach((ps, pid) => {
      if (ps.sendQueue.some(e => e.fileId === id)) runPumpForPeer(pid);
    });

    updateItem(id, { status: 'transferring' });
  }, [updateItem, runPumpForPeer]);

  // ── Public: cancelTransfer ───────────────────────────────────────────────
  const cancelTransfer = useCallback((id: string) => {
    // Sender side — cancel on all peers
    peersRef.current.forEach((ps, _remotePeerId) => {
      const entry = [...ps.sendQueue, ps.activeSender].filter(Boolean).find(e => e?.fileId === id);
      if (entry) {
        entry.cancelled = true;
        const resolve = entry.resolvePump;
        entry.resolvePump = undefined;
        resolve?.();
        try { ps.dc?.send(JSON.stringify({ type: 'file-cancel', id })); } catch { /* */ }
      }
    });
    // Receiver side
    if (receivingRef.current?.id === id) {
      receivingRef.current = null;
      peersRef.current.forEach(ps => {
        try { ps.dc?.send(JSON.stringify({ type: 'file-cancel', id })); } catch { /* */ }
      });
    }
    updateItem(id, { status: 'cancelled', speed: 0, eta: 0 });
  }, [updateItem]);

  // Derived state
  const peerCount = connectedPeers.length;
  const isConnectedState: typeof connectionState = peerCount > 0
    ? 'connected'
    : connectionState === 'failed' ? 'failed' : connectionState;

  return {
    peerId,
    isHost,
    hostId,
    connectedPeers,
    peerCount,
    connectionState: isConnectedState,
    textMessages,
    transferQueue,
    sendFile,
    sendFiles,
    sendText,
    pauseTransfer,
    resumeTransfer,
    cancelTransfer,
  };
}
