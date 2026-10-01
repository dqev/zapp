import { useMemo, useRef, useState, useCallback } from 'react';

interface CodeEditorProps {
  value: string;
  onChange: (v: string) => void;
  title?: string;
  fileName?: string;
  placeholder?: string;
  minHeight?: string;
  maxHeight?: string;
}

function getCursorPos(text: string, cursor: number) {
  const before = text.slice(0, cursor);
  const line = before.split('\n').length;
  const col = cursor - (before.lastIndexOf('\n') + 1) + 1;
  return { line, col };
}

/**
 * CodeEditor — editable VS Code-style inline editor in our dark style.
 * Gutter with line numbers + mono textarea, synced scroll, active-line
 * highlight, tab bar + status bar (Ln/Col, spaces, UTF-8).
 */
export function CodeEditor({
  value,
  onChange,
  title = 'editor',
  fileName = 'untitled-1.txt',
  placeholder,
  minHeight = '340px',
  maxHeight = '560px',
}: CodeEditorProps) {
  const [focused, setFocused] = useState(false);
  const [cursor, setCursor] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const lines = useMemo(() => value.split('\n'), [value]);
  const lineCount = value.length === 0 ? 1 : lines.length;
  const numbers = useMemo(() => Array.from({ length: lineCount }, (_, i) => i + 1), [lineCount]);
  const { line: curLine, col: curCol } = useMemo(() => getCursorPos(value, cursor), [value, cursor]);

  const syncCursor = useCallback(() => {
    const el = taRef.current;
    if (el) setCursor(el.selectionStart ?? el.value.length);
  }, []);

  const handleScroll = () => {
    if (gutterRef.current && scrollRef.current) {
      gutterRef.current.scrollTop = scrollRef.current.scrollTop;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = taRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = value.slice(0, start) + '  ' + value.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2;
        setCursor(start + 2);
      });
    }
  };

  return (
    <div
      className={`bg-[#0b0b0e] border rounded-xl overflow-hidden transition-colors ${
        focused ? 'border-white/25' : 'border-white/10'
      }`}
    >
      {/* Tab bar */}
      <div className="flex items-center justify-between bg-white/[0.03] border-b border-white/[0.07]">
        <div className="flex items-end min-w-0">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-[#0b0b0e] border-r border-white/[0.07] border-t-2 border-t-white/70 -mb-px">
            <span className="w-2 h-2 rounded-[2px] bg-amber-400/70 shrink-0" aria-hidden="true" />
            <span className="text-[11px] font-mono text-text-primary/90 truncate max-w-[180px]">
              {fileName}
            </span>
            <span className="text-[10px] font-mono text-text-secondary/40">●</span>
          </div>
          <span className="hidden sm:block text-[10px] font-semibold text-text-secondary/40 uppercase tracking-[0.18em] px-4 pb-2.5">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-3 px-4 shrink-0">
          <span className="hidden md:inline text-[10px] font-mono text-text-secondary/40">
            {value.length === 0 ? 0 : value.split('\n').length} lines · {value.length} chars
          </span>
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
            <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
          </span>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 px-4 py-1.5 border-b border-white/[0.05] bg-white/[0.01] text-[10px] font-mono text-text-secondary/50">
        <span className="hover:text-text-primary cursor-default transition-colors">text-share</span>
        <span className="text-text-secondary/25">›</span>
        <span className="text-text-secondary/80">{fileName}</span>
        <span className="text-text-secondary/25">›</span>
        <span className="text-text-secondary/50">Ln {curLine}, Col {curCol}</span>
      </div>

      {/* Editor body — gutter + textarea share one scroll container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="overflow-auto"
        style={{ minHeight, maxHeight }}
      >
        <div className="flex min-h-full">
          {/* Gutter */}
          <div
            ref={gutterRef}
            className="shrink-0 select-none overflow-hidden bg-white/[0.015] border-r border-white/[0.06] text-right font-mono text-[12px] leading-[1.8] text-text-secondary/30"
            style={{ minWidth: '3.5rem' }}
            aria-hidden="true"
          >
            {numbers.map((n) => (
              <div
                key={n}
                className={`pr-3 pl-2 ${n === curLine && focused ? 'bg-white/[0.05] text-text-primary/80' : ''}`}
              >
                {n}
              </div>
            ))}
          </div>
          {/* Editable area */}
          <textarea
            ref={taRef}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setCursor(e.target.selectionStart);
            }}
            onSelect={syncCursor}
            onKeyUp={syncCursor}
            onClick={syncCursor}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setFocused(true);
              syncCursor();
            }}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            spellCheck={false}
            wrap="off"
            className="code-editor-textarea flex-1 bg-transparent px-4 font-mono text-[12.5px] leading-[1.8] text-text-primary/90 placeholder-text-secondary/30 outline-none resize-none whitespace-pre overflow-visible"
            style={{ minHeight, tabSize: 2 }}
            rows={Math.max(14, lineCount + 2)}
          />
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-white/[0.07] bg-white/[0.02] text-[10px] font-mono text-text-secondary/60">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Plain Text
          </span>
          <span className="hidden sm:inline">Spaces: 2</span>
          <span className="hidden sm:inline">UTF-8</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Ln {curLine}, Col {curCol}</span>
          <span className="hidden sm:inline">{value.length} chars</span>
        </div>
      </div>
    </div>
  );
}
