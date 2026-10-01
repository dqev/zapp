import React from 'react';
import { ArrowRight } from 'reicon-react';

interface JoinFormProps {
  inputCode: string;
  setInputCode: (code: string) => void;
  handleJoinCode: (e: React.FormEvent) => void;
  title?: string;
}

export function JoinForm({ inputCode, setInputCode, handleJoinCode, title = 'Receive File Stream' }: JoinFormProps) {
  return (
    <div className="max-w-md mx-auto space-y-4 text-center">
      <h3 className="text-xs font-semibold text-text-secondary tracking-wider uppercase font-sans">
        {title}
      </h3>
      <form onSubmit={handleJoinCode} className="flex flex-col sm:flex-row gap-2.5 w-full max-w-sm mx-auto">
        <input
          id="join-code-input"
          type="text"
          maxLength={48}
          inputMode="text"
          placeholder="enter 6-digit key"
          value={inputCode}
          onChange={(e) => {
            let val = e.target.value.trim();
            // Allow pasting a full share link — keep the trailing -t for text rooms
            if (val.includes('#')) {
              val = (val.split('#').pop() || val).trim();
            }
            const textSuffix = /-t$/i.test(val) ? '-t' : '';
            const digits = val.replace(/-t$/i, '').replace(/\D/g, '').slice(0, 6);
            setInputCode(digits + textSuffix);
          }}
          className="bg-black/30 border border-white/10 rounded-full w-full sm:flex-grow h-12 sm:h-11 px-5 text-base sm:text-sm text-center font-mono text-white placeholder-text-secondary/40 outline-none focus:border-white/30 focus:bg-black/50 transition-colors"
        />
        <button
          type="submit"
          disabled={inputCode.replace(/-t$/i, '').length !== 6}
          className="button-primary group h-12 sm:h-11 px-6 text-sm font-semibold whitespace-nowrap inline-flex items-center justify-center gap-1.5 transition-all duration-200 w-full sm:w-auto hover:-translate-y-0.5 disabled:hover:translate-y-0"
        >
          <span>Join</span>
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1 group-disabled:translate-x-0" />
        </button>
      </form>
    </div>
  );
}
