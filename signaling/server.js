const http = require('http');
const { WebSocketServer } = require('ws');

const port = process.env.PORT || 7860;

// Create an HTTP server to handle health check probes from Hugging Face / Render / Railway
const server = http.createServer((req, res) => {
  if (req.method === 'GET' && (req.url === '/health' || req.url === '/')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

// Attach the WebSocket server to the HTTP server
const wss = new WebSocketServer({ server });

// Keep track of rooms: roomId -> Map(peerId -> websocket)
const rooms = new Map();

wss.on('connection', (ws) => {
  let currentRoomId = null;
  let currentPeerId = null;

  console.log('New client connected');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'join': {
          const { roomId, peerId } = data;
          currentRoomId = roomId;
          currentPeerId = peerId;

          if (!rooms.has(roomId)) {
            rooms.set(roomId, new Map());
          }

          const roomPeers = rooms.get(roomId);
          
          // Save this peer's socket
          roomPeers.set(peerId, ws);

          console.log(`Peer ${peerId} joined room ${roomId}. Total peers in room: ${roomPeers.size}`);

          // Send back the list of existing peers in the room (excluding current peer)
          const existingPeers = Array.from(roomPeers.keys()).filter(id => id !== peerId);
          ws.send(JSON.stringify({
            type: 'joined',
            roomId,
            peers: existingPeers
          }));

          // Notify existing peers that a new peer has joined
          roomPeers.forEach((clientSocket, clientId) => {
            if (clientId !== peerId && clientSocket.readyState === ws.OPEN) {
              clientSocket.send(JSON.stringify({
                type: 'peer-joined',
                peerId
              }));
            }
          });
          break;
        }

        case 'signal': {
          const { roomId, peerId, targetId, signalData } = data;
          const roomPeers = rooms.get(roomId);

          if (roomPeers && roomPeers.has(targetId)) {
            const targetSocket = roomPeers.get(targetId);
            if (targetSocket.readyState === ws.OPEN) {
              targetSocket.send(JSON.stringify({
                type: 'signal',
                peerId, // Who sent the signal
                signalData
              }));
            }
          }
          break;
        }

        case 'ping': {
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        }

        default:
          console.warn('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });

  ws.on('close', () => {
    console.log(`Client disconnected: peer ${currentPeerId} from room ${currentRoomId}`);
    if (currentRoomId && currentPeerId) {
      const roomPeers = rooms.get(currentRoomId);
      if (roomPeers) {
        roomPeers.delete(currentPeerId);

        // Notify remaining peers that this peer left
        roomPeers.forEach((clientSocket, clientId) => {
          if (clientSocket.readyState === ws.OPEN) {
            clientSocket.send(JSON.stringify({
              type: 'peer-left',
              peerId: currentPeerId
            }));
          }
        });

        // Clean up empty rooms
        if (roomPeers.size === 0) {
          rooms.delete(currentRoomId);
          console.log(`Cleaned up empty room ${currentRoomId}`);
        }
      }
    }
  });

  ws.on('error', (err) => {
    console.error('Socket error:', err);
  });
});

// Start the HTTP & WebSocket server
server.listen(port, () => {
  console.log(`Zapp signaling server is running on port ${port}`);
});
