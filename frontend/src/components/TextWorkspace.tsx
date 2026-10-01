import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Qr, Link, Exit, Send, Refresh2, User } from 'reicon-react';
import { AnimatePresence } from 'framer-motion';
import { CodePreviewBox } from './CodePreviewBox';
import { CodeEditor } from './CodeEditor';
import type { TextMessage } from '../hooks/useWebRTC';

interface TextWorkspaceProps {
  roomId: string;
  pendingText: string;
  isConnected: boolean;
  isHost: boolean;
  peerCount: number;
  shareUrl: string;
  copied: boolean;
  copyToClipboard: () => void;
  showQR: boolean;
  setShowQR: (show: boolean) => void;
  qrCodeUrl: string;
  textMessages: TextMessage[];
  sendText: (content: string) => void;
  handleReset: () => void;
}

/**
 * TextWorkspace — active-room view for the text page.
 * Mirrors ActiveWorkspace (passkey code, share link, QR, peer count)
 * but streams formatted text instead of files.
 */
export function TextWorkspace({
  roomId,
  pendingText,
  isConnected,
  isHost,
  peerCount,
  shareUrl,
  copied,
  copyToClipboard,
  showQR,
  setShowQR,
  qrCodeUrl,
  textMessages,
  sendText,
  handleReset,
}: TextWorkspaceProps) {
  const [codeCopied, setCodeCopied] = useState(false);
  const [draft, setDraft] = useState('');
  const [sentFlash, setSentFlash] = useState(false);

  const copyCode = useCallback(() => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId).catch(() => {});
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }, [roomId]);

  const handleSendDraft = () => {
    if (!draft || draft.length === 0) return;
    sendText(draft);
    setDraft('');
    setSentFlash(true);
    setTimeout(() => setSentFlash(false), 2000);
  };

  const handleResendOriginal = () => {
    if (!pendingText) return;
    sendText(pendingText);
    setSentFlash(true);
    setTimeout(() => setSentFlash(false), 2000);
  };

  const showSharePanel = true;
  const hasMessages = textMessages.length > 0;

  return (
    <motion.div
      key="text-active-view"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Top widgets row — same as file flow */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 6-digit code */}
        <div className="bg-[#2c2c2c]/10 element-border rounded-xl p-5 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-semibold text-text-secondary/60 tracking-wider uppercase block">
              Passkey code
            </span>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-3xl font-bold font-mono tracking-widest text-text-primary block">
                {roomId.substring(0, 3)} {roomId.substring(3)}
              </span>
              <button
                onClick={copyCode}
                title="Copy code"
                className={`p-2 rounded-full border transition-all duration-200 shrink-0 active:scale-95 ${
                  codeCopied
                    ? 'bg-white text-black border-white'
                    : 'bg-[#202020] hover:bg-[#252525] text-text-secondary border-white/10'
                }`}
              >
                {codeCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-[11px] text-text-secondary/70 leading-relaxed font-normal">
              {isHost
                ? 'You are the host — share this code to broadcast text.'
                : 'Share this key code to connect peers directly.'}
            </p>
            {peerCount > 0 && (
              <span className="shrink-0 ml-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <User className="h-2.5 w-2.5" />
                {peerCount} {peerCount === 1 ? 'receiver' : 'receivers'}
              </span>
            )}
          </div>
        </div>

        {/* Share link */}
        {showSharePanel && (
          <div className="bg-[#2c2c2c]/10 element-border rounded-xl p-5 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-text-secondary/60 tracking-wider uppercase block">
                  {isHost && isConnected ? 'Invite more receivers' : 'Direct connection link'}
                </span>
                {isConnected && (
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

      {/* Original outgoing text (sender view) */}
      {pendingText && (
        <div className="bg-[#2c2c2c]/10 element-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono text-text-secondary/50 uppercase tracking-widest">
              Your text — sending formatted
            </span>
            <div className="flex items-center gap-2">
              {sentFlash && (
                <span className="text-[10px] font-mono text-emerald-400 animate-pulse">sent ✓</span>
              )}
              {!isConnected ? (
                <span className="text-[10px] font-mono text-amber-400 animate-pulse">
                  waiting for peer…
                </span>
              ) : (
                <button
                  onClick={handleResendOriginal}
                  className="text-[10px] font-mono text-text-secondary hover:text-white border border-white/10 hover:border-white/25 rounded-full px-3 py-1 bg-white/5 transition-all active:scale-95"
                >
                  Resend
                </button>
              )}
            </div>
          </div>
          <CodePreviewBox content={pendingText} title="outgoing-text" fileName="outgoing.txt" maxHeight="480px" />
        </div>
      )}

      {/* Live conversation / received texts */}
      <div className="bg-[#2c2c2c]/10 element-border rounded-xl p-5">
        <span className="text-[10px] font-mono text-text-secondary/50 uppercase tracking-widest block mb-3">
          {hasMessages ? `Text stream — ${textMessages.length} ${textMessages.length === 1 ? 'message' : 'messages'}` : 'Text stream'}
        </span>

        {!hasMessages ? (
          <div className="py-4 text-center space-y-3">
            <Refresh2 className="h-5 w-5 text-text-secondary/50 animate-spin mx-auto" />
            <h5 className="text-[11px] font-bold text-text-secondary uppercase tracking-widest">
              {isConnected ? 'Connected — texts appear here' : 'Awaiting connection'}
            </h5>
            <p className="text-[11px] text-text-secondary/60 max-w-[300px] mx-auto leading-relaxed">
              {isConnected
                ? 'Send a message below. Every space, indent and blank line is preserved.'
                : 'Texts send automatically once a peer joins via the code or link above.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[640px] overflow-y-auto pr-1">
            {textMessages.map((m) => (
              <div key={m.id}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                      m.sender === 'self'
                        ? 'bg-white/10 text-text-primary border-white/15'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}
                  >
                    {m.sender === 'self' ? 'you' : 'peer'}
                  </span>
                  <span className="text-[10px] font-mono text-text-secondary/40">{m.timestamp}</span>
                </div>
                <CodePreviewBox
                  content={m.content}
                  title={m.sender === 'self' ? 'you' : 'peer-text'}
                  fileName={m.sender === 'self' ? 'you.txt' : 'peer.txt'}
                  maxHeight="480px"
                />
              </div>
            ))}
          </div>
        )}

        {/* Send more */}
        <div className="mt-4 pt-4 border-t border-white/[0.04] space-y-3">
          <CodeEditor
            value={draft}
            onChange={setDraft}
            title="new-message"
            fileName="message.txt"
            placeholder="Type formatted text here — spaces & line breaks preserved…"
            minHeight="200px"
            maxHeight="420px"
          />
          {draft && (
            <CodePreviewBox content={draft} title="draft-preview" fileName="draft.txt" maxHeight="320px" />
          )}
          <button
            onClick={handleSendDraft}
            disabled={!draft || !isConnected}
            title={!isConnected ? 'Waiting for peer connection' : 'Send text'}
            className="button-primary w-full py-2.5 px-6 rounded-full text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-40 transition-all active:scale-95"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{isConnected ? 'Send text' : 'Waiting for peer…'}</span>
          </button>
        </div>
      </div>

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
