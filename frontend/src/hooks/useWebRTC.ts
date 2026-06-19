import { useEffect, useRef, useState } from 'react';

export interface TransferItem {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number; // 0 to 100
  speed: number;    // bytes per second
  eta: number;      // seconds remaining
  status: 'queued' | 'transferring' | 'completed' | 'failed';
  direction: 'send' | 'receive';
  previewUrl?: string;
}

export interface TextMessage {
  id: string;
  sender: 'self' | 'peer';
  content: string;
  timestamp: string;
}

const CHUNK_SIZE = 16384; // 16KB chunk size (safe for WebRTC)
const BUFFER_THRESHOLD = 65536; // 64KB threshold to throttle

function generateThumbnail(file: File): Promise<string | undefined> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(undefined);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 120;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        } else {
          resolve(undefined);
        }
      };
      img.onerror = () => resolve(undefined);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(file);
  });
}

export function useWebRTC(roomId: string) {
  const [peerId] = useState(() => Math.random().toString(36).substring(2, 9));
  const [connectedPeerId, setConnectedPeerId] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'failed'>('disconnected');
  const [textMessages, setTextMessages] = useState<TextMessage[]>([]);
  const [transferQueue, setTransferQueue] = useState<TransferItem[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  
  // File sending state
  const sendingFileRef = useRef<{
    file: File;
    offset: number;
    id: string;
    reader: FileReader;
    startTime: number;
    lastReportedBytes: number;
    lastReportedTime: number;
  } | null>(null);

  // File receiving state
  const receivingFileRef = useRef<{
    id: string;
    name: string;
    size: number;
    type: string;
    chunks: ArrayBuffer[];
    bytesReceived: number;
    startTime: number;
    lastReportedBytes: number;
    lastReportedTime: number;
  } | null>(null);

  // Initialize WebSocket signaling connection with heartbeat and auto-reconnect
  useEffect(() => {
    if (!roomId) return;

    let active = true;
    let reconnectTimeout: NodeJS.Timeout;
    let heartbeatInterval: NodeJS.Timeout;

    const connectSignaling = () => {
      if (!active) return;

      const isLocal = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1' || 
                      window.location.hostname.startsWith('192.168.');
      const wsUrl = isLocal 
        ? `ws://${window.location.hostname}:8080` 
        : `wss://devchauhann-zapp.hf.space`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to signaling server');
        setConnectionState(prev => prev === 'connected' ? 'connected' : 'connecting');
        ws.send(JSON.stringify({ type: 'join', roomId, peerId }));

        // Heartbeat ping-pong to keep connection alive on cloud proxies (e.g. Render/Heroku/Railway)
        heartbeatInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000); // Send ping every 25 seconds
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'joined': {
              if (data.peers && data.peers.length > 0) {
                const target = data.peers[0];
                setConnectedPeerId(target);
                initiatePeerConnection(target, true);
              }
              break;
            }

            case 'peer-joined': {
              setConnectedPeerId(data.peerId);
              initiatePeerConnection(data.peerId, false);
              break;
            }

            case 'signal': {
              const { peerId: senderPeerId, signalData } = data;
              
              if (!pcRef.current) {
                initiatePeerConnection(senderPeerId, false);
              }
              
              const pc = pcRef.current!;
              
              if (signalData.sdp) {
                await pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
                if (signalData.sdp.type === 'offer') {
                  const answer = await pc.createAnswer();
                  await pc.setLocalDescription(answer);
                  wsRef.current?.send(JSON.stringify({
                    type: 'signal',
                    roomId,
                    peerId,
                    targetId: senderPeerId,
                    signalData: { sdp: pc.localDescription }
                  }));
                }
              } else if (signalData.candidate) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
                } catch (e) {
                  console.error('Error adding ICE candidate:', e);
                }
              }
              break;
            }

            case 'peer-left': {
              console.log('Peer disconnected from room');
              cleanupPeerConnection();
              break;
            }
          }
        } catch (err) {
          console.error('Error processing signaling message:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('Signaling server WebSocket error:', err);
      };

      ws.onclose = () => {
        console.log('Signaling server WebSocket closed');
        clearInterval(heartbeatInterval);
        
        if (active) {
          // Reconnect with 3-second delay
          reconnectTimeout = setTimeout(connectSignaling, 3000);
        }
      };
    };

    connectSignaling();

    return () => {
      active = false;
      clearTimeout(reconnectTimeout);
      clearInterval(heartbeatInterval);
      wsRef.current?.close();
      cleanupPeerConnection();
    };
  }, [roomId, peerId]);

  // Set up RTCPeerConnection with STUN + optional environment-injected TURN credentials
  const initiatePeerConnection = (targetPeerId: string, isCaller: boolean) => {
    console.log(`Initiating connection: isCaller = ${isCaller}, target = ${targetPeerId}`);
    
    const iceServers: RTCIceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ];

    // Check for production TURN configurations injected via environment variables
    const turnUrl = import.meta.env.VITE_TURN_URL;
    const turnUsername = import.meta.env.VITE_TURN_USERNAME;
    const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

    if (turnUrl) {
      iceServers.push({
        urls: turnUrl,
        username: turnUsername || undefined,
        credential: turnCredential || undefined
      });
    }

    const configuration: RTCConfiguration = {
      iceServers
    };

    const pc = new RTCPeerConnection(configuration);
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        wsRef.current?.send(JSON.stringify({
          type: 'signal',
          roomId,
          peerId,
          targetId: targetPeerId,
          signalData: { candidate: event.candidate }
        }));
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Peer connection state changed:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setConnectedPeerId(targetPeerId);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
        cleanupPeerConnection();
      } else if (pc.connectionState === 'failed') {
        setConnectionState('failed');
      }
    };

    if (isCaller) {
      // Create data channel
      const dc = pc.createDataChannel('zapp-transfer-channel', {
        ordered: true
      });
      setupDataChannel(dc);
      
      pc.createOffer().then(async (offer) => {
        await pc.setLocalDescription(offer);
        wsRef.current?.send(JSON.stringify({
          type: 'signal',
          roomId,
          peerId,
          targetId: targetPeerId,
          signalData: { sdp: pc.localDescription }
        }));
      });
    } else {
      pc.ondatachannel = (event) => {
        setupDataChannel(event.channel);
      };
    }
  };

  // Configure Data Channel events
  const setupDataChannel = (dc: RTCDataChannel) => {
    dcRef.current = dc;
    dc.binaryType = 'arraybuffer';
    dc.bufferedAmountLowThreshold = BUFFER_THRESHOLD;

    dc.onopen = () => {
      console.log('Data channel opened');
      setConnectionState('connected');
    };

    dc.onclose = () => {
      console.log('Data channel closed');
      cleanupPeerConnection();
    };

    dc.onmessage = (event) => {
      handleIncomingMessage(event);
    };

    dc.onbufferedamountlow = () => {
      // Resume sending file chunk when buffer is cleared
      if (sendingFileRef.current) {
        sendNextChunk();
      }
    };
  };

  const cleanupPeerConnection = () => {
    pcRef.current?.close();
    pcRef.current = null;
    dcRef.current = null;
    setConnectionState('disconnected');
    setConnectedPeerId(null);
    receivingFileRef.current = null;
    sendingFileRef.current = null;
  };

  // Handle data channel message
  const handleIncomingMessage = (event: MessageEvent) => {
    if (typeof event.data === 'string') {
      // Control JSON message or Text message
      try {
        const msg = JSON.parse(event.data);
        
        switch (msg.type) {
          case 'text': {
            setTextMessages((prev) => [
              ...prev,
              {
                id: msg.id,
                sender: 'peer',
                content: msg.content,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ]);
            break;
          }

          case 'file-metadata': {
            const { id, name, size, fileType, preview } = msg;
            receivingFileRef.current = {
              id,
              name,
              size,
              type: fileType,
              chunks: [],
              bytesReceived: 0,
              startTime: Date.now(),
              lastReportedBytes: 0,
              lastReportedTime: Date.now()
            };

            setTransferQueue((prev) => [
              ...prev,
              {
                id,
                name,
                size,
                type: fileType,
                progress: 0,
                speed: 0,
                eta: 0,
                status: 'transferring',
                direction: 'receive',
                previewUrl: preview
              }
            ]);
            break;
          }

          case 'file-end': {
            const receiving = receivingFileRef.current;
            if (receiving && receiving.id === msg.id) {
              const fileBlob = new Blob(receiving.chunks, { type: receiving.type });
              const url = URL.createObjectURL(fileBlob);

              // Auto-trigger download
              const a = document.createElement('a');
              a.href = url;
              a.download = receiving.name;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              
              setTransferQueue((prev) =>
                prev.map((item) =>
                  item.id === receiving.id
                    ? { 
                        ...item, 
                        progress: 100, 
                        status: 'completed', 
                        speed: 0, 
                        eta: 0,
                        previewUrl: receiving.type.startsWith('image/') ? url : item.previewUrl
                      }
                    : item
                )
              );

              // Free memory
              receivingFileRef.current = null;
            }
            break;
          }

          case 'file-error': {
            setTransferQueue((prev) =>
              prev.map((item) =>
                item.id === msg.id
                  ? { ...item, status: 'failed' }
                  : item
              )
            );
            receivingFileRef.current = null;
            break;
          }

          case 'file-cancel': {
            const receiving = receivingFileRef.current;
            if (receiving && receiving.id === msg.id) {
              receivingFileRef.current = null;
            }
            const sending = sendingFileRef.current;
            if (sending && sending.id === msg.id) {
              sendingFileRef.current = null;
            }
            setTransferQueue((prev) =>
              prev.map((item) =>
                item.id === msg.id
                  ? { ...item, status: 'failed', speed: 0, eta: 0 }
                  : item
              )
            );
            break;
          }
        }
      } catch (e) {
        console.error('Failed to parse text message:', e);
      }
    } else {
      // Binary chunk received
      const receiving = receivingFileRef.current;
      if (receiving) {
        receiving.chunks.push(event.data);
        receiving.bytesReceived += event.data.byteLength;

        const now = Date.now();
        const elapsedSinceReport = now - receiving.lastReportedTime;

        let speed = 0;
        let eta = 0;

        // Update speed and progress metrics every 400ms or on completion
        if (elapsedSinceReport > 400 || receiving.bytesReceived === receiving.size) {
          const bytesDiff = receiving.bytesReceived - receiving.lastReportedBytes;
          speed = (bytesDiff / elapsedSinceReport) * 1000; // bytes/sec
          
          const remainingBytes = receiving.size - receiving.bytesReceived;
          eta = speed > 0 ? Math.round(remainingBytes / speed) : 0;
          
          receiving.lastReportedBytes = receiving.bytesReceived;
          receiving.lastReportedTime = now;

          const progress = Math.round((receiving.bytesReceived / receiving.size) * 100);
          setTransferQueue((prev) =>
            prev.map((item) =>
              item.id === receiving.id
                ? { ...item, progress, speed, eta }
                : item
            )
          );
        }
      }
    }
  };

  // Send next file slice
  const sendNextChunk = () => {
    const sending = sendingFileRef.current;
    if (!sending || !dcRef.current || dcRef.current.readyState !== 'open') return;

    while (sending.offset < sending.file.size) {
      // Pause sending if buffer is getting full
      if (dcRef.current.bufferedAmount > BUFFER_THRESHOLD) {
        return;
      }

      const slice = sending.file.slice(sending.offset, sending.offset + CHUNK_SIZE);
      sending.offset += slice.size;

      sending.reader.onload = (e) => {
        if (e.target?.result instanceof ArrayBuffer) {
          try {
            dcRef.current?.send(e.target.result);
            
            const now = Date.now();
            const elapsed = now - sending.lastReportedTime;

            if (elapsed > 400 || sending.offset === sending.file.size) {
              const bytesDiff = sending.offset - sending.lastReportedBytes;
              const speed = (bytesDiff / elapsed) * 1000;
              const remaining = sending.file.size - sending.offset;
              const eta = speed > 0 ? Math.round(remaining / speed) : 0;

              sending.lastReportedBytes = sending.offset;
              sending.lastReportedTime = now;

              const progress = Math.round((sending.offset / sending.file.size) * 100);
              
              setTransferQueue((prev) =>
                prev.map((item) =>
                  item.id === sending.id
                    ? { ...item, progress, speed, eta }
                    : item
                )
              );
            }

            if (sending.offset === sending.file.size) {
              // File transfer complete
              dcRef.current?.send(JSON.stringify({ type: 'file-end', id: sending.id }));
              
              setTransferQueue((prev) =>
                prev.map((item) =>
                  item.id === sending.id
                    ? { ...item, progress: 100, status: 'completed', speed: 0, eta: 0 }
                    : item
                )
              );
              sendingFileRef.current = null;
            } else {
              // Continue chunking
              sendNextChunk();
            }
          } catch (err) {
            console.error('Data channel send error:', err);
            dcRef.current?.send(JSON.stringify({ type: 'file-error', id: sending.id }));
            setTransferQueue((prev) =>
              prev.map((item) =>
                item.id === sending.id ? { ...item, status: 'failed' } : item
              )
            );
            sendingFileRef.current = null;
          }
        }
      };

      sending.reader.readAsArrayBuffer(slice);
      return; // Return and wait for onload callback or next buffer drain event
    }
  };

  // Trigger file sending
  const sendFile = async (file: File) => {
    if (!dcRef.current || dcRef.current.readyState !== 'open') {
      alert('No peer connected. Establish connection first.');
      return;
    }

    const fileId = Math.random().toString(36).substring(2, 9);
    
    // Generate local preview URL instantly if it's an image
    let localPreviewUrl: string | undefined;
    if (file.type.startsWith('image/')) {
      localPreviewUrl = URL.createObjectURL(file);
    }
    
    // Add to local transfer list
    const newItem: TransferItem = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      progress: 0,
      speed: 0,
      eta: 0,
      status: 'queued',
      direction: 'send',
      previewUrl: localPreviewUrl
    };

    setTransferQueue((prev) => [...prev, newItem]);

    // Generate small thumbnail for sending to peer
    const base64Thumbnail = await generateThumbnail(file);

    // Send metadata to receiver (with optional preview thumbnail)
    dcRef.current.send(JSON.stringify({
      type: 'file-metadata',
      id: fileId,
      name: file.name,
      size: file.size,
      fileType: file.type || 'application/octet-stream',
      preview: base64Thumbnail
    }));

    // Start transfer
    sendingFileRef.current = {
      file,
      offset: 0,
      id: fileId,
      reader: new FileReader(),
      startTime: Date.now(),
      lastReportedBytes: 0,
      lastReportedTime: Date.now()
    };

    setTransferQueue((prev) =>
      prev.map((item) =>
        item.id === fileId ? { ...item, status: 'transferring' } : item
      )
    );

    sendNextChunk();
  };

  // Send Text messages
  const sendText = (content: string) => {
    if (!dcRef.current || dcRef.current.readyState !== 'open') {
      alert('No peer connected. Establish connection first.');
      return;
    }

    const messageId = Math.random().toString(36).substring(2, 9);
    const msg = {
      type: 'text',
      id: messageId,
      content
    };

    dcRef.current.send(JSON.stringify(msg));

    setTextMessages((prev) => [
      ...prev,
      {
        id: messageId,
        sender: 'self',
        content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const cancelTransfer = (id: string) => {
    const sending = sendingFileRef.current;
    if (sending && sending.id === id) {
      sendingFileRef.current = null;
      try {
        dcRef.current?.send(JSON.stringify({ type: 'file-cancel', id }));
      } catch (e) {
        console.error('Failed to send file-cancel signal:', e);
      }
    }

    const receiving = receivingFileRef.current;
    if (receiving && receiving.id === id) {
      receivingFileRef.current = null;
      try {
        dcRef.current?.send(JSON.stringify({ type: 'file-cancel', id }));
      } catch (e) {
        console.error('Failed to send file-cancel signal:', e);
      }
    }

    setTransferQueue((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'failed', speed: 0, eta: 0 } : item
      )
    );
  };

  return {
    peerId,
    connectedPeerId,
    connectionState,
    textMessages,
    transferQueue,
    sendFile,
    sendText,
    cancelTransfer
  };
}
