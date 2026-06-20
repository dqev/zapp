const http = require('http');
const { WebSocketServer } = require('ws');

const port    = process.env.PORT     || 8080;
const MAX_PEERS = parseInt(process.env.MAX_PEERS || '10', 10); // max receivers per broadcast room

// Create an HTTP server for health checks
const server = http.createServer((req, res) => {
  if (req.method === 'GET' && (req.url === '/health' || req.url === '/')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      rooms: rooms.size,
      maxPeers: MAX_PEERS
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

const wss = new WebSocketServer({ server });

// rooms: roomId -> { host: peerId | null, peers: Map(peerId -> ws) }
const rooms = new Map();

function getRoomInfo(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { host: null, peers: new Map() });
  }
  return rooms.get(roomId);
}

function broadcastToRoom(room, message, excludePeerId = null) {
  const json = JSON.stringify(message);
  room.peers.forEach((ws, id) => {
    if (id !== excludePeerId && ws.readyState === ws.OPEN) {
      ws.send(json);
    }
  });
}

function safeSend(ws, message) {
  if (ws && ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

wss.on('connection', (ws) => {
  let currentRoomId = null;
  let currentPeerId = null;

  // ws-level heartbeat: mark alive on any pong so dead sockets can be reaped
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  console.log('[WS] New client connected');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'join': {
          const { roomId, peerId } = data;
          currentRoomId = roomId;
          currentPeerId = peerId;

          const room = getRoomInfo(roomId);

          // Count only active connections (exclude the joining ws itself)
          const activePeers = Array.from(room.peers.values())
            .filter(sock => sock !== ws && sock.readyState === ws.OPEN);

          if (activePeers.length >= MAX_PEERS) {
            safeSend(ws, {
              type: 'error',
              code: 'ROOM_FULL',
              message: `Room is full (max ${MAX_PEERS} peers)`
            });
            console.warn(`[Room ${roomId}] FULL — rejecting peer ${peerId}`);
            break;
          }

          // Close any stale socket for the same peerId (reconnect) before overwriting
          const previousWs = room.peers.get(peerId);
          if (previousWs && previousWs !== ws && previousWs.readyState === ws.OPEN) {
            try { previousWs.close(); } catch { /* ignore */ }
          }

          // Register peer
          room.peers.set(peerId, ws);

          // First peer becomes the host (broadcaster).
          // A reconnecting host keeps its role instead of being demoted to a receiver.
          const isHost = room.host === null || room.host === peerId;
          if (room.host === null) {
            room.host = peerId;
            console.log(`[Room ${roomId}] Host set: ${peerId}`);
          }

          const existingPeers = Array.from(room.peers.keys()).filter(id => id !== peerId);
          console.log(`[Room ${roomId}] ${peerId} joined. Peers: ${room.peers.size}. isHost: ${isHost}`);

          // Tell the joiner: who they are and who is already here
          safeSend(ws, {
            type: 'joined',
            roomId,
            peerId,
            isHost,
            hostId: room.host,
            peers: existingPeers   // For host: list of existing receivers. For receiver: [hostId]
          });

          // Notify existing peers that a new peer joined
          // Include whether the NEW peer is the host (so receivers know who the host is)
          room.peers.forEach((clientWs, clientId) => {
            if (clientId !== peerId && clientWs.readyState === ws.OPEN) {
              clientWs.send(JSON.stringify({
                type: 'peer-joined',
                peerId,
                isHost,
                hostId: room.host,
                peerCount: room.peers.size
              }));
            }
          });
          break;
        }

        case 'signal': {
          const { roomId, peerId, targetId, signalData } = data;
          const room = rooms.get(roomId);
          if (!room) break;

          const targetWs = room.peers.get(targetId);
          if (targetWs && targetWs.readyState === targetWs.OPEN) {
            targetWs.send(JSON.stringify({
              type: 'signal',
              peerId,      // Who sent the signal
              signalData
            }));
          }
          break;
        }

        case 'ping': {
          ws.isAlive = true;
          safeSend(ws, { type: 'pong' });
          break;
        }

        default:
          console.warn('[WS] Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('[WS] Error handling message:', error);
    }
  });

  ws.on('close', () => {
    console.log(`[WS] Disconnected: peer ${currentPeerId} from room ${currentRoomId}`);
    if (!currentRoomId || !currentPeerId) return;

    const room = rooms.get(currentRoomId);
    if (!room) return;

    // Only act if this socket still owns the peer slot. A reconnect may have
    // already replaced it with a newer socket, in which case we must not
    // delete the peer or demote the host.
    if (room.peers.get(currentPeerId) !== ws) {
      console.log(`[WS] Stale socket for peer ${currentPeerId} closed — ignoring`);
      return;
    }

    room.peers.delete(currentPeerId);

    const wasHost = room.host === currentPeerId;
    if (wasHost) {
      // Host left — the session is over for everyone
      room.host = null;
      broadcastToRoom(room, { type: 'host-left', peerId: currentPeerId });
      console.log(`[Room ${currentRoomId}] Host left — notifying all receivers`);
    } else {
      // Regular peer left — notify remaining peers (including host)
      broadcastToRoom(room, {
        type: 'peer-left',
        peerId: currentPeerId,
        peerCount: room.peers.size
      });
    }

    // Clean up empty rooms
    if (room.peers.size === 0) {
      rooms.delete(currentRoomId);
      console.log(`[Room ${currentRoomId}] Empty — cleaned up`);
    }
  });

  ws.on('error', (err) => {
    console.error('[WS] Socket error:', err);
  });
});

// Reap dead connections: ping every 30s, terminate sockets that didn't pong
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      try { ws.terminate(); } catch { /* ignore */ }
      return;
    }
    ws.isAlive = false;
    try { ws.ping(); } catch { /* ignore */ }
  });
}, 30000);

wss.on('close', () => clearInterval(heartbeatInterval));

server.listen(port, () => {
  console.log(`[Zapp] Signaling server running on port ${port} (max ${MAX_PEERS} peers/room)`);
});
