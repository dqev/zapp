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
export const CHUNK_SIZE            = 262144;           // 256 KB
export const BUFFER_HIGH_WATERMARK = 8 * 1024 * 1024;  // 8 MB — keep the SCTP pipe fuller for higher throughput
export const BUFFER_LOW_WATERMARK  = 1 * 1024 * 1024;  // 1 MB
export const STATS_INTERVAL_MS     = 300;
export const MAX_ICE_RESTARTS      = 3;
export const TEXT_CHUNK_SIZE       = 16384;            // 16 KB — keeps each text DataChannel message well under SCTP limits

// ─── Internal types ───────────────────────────────────────────────────────────
export interface SenderEntry {
  file: File;
  fileId: string;        // shared ID used in metadata/end/cancel messages
  thumb?: string;        // precomputed image thumbnail (sent with metadata)
  metadataSent: boolean; // whether file-metadata has been emitted to this peer yet
  offset: number;
  paused: boolean;
  cancelled: boolean;
  startTime: number;
  lastReportedBytes: number;
  lastReportedTime: number;
  lastSpeed: number;     // most recent computed speed (bytes/sec) for this peer
  resolvePump?: () => void;
}

export interface PeerState {
  pc: RTCPeerConnection;
  dc: RTCDataChannel | null;
  sendQueue: SenderEntry[];
  activeSender: SenderEntry | null;
  pumpRunning: boolean;
  iceRestartCount: number;
  pendingCandidates: RTCIceCandidateInit[]; // candidates received before remoteDescription is set
  queuedFileIds: Set<string>;               // fileIds already queued to this peer (dedupe)
}

// A file the local node is broadcasting; replayed to every peer that connects
export interface BroadcastFile {
  file: File;
  fileId: string;
  thumb?: string;
}

export interface ReceiverState {
  id: string;
  name: string;
  size: number;
  type: string;
  chunks: ArrayBuffer[];
  bytesReceived: number;
  startTime: number;
  lastReportedBytes: number;
  lastReportedTime: number;
}
