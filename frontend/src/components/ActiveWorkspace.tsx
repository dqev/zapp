import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Copy, Check, Qr, Refresh2, 
  File, Link,
  Exit
} from 'reicon-react';
import { TransferStats } from './TransferStats';
import { formatBytes } from '../utils/format';
import type { TransferItem } from '../hooks/useWebRTC';

interface ActiveWorkspaceProps {
  roomId: string;
  pendingFile: File | null;
  isConnected: boolean;
  shareUrl: string;
  copied: boolean;
  copyToClipboard: () => void;
  showQR: boolean;
  setShowQR: (show: boolean) => void;
  qrCodeUrl: string;
  transferQueue: TransferItem[];
  cancelTransfer: (id: string) => void;
  handleReset: () => void;
}

export function ActiveWorkspace({
  roomId,
  pendingFile,
  isConnected,
  shareUrl,
  copied,
  copyToClipboard,
  showQR,
  setShowQR,
  qrCodeUrl,
  transferQueue,
  cancelTransfer,
  handleReset
}: ActiveWorkspaceProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (pendingFile && pendingFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(pendingFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [pendingFile]);

  return (
    <motion.div
      key="active-view"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Controller/Code widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* 6-Digit Code widget */}
        <div className="bg-[#2c2c2c]/10 element-border rounded-xl p-5 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-semibold text-text-secondary/60 tracking-wider uppercase block">
              Passkey code
            </span>
            <span className="text-3xl font-bold font-mono tracking-widest text-text-primary block mt-2">
              {roomId.substring(0, 3)} {roomId.substring(3)}
            </span>
          </div>
          <p className="text-[11px] text-text-secondary/70 leading-relaxed mt-4 font-normal">
            Share this key code to direct peers. Once entered, browser stream starts.
          </p>
        </div>

        {/* URL Direct link sharing widget */}
        {pendingFile && !isConnected && (
          <div className="bg-[#2c2c2c]/10 element-border rounded-xl p-5 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[10px] font-semibold text-text-secondary/60 tracking-wider uppercase block">
                Direct connection link
              </span>
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
            
            {/* QR Code toggle */}
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

      {/* File Details / Transfer Progress */}
      <div className="bg-[#2c2c2c]/10 element-border rounded-xl p-6 shadow-inner">
        {pendingFile ? (
          /* Sender Mode selected file */
          <div className="flex items-center gap-4">
            {previewUrl ? (
              <div className="h-14 w-14 rounded-xl overflow-hidden shrink-0 border border-white/10 flex items-center justify-center bg-black/40 shadow-inner">
                <img src={previewUrl} alt="Pending File Preview" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="p-3 bg-element-background/40 border border-white/10 rounded-full text-text-secondary shrink-0">
                <File className="h-6 w-6" />
              </div>
            )}
            <div className="min-w-0">
              <span className="text-[10px] font-mono text-text-secondary/50 uppercase tracking-widest block">
                Queue Details
              </span>
              <h4 className="text-sm font-semibold text-text-primary truncate mt-0.5">
                {pendingFile.name}
              </h4>
              <p className="text-[10px] text-text-secondary/70 font-mono mt-0.5">
                {formatBytes(pendingFile.size)} • {pendingFile.type.split('/')[1] || 'binary'}
              </p>
            </div>
          </div>
        ) : (
          /* Recipient Mode incoming file */
          <div>
            {transferQueue.length > 0 ? (
              <div className="flex items-center gap-4">
                {transferQueue[0].previewUrl ? (
                  <div className="h-14 w-14 rounded-xl overflow-hidden shrink-0 border border-white/10 flex items-center justify-center bg-black/40 shadow-inner">
                    <img src={transferQueue[0].previewUrl} alt="Incoming File Preview" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="p-3 bg-element-background/40 border border-white/10 rounded-full text-text-secondary shrink-0">
                    <File className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0">
                  <span className="text-[10px] font-mono text-text-secondary/50 uppercase tracking-widest block">
                    Incoming Stream
                  </span>
                  <h4 className="text-sm font-semibold text-text-primary truncate mt-0.5">
                    {transferQueue[0].name}
                  </h4>
                  <p className="text-[10px] text-text-secondary/70 font-mono mt-0.5">
                    {formatBytes(transferQueue[0].size)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center space-y-3 font-sans">
                <Refresh2 className="h-5 w-5 text-text-secondary/50 animate-spin mx-auto" />
                <h5 className="text-[11px] font-bold text-text-secondary uppercase tracking-widest">
                  Awaiting peer transmission
                </h5>
                <p className="text-[11px] text-text-secondary/60 max-w-[280px] mx-auto leading-relaxed">
                  Once the sender connects, direct streaming starts automatically.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active queue display */}
      {transferQueue.length > 0 && (
        <div>
          <TransferStats queue={transferQueue} cancelTransfer={cancelTransfer} />
        </div>
      )}

      {/* Inactive tunnel message */}
      {transferQueue.length === 0 && isConnected && (
        <div className="text-center py-6 space-y-2 border border-dashed border-white/10 rounded-xl">
          <span className="text-[11px] font-bold text-text-secondary tracking-widest uppercase block animate-pulse">
            Establishing data link...
          </span>
          <p className="text-[10px] text-text-secondary/50 uppercase tracking-widest">
            {pendingFile ? 'broadcasting metadata' : 'listening for stream pack'}
          </p>
        </div>
      )}

      {/* Reset Node Connection */}
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
