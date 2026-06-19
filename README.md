# Zapp — Peer-to-Peer File & Clipboard Sharing

Zapp is a high-performance, browser-native, peer-to-peer file and text transfer web application. Files stream directly between browsers via encrypted WebRTC DataChannels with zero intermediate server uploads.

## Features
- **Direct P2P Streaming:** WebRTC DataChannels connect browsers directly.
- **Byte-level Progress Metrics:** Real-time speed (MB/s), elapsed time, and ETA calculations.
- **Multi-File Queue:** Queue multiple files for sequential transfer.
- **Text Clipboard Share:** Share links, text snippets, and code snippets directly.
- **Responsive Dark Theme:** Dark charcoal (`#181818`) UI with glowing "uprising" hero gradients.

## Tech Stack
- **Frontend:** React (TypeScript) + Vite
- **Styling:** Tailwind CSS + Framer Motion
- **Signaling:** Node.js + WebSockets (`ws` library)

## Running Locally

1. Install dependencies at the root:
   ```bash
   npm install
   ```

2. Start the signaling server and frontend dev server concurrently:
   ```bash
   npm run dev
   ```

3. Open the browser at the local address printed by Vite (typically `http://localhost:5173`).
