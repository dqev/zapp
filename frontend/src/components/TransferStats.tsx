import { File, ArrowUpRight2, ArrowDownLeft2, X, Check, AlertTriangle } from 'reicon-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatBytes, formatTime } from '../utils/format';
import type { TransferItem } from '../hooks/useWebRTC';

interface TransferStatsProps {
  queue: TransferItem[];
  cancelTransfer: (id: string) => void;
}

export function TransferStats({ queue, cancelTransfer }: TransferStatsProps) {
  if (queue.length === 0) return null;

  return (
    <div className="w-full relative z-20 select-none font-sans mt-6">
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.04] mb-4">
        <span className="text-xs font-semibold text-text-secondary tracking-tight">
          Active Transfers
        </span>
        <span className="text-[10px] font-mono text-text-secondary/60 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
          {queue.filter(i => i.status === 'transferring' || i.status === 'queued').length} streaming
        </span>
      </div>

      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {queue.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="bg-element-background/20 element-border rounded-xl p-4 flex flex-col gap-3 relative shadow-lg shadow-black/20"
            >
              {/* Header Info */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {item.previewUrl ? (
                    <div className="h-9 w-9 rounded-lg overflow-hidden shrink-0 border border-white/10 flex items-center justify-center bg-black/40 shadow-inner">
                      <img src={item.previewUrl} alt="File Preview" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="p-2 bg-element-background/60 border border-white/10 rounded-full text-text-secondary shrink-0">
                      <File className="h-4 w-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-text-primary truncate">
                      {item.name}
                    </h4>
                    <p className="text-[10px] text-text-secondary/60 font-mono mt-0.5">
                      {formatBytes(item.size)} • {item.type.split('/')[1] || 'binary'}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {/* Direction Badge */}
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[9px] font-mono text-text-secondary bg-white/5 border border-white/10 rounded-full">
                    {item.direction === 'send' ? (
                      <>
                        <ArrowUpRight2 className="h-2.5 w-2.5" />
                        <span>sending</span>
                      </>
                    ) : (
                      <>
                        <ArrowDownLeft2 className="h-2.5 w-2.5" />
                        <span>receiving</span>
                      </>
                    )}
                  </span>

                  {/* Status Icons */}
                  {item.status === 'completed' && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                  {item.status === 'failed' && <AlertTriangle className="h-3.5 w-3.5 text-red-400" />}

                  {/* Cancel Button */}
                  {(item.status === 'transferring' || item.status === 'queued') && (
                    <button
                      onClick={() => cancelTransfer(item.id)}
                      className="p-1 hover:bg-white/10 rounded-full text-text-secondary hover:text-white transition-all shrink-0 active:scale-90 ml-0.5"
                      title="Cancel Transfer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Progress and Stats */}
              <div className="w-full">
                <div className="flex items-center justify-between text-[9px] text-text-secondary/70 font-mono mb-1.5">
                  <span>
                    {item.status === 'transferring' && item.speed > 0
                      ? `${formatBytes(item.speed)}/s`
                      : item.status
                    }
                  </span>
                  <span>
                    {item.status === 'transferring' && item.eta > 0
                      ? `ETA: ${formatTime(item.eta)}`
                      : `${item.progress}%`
                    }
                  </span>
                </div>

                <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/[0.04]">
                  <motion.div
                    className={`h-full rounded-full ${
                      item.status === 'failed' ? 'bg-red-500' : 'bg-white'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${item.progress}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
