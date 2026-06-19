import React from 'react';
import { ArrowRight } from 'reicon-react';

interface JoinFormProps {
  inputCode: string;
  setInputCode: (code: string) => void;
  handleJoinCode: (e: React.FormEvent) => void;
}

export function JoinForm({ inputCode, setInputCode, handleJoinCode }: JoinFormProps) {
  return (
    <div className="max-w-md mx-auto space-y-4 text-center">
      <h3 className="text-xs font-semibold text-text-secondary tracking-wider uppercase font-sans">
        Receive File Stream
      </h3>
      <form onSubmit={handleJoinCode} className="flex flex-col sm:flex-row gap-2.5 w-full max-w-sm mx-auto">
        <input
          id="join-code-input"
          type="text"
          maxLength={6}
          pattern="[0-9]*"
          inputMode="numeric"
          placeholder="enter 6-digit key"
          value={inputCode}
          onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ''))}
          className="bg-black/30 border border-white/10 rounded-full w-full sm:flex-grow h-12 sm:h-11 px-5 text-base sm:text-sm text-center font-mono text-white placeholder-text-secondary/40 outline-none focus:border-white/30 focus:bg-black/50 transition-colors"
        />
        <button
          type="submit"
          disabled={inputCode.length !== 6}
          className="button-primary h-12 sm:h-11 px-6 text-sm font-semibold whitespace-nowrap inline-flex items-center justify-center gap-1.5 transition-all duration-200 w-full sm:w-auto"
        >
          <span>Join</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
