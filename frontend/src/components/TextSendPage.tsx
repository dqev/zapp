import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'reicon-react';
import { CodeEditor } from './CodeEditor';
import { CodePreviewBox } from './CodePreviewBox';

interface TextSendPageProps {
  initialText?: string;
  onCreateRoom: (text: string) => void;
}

/**
 * TextSendPage — /text composer. VS Code-style editable editor on top,
 * tall read-only line-wise preview below. Content stored verbatim.
 */
export function TextSendPage({ initialText = '', onCreateRoom }: TextSendPageProps) {
  const [text, setText] = useState(initialText);

  const stats = useMemo(() => {
    const chars = text.length;
    const lines = text.length === 0 ? 0 : text.split('\n').length;
    const t = text.trim();
    const words = t.length === 0 ? 0 : t.split(/\s+/).length;
    return { chars, lines, words };
  }, [text]);

  const canCreate = text.length > 0;

  const handleCreate = () => {
    if (!canCreate) return;
    onCreateRoom(text);
  };

  return (
    <motion.div
      key="text-send-page"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-5"
    >
      {/* Editable VS-style composer */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-text-secondary/60 tracking-widest uppercase">
            1 · Compose — formatting preserved
          </span>
          {text.length > 0 && (
            <button
              onClick={() => setText('')}
              className="text-[10px] font-mono text-text-secondary/60 hover:text-text-primary border border-white/10 hover:border-white/25 bg-white/5 rounded-full px-3 py-1 transition-all active:scale-95"
            >
              Clear
            </button>
          )}
        </div>

        <CodeEditor
          value={text}
          onChange={setText}
          title="composer"
          fileName="untitled-1.txt"
          placeholder={'Type or paste formatted text here…\n\n  • indentation,\n  • blank lines,\n  • code — all preserved exactly.'}
          minHeight="380px"
          maxHeight="600px"
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-[10px] font-mono text-text-secondary/50">
            {stats.lines} {stats.lines === 1 ? 'line' : 'lines'} · {stats.words} words · {stats.chars} chars
          </p>
          <button
            onClick={handleCreate}
            disabled={!canCreate}
            className="button-primary group px-6 py-2.5 text-xs font-semibold rounded-full inline-flex items-center justify-center gap-1.5 disabled:opacity-40 transition-all active:scale-95"
          >
            <span>Create share link</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>

      {/* Tall live preview */}
      <div className="space-y-3">
        <span className="text-[10px] font-semibold text-text-secondary/60 tracking-widest uppercase block">
          2 · Live preview — line-wise
        </span>
        <CodePreviewBox
          content={text}
          title="live-preview"
          fileName="preview.txt"
          maxHeight="560px"
        />
      </div>

      <p className="text-[10px] text-text-secondary/40 font-mono text-center leading-relaxed">
        A 6-digit code + link + QR is created. Text sends automatically
        <br className="hidden sm:block" /> when the receiver opens your /text link — fully formatted.
      </p>
    </motion.div>
  );
}
