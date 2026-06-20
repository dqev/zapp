import { useState, useEffect, useRef, useCallback } from 'react';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Copy, Check, Qr, Refresh2, 
  File, Link,
  Exit, Plus, User
} from 'reicon-react';
import { TransferStats } from './TransferStats';
import type { TransferItem } from '../hooks/useWebRTC';

interface ActiveWorkspaceProps {
  roomId: string;
  pendingFiles: File[];
  isConnected: boolean;
  isHost: boolean;
  peerCount: number;
  connectedPeers: string[];
  shareUrl: string;
  copied: boolean;
  copyToClipboard: () => void;
  showQR: boolean;
  setShowQR: (show: boolean) => void;
  qrCodeUrl: string;
  transferQueue: TransferItem[];
  cancelTransfer: (id: string) => void;
  pauseTransfer: (id: string) => void;
  resumeTransfer: (id: string) => void;
  sendFiles: (files: File[]) => void;
  handleReset: () => void;
  formatBytes: (bytes: number) => string;
}

export function ActiveWorkspace({
  roomId,
  pendingFiles,
  isConnected,
  isHost,
  peerCount,
  shareUrl,
  copied,
  copyToClipboard,
  showQR,
  setShowQR,
  qrCodeUrl,
  transferQueue,
  cancelTransfer,
  pauseTransfer,
  resumeTransfer,
  sendFiles,
  handleReset,
  formatBytes
}: ActiveWorkspaceProps) {
  const [showAllPending, setShowAllPending] = useState(false);

  // Memory-safe object URL cache (BUG-2 fix)
  const previewUrlsRef = useRef<Map<string, string>>(new Map());

  const getOrCreatePreviewUrl = useCallback((file: File): string | null => {
    if (!file.type.startsWith('image/')) return null;
    const key = `${file.name}-${file.size}-${file.lastModified}`;
    if (!previewUrlsRef.current.has(key)) {
      previewUrlsRef.current.set(key, URL.createObjectURL(file));
    }
    return previewUrlsRef.current.get(key)!;
  }, []);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      previewUrlsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const currentKeys = new Set(
      pendingFiles.map(f => `${f.name}-${f.size}-${f.lastModified}`)
    );
    previewUrlsRef.current.forEach((url, key) => {
      if (!currentKeys.has(key)) {
        URL.revokeObjectURL(url);
        previewUrlsRef.current.delete(key);
      }
    });
  }, [pendingFiles]);

  // Recipient send-back input
  const recipientFileInputRef = useRef<HTMLInputElement>(null);
  const handleRecipientFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    sendFiles(Array.from(e.target.files));
    e.target.value = '';
  }, [sendFiles]);

  const isSender      = pendingFiles.length > 0 || isHost;
  const firstIncoming = !isSender ? transferQueue.find(i => i.direction === 'receive') ?? null : null;
  const pendingCount  = pendingFiles.length;

  const activeTransfers = transferQueue.filter(i => i.status === 'transferring' || i.status === 'paused');
  const totalSpeed      = activeTransfers.reduce((sum, i) => sum + i.speed, 0);

  // Host: show share link even after peers connect (so more can join)
  const showSharePanel = isHost || (!isConnected && pendingFiles.length > 0);

  return (
    <motion.div
      key="active-view"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Top widgets row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* 6-digit code */}
        <div className="bg-[#2c2c2c]/10 element-border rounded-xl p-5 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-semibold text-text-secondary/60 tracking-wider uppercase block">
              Passkey code
            </span>
            <span className="text-3xl font-bold font-mono tracking-widest text-text-primary block mt-2">
              {roomId.substring(0, 3)} {roomId.substring(3)}
            </span>
          </div>

          {/* Peer count indicator for host */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-[11px] text-text-secondary/70 leading-relaxed font-normal">
              {isHost
                ? 'You are the host — share this code with anyone to start broadcasting.'
                : 'Share this key code to connect peers directly.'}
            </p>
            {isHost && peerCount > 0 && (
              <AnimatePresence>
                <motion.span
                  key={peerCount}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="shrink-0 ml-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                >
                  <User className="h-2.5 w-2.5" />
                  {peerCount} {peerCount === 1 ? 'receiver' : 'receivers'}
                </motion.span>
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Share link — visible for host (always) and sender before first connect */}
        {showSharePanel && (
          <div className="bg-[#2c2c2c]/10 element-border rounded-xl p-5 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-text-secondary/60 tracking-wider uppercase block">
                  {isHost && isConnected ? 'Invite more receivers' : 'Direct connection link'}
                </span>
                {isHost && isConnected && (
                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    room open
                  </span>
                )}
              </div>
              <div className="flex items-center bg-black/40 border border-white/10 rounded-full p-1 pl-3">
                <span className="text-xs text-text-secondary truncate flex-grow min-w-0 font-mono">
                  {shareUrl}
                </span>
                <button
                  onClick={copyToClipboard}
                  className={`p-2 rounded-full border transition-all duration-200 shrink-0 ${
                    copied
                      ? 'bg-white text-black border-white'
                      : 'bg-[#202020] hover:bg-[#252525] text-text-secondary border-white/10'
                  }`}
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>

            {/* QR toggle */}
            <div className="pt-2">
              <button
                onClick={() => setShowQR(!showQR)}
                className="flex items-center justify-between text-[10px] font-semibold text-text-secondary hover:text-text-primary transition-colors uppercase w-full py-1 border-b border-white/[0.04]"
              >
                <span className="flex items-center gap-1.5"><Link className="h-3 w-3" /> QR code link</span>
                <Qr className="h-3.5 w-3.5" />
              </button>
              <AnimatePresence>
                {showQR && qrCodeUrl && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden flex flex-col items-center mt-3 bg-white p-2 rounded-xl max-w-[110px]"
                  >
                    <img src={qrCodeUrl} alt="Room QR" className="w-full h-auto" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* File Queue / Incoming panel */}
      <div className="bg-[#2c2c2c]/10 element-border rounded-xl p-5 shadow-inner">
        {isSender ? (
          /* Sender / Host mode */
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-text-secondary/50 uppercase tracking-widest">
                  {isHost ? 'Broadcast Queue' : 'Send Queue'}
                </span>
                {pendingCount > 0 && (
                  <span className="text-[10px] font-bold font-mono bg-white/10 border border-white/10 px-2 py-0.5 rounded-full text-text-primary">
                    {pendingCount} {pendingCount === 1 ? 'file' : 'files'}
                  </span>
                )}
                {isHost && peerCount > 0 && (
                  <span className="text-[10px] font-mono text-emerald-400/70">
                    → {peerCount} {peerCount === 1 ? 'peer' : 'peers'}
                  </span>
                )}
              </div>
              {totalSpeed > 0 && (
                <span className="text-[10px] font-mono text-emerald-400 animate-pulse">
                  ↑ {formatBytes(totalSpeed)}/s
                </span>
              )}
            </div>

            {pendingFiles.length > 0 ? (
              <div className="space-y-2">
                {(showAllPending ? pendingFiles : pendingFiles.slice(0, 3)).map((file, idx) => {
                  const preview    = getOrCreatePreviewUrl(file);
                  const queueItem  = transferQueue.find(i => i.name === file.name && i.direction === 'send');
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      {preview ? (
                        <div className="h-8 w-8 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-black/40">
                          <img src={preview} alt="" className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="p-1.5 bg-element-background/40 border border-white/10 rounded-full text-text-secondary shrink-0">
                          <File className="h-3.5 w-3.5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-text-primary truncate">{file.name}</p>
                        <p className="text-[10px] font-mono text-text-secondary/50">{formatBytes(file.size)}</p>
                      </div>
                      {queueItem && (
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border shrink-0 ${
                          queueItem.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : queueItem.status === 'transferring'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : queueItem.status === 'paused'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-white/5 text-text-secondary border-white/10'
                        }`}>
                          {queueItem.status}
                        </span>
                      )}
                    </div>
                  );
                })}
                {pendingFiles.length > 3 && (
                  <button
                    onClick={() => setShowAllPending(v => !v)}
                    className="text-[10px] text-text-secondary/60 hover:text-text-secondary transition-colors font-mono mt-1"
                  >
                    {showAllPending ? 'Show less' : `+${pendingFiles.length - 3} more files`}
                  </button>
                )}
              </div>
            ) : (
              /* Host with no files yet */
              <p className="text-[11px] text-text-secondary/50 leading-relaxed">
                {isConnected
                  ? `${peerCount} ${peerCount === 1 ? 'receiver' : 'receivers'} connected and waiting. Drop files above to start broadcasting.`
                  : 'Waiting for receivers to join via the passkey code or link above…'}
              </p>
            )}

            {!isConnected && pendingFiles.length > 0 && (
              <p className="text-[10px] text-text-secondary/50 mt-4 leading-relaxed">
                Waiting for peer to connect… transfer starts automatically.
              </p>
            )}
          </div>
        ) : (
          /* Receiver mode */
          <div>
            {firstIncoming ? (
              <div className="flex items-center gap-4">
                {firstIncoming.previewUrl ? (
                  <div className="h-14 w-14 rounded-xl overflow-hidden shrink-0 border border-white/10 flex items-center justify-center bg-black/40 shadow-inner">
                    <img src={firstIncoming.previewUrl} alt="Incoming" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="p-3 bg-element-background/40 border border-white/10 rounded-full text-text-secondary shrink-0">
                    <File className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-mono text-text-secondary/50 uppercase tracking-widest block">
                    Incoming Stream
                  </span>
                  <h4 className="text-sm font-semibold text-text-primary truncate mt-0.5">
                    {firstIncoming.name}
                  </h4>
                  <p className="text-[10px] text-text-secondary/70 font-mono mt-0.5">
                    {formatBytes(firstIncoming.size)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center space-y-3 font-sans">
                <Refresh2 className="h-5 w-5 text-text-secondary/50 animate-spin mx-auto" />
                <h5 className="text-[11px] font-bold text-text-secondary uppercase tracking-widest">
                  Awaiting host broadcast
                </h5>
                <p className="text-[11px] text-text-secondary/60 max-w-[280px] mx-auto leading-relaxed">
                  {isConnected
                    ? 'Connected to host. Waiting for the host to drop files…'
                    : 'Connecting to host. Once connected, files will stream automatically.'}
                </p>
              </div>
            )}

            {/* Send files back to host */}
            {isConnected && (
              <div className="mt-4 pt-4 border-t border-white/[0.04]">
                <input
                  ref={recipientFileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleRecipientFileChange}
                />
                <button
                  onClick={() => recipientFileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-full text-[11px] font-semibold text-text-secondary hover:text-text-primary bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200 active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Send files to host
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transfer stats */}
      {transferQueue.length > 0 && (
        <TransferStats
          queue={transferQueue}
          cancelTransfer={cancelTransfer}
          pauseTransfer={pauseTransfer}
          resumeTransfer={resumeTransfer}
          formatBytes={formatBytes}
        />
      )}

      {/* Idle connected message */}
      {transferQueue.length === 0 && isConnected && (
        <div className="text-center py-6 space-y-2 border border-dashed border-white/10 rounded-xl">
          <span className="text-[11px] font-bold text-text-secondary tracking-widest uppercase block animate-pulse">
            {isHost ? 'Broadcast channel open' : 'Receiving channel ready'}
          </span>
          <p className="text-[10px] text-text-secondary/50 uppercase tracking-widest">
            {isHost
              ? `${peerCount} ${peerCount === 1 ? 'receiver' : 'receivers'} connected — drop files to broadcast`
              : 'listening for host stream'}
          </p>
        </div>
      )}

      {/* Exit */}
      <div className="pt-4 border-t border-white/[0.04]">
        <button
          onClick={handleReset}
          className="button-secondary w-full py-2.5 px-6 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-95"
        >
          <Exit className="h-4 w-4" />
          <span>Exit</span>
        </button>
      </div>
    </motion.div>
  );
}
