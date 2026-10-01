import { useMemo, useState } from 'react';
import { Copy, Check, Download } from 'reicon-react';

interface CodePreviewBoxProps {
  content: string;
  title?: string;
  fileName?: string;
  maxHeight?: string;
  showStats?: boolean;
}

/**
 * CodePreviewBox — read-only VS Code-style viewer in our dark style.
 * Line-wise gutter, tab bar, breadcrumb + status bar. Formatting fully
 * preserved (whitespace, indentation, blank lines).
 */
export function CodePreviewBox({
  content,
  title = 'preview',
  fileName = 'shared.txt',
  maxHeight = '560px',
  showStats = true,
}: CodePreviewBoxProps) {
  const [copied, setCopied] = useState(false);
  const [hoverLine, setHoverLine] = useState<number | null>(null);

  const lines = useMemo(() => content.split('\n'), [content]);
  const lineCount = lines.length;
  const charCount = content.length;
  const wordCount = useMemo(() => {
    const t = content.trim();
    return t.length === 0 ? 0 : t.split(/\s+/).length;
  }, [content]);

  const copyAll = () => {
    if (!content) return;
    navigator.clipboard.writeText(content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTxt = () => {
    if (!content) return;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = `text-${stamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  if (!content) {
    return (
      <div className="bg-[#0b0b0e] border border-white/10 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.03] border-b border-white/[0.07]">
          <span className="text-[11px] font-mono text-text-secondary/50">{fileName}</span>
          <span className="text-[10px] font-semibold text-text-secondary/30 uppercase tracking-[0.18em]">
            {title}
          </span>
        </div>
        <p className="px-4 py-10 text-center text-[11px] text-text-secondary/40 font-mono">
          Nothing to preview yet — start typing above.
        </p>
        <div className="px-4 py-1.5 border-t border-white/[0.07] bg-white/[0.02] text-[10px] font-mono text-text-secondary/40">
          Ln 0, Col 0 · UTF-8 · Plain Text
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0b0b0e] border border-white/10 rounded-xl overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center justify-between bg-white/[0.03] border-b border-white/[0.07]">
        <div className="flex items-end min-w-0">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-[#0b0b0e] border-r border-white/[0.07] border-t-2 border-t-emerald-400/70 -mb-px">
            <span className="w-2 h-2 rounded-[2px] bg-emerald-400/70 shrink-0" aria-hidden="true" />
            <span className="text-[11px] font-mono text-text-primary/90 truncate max-w-[180px]">
              {fileName}
            </span>
          </div>
          <span className="hidden sm:block text-[10px] font-semibold text-text-secondary/40 uppercase tracking-[0.18em] px-4 pb-2.5 truncate">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-3 shrink-0">
          {showStats && (
            <span className="hidden md:inline text-[10px] font-mono text-text-secondary/40 mr-1">
              {lineCount} {lineCount === 1 ? 'line' : 'lines'} · {charCount} chars · {wordCount} words
            </span>
          )}
          <button
            onClick={downloadTxt}
            title="Download as .txt"
            className="p-1.5 rounded-md text-text-secondary hover:text-white hover:bg-white/10 transition-all active:scale-90"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={copyAll}
            title="Copy text (formatted)"
            className={`p-1.5 rounded-md border transition-all active:scale-90 ${
              copied
                ? 'bg-white text-black border-white'
                : 'text-text-secondary hover:text-white hover:bg-white/10 border-transparent'
            }`}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 px-4 py-1.5 border-b border-white/[0.05] bg-white/[0.01] text-[10px] font-mono text-text-secondary/50">
        <span>text-share</span>
        <span className="text-text-secondary/25">›</span>
        <span className="text-text-secondary/80">{fileName}</span>
        {hoverLine !== null && (
          <>
            <span className="text-text-secondary/25">›</span>
            <span className="text-text-primary/70">Ln {hoverLine + 1}</span>
          </>
        )}
      </div>

      {/* Line-wise body */}
      <div className="overflow-auto font-mono text-[12.5px] leading-[1.8]" style={{ maxHeight }}>
        <div className="min-w-full w-max min-h-full">
          {lines.map((line, i) => (
            <div
              key={i}
              onMouseEnter={() => setHoverLine(i)}
              onMouseLeave={() => setHoverLine(null)}
              className={`flex min-w-full transition-colors ${
                hoverLine === i ? 'bg-white/[0.05]' : ''
              }`}
            >
              <span
                className={`shrink-0 select-none text-right pr-3 pl-4 border-r border-white/[0.06] ${
                  hoverLine === i
                    ? 'text-text-primary/70 bg-white/[0.04]'
                    : 'text-text-secondary/30 bg-white/[0.015]'
                }`}
                style={{ minWidth: '3.5rem' }}
              >
                {i + 1}
              </span>
              <pre className="flex-1 px-4 whitespace-pre text-text-primary/90">
                {line.length === 0 ? '\u00a0' : line}
              </pre>
            </div>
          ))}
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-white/[0.07] bg-white/[0.02] text-[10px] font-mono text-text-secondary/60">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Plain Text
          </span>
          <span className="hidden sm:inline">UTF-8</span>
          <span className="hidden sm:inline">Spaces: 2</span>
        </div>
        <div className="flex items-center gap-3">
          <span>
            Ln 1–{lineCount}, Col 1
          </span>
          <span className="hidden sm:inline">{charCount} chars</span>
        </div>
      </div>
    </div>
  );
}
