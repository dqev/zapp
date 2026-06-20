import { File, ArrowUpRight2, ArrowDownLeft2, X, Check, AlertTriangle, Pause, Play } from 'reicon-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatTime } from '../utils/format';
import type { TransferItem } from '../hooks/useWebRTC';

interface TransferStatsProps {
  queue: TransferItem[];
  cancelTransfer: (id: string) => void;
  pauseTransfer:  (id: string) => void;
  resumeTransfer: (id: string) => void;
  formatBytes: (bytes: number) => string;
}

export function TransferStats({ queue, cancelTransfer, pauseTransfer, resumeTransfer, formatBytes }: TransferStatsProps) {
  if (queue.length === 0) return null;

  const streamingCount = queue.filter(i => i.status === 'transferring' || i.status === 'queued').length;
  const totalSpeed     = queue.filter(i => i.status === 'transferring').reduce((s, i) => s + i.speed, 0);
  const completedCount = queue.filter(i => i.status === 'completed').length;

  // BUG-8 fix: pre-compute queue positions in O(n) instead of O(n²) queue.indexOf
  const queuePosMap = new Map<string, number>();
  let posCounter = 0;
  queue.forEach(item => {
    if (item.status === 'queued' || item.status === 'transferring') {
      posCounter++;
      queuePosMap.set(item.id, posCounter);
    }
  });

  return (
    <div className="w-full relative z-20 select-none font-sans mt-6">
      {/* Header row */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.04] mb-4">
        <span className="text-xs font-semibold text-text-secondary tracking-tight">
          Transfer Queue
        </span>
        <div className="flex items-center gap-2">
          {totalSpeed > 0 && (
            <span className="text-[10px] font-mono text-emerald-400 animate-pulse">
              ↑↓ {formatBytes(totalSpeed)}/s
            </span>
          )}
          {completedCount > 0 && (
            <span className="text-[10px] font-mono text-text-secondary/60 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              {completedCount} done
            </span>
          )}
          <span className="text-[10px] font-mono text-text-secondary/60 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
            {streamingCount} active
          </span>
        </div>
      </div>

      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
        <AnimatePresence initial={false}>
          {queue.map((item) => {
            const isActive  = item.status === 'transferring';
            const isPaused  = item.status === 'paused';
            const isQueued  = item.status === 'queued';
            const isDone    = item.status === 'completed';
            const isFailed  = item.status === 'failed' || item.status === 'cancelled';
            const canControl = isActive || isPaused || isQueued;

            // BUG-8 fix: O(1) lookup from pre-computed map
            const queuePos = isQueued ? queuePosMap.get(item.id) ?? null : null;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.25 }}
                className={`bg-element-background/20 element-border rounded-xl p-4 flex flex-col gap-3 relative shadow-md shadow-black/20 ${
                  isPaused ? 'opacity-70' : ''
                }`}
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
                        {formatBytes(item.size)} · {item.type.split('/')[1] || 'binary'}
                        {queuePos !== null && (
                          <span className="ml-2 text-amber-400">#{queuePos} in queue</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5">
                    {/* Direction Badge */}
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[9px] font-mono text-text-secondary bg-white/5 border border-white/10 rounded-full">
                      {item.direction === 'send' ? (
                        <><ArrowUpRight2 className="h-2.5 w-2.5" /><span>sending</span></>
                      ) : (
                        <><ArrowDownLeft2 className="h-2.5 w-2.5" /><span>receiving</span></>
                      )}
                    </span>

                    {/* Status Icons */}
                    {isDone   && <Check         className="h-3.5 w-3.5 text-emerald-400" />}
                    {isFailed && <AlertTriangle className="h-3.5 w-3.5 text-red-400" />}

                    {/* Pause / Resume — only for sender-side active/paused/queued items */}
                    {canControl && item.direction === 'send' && (
                      isPaused ? (
                        <button
                          onClick={() => resumeTransfer(item.id)}
                          className="p-1 hover:bg-white/10 rounded-full text-amber-400 hover:text-amber-300 transition-all shrink-0 active:scale-90"
                          title="Resume"
                        >
                          <Play className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => pauseTransfer(item.id)}
                          className="p-1 hover:bg-white/10 rounded-full text-text-secondary hover:text-white transition-all shrink-0 active:scale-90"
                          title="Pause"
                        >
                          <Pause className="h-3.5 w-3.5" />
                        </button>
                      )
                    )}

                    {/* Cancel Button */}
                    {canControl && (
                      <button
                        onClick={() => cancelTransfer(item.id)}
                        className="p-1 hover:bg-white/10 rounded-full text-text-secondary hover:text-red-400 transition-all shrink-0 active:scale-90 ml-0.5"
                        title="Cancel"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress bar + stats */}
                <div className="w-full">
                  <div className="flex items-center justify-between text-[9px] text-text-secondary/70 font-mono mb-1.5">
                    <span>
                      {isActive && item.speed > 0
                        ? `${formatBytes(item.speed)}/s`
                        : isPaused
                        ? 'paused'
                        : isQueued
                        ? 'queued'
                        : item.status
                      }
                    </span>
                    <span>
                      {isActive && item.eta > 0
                        ? `ETA ${formatTime(item.eta)}`
                        : `${item.progress}%`
                      }
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/[0.04]">
                    <motion.div
                      className={`h-full rounded-full ${
                        isFailed  ? 'bg-red-500'     :
                        isDone    ? 'bg-emerald-400' :
                        isPaused  ? 'bg-amber-400'   :
                        'bg-white'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${item.progress}%` }}
                      transition={{ duration: 0.15, ease: 'linear' }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
