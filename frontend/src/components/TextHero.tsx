import { motion } from 'framer-motion';
import { ArrowRight, Document12 } from 'reicon-react';
import { navigate } from '../utils/navigate';

interface TextHeroProps {
  scrollToWorkspace: () => void;
}

export function TextHero({ scrollToWorkspace }: TextHeroProps) {
  return (
    <section className="relative w-full max-w-[960px] mx-auto px-6 md:px-10 pt-24 md:pt-32 pb-16 flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-text-secondary uppercase tracking-[0.18em] mb-6"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        text sharing · formatted · P2P encrypted
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="font-serif font-medium tracking-tight text-3xl sm:text-4xl md:text-[54px] text-text-primary text-center leading-[1.35] max-w-3xl"
      >
        Send text <span className="italic">directly</span> from <span className="italic">browser to browser</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="text-sm md:text-[16px] text-text-secondary/70 font-normal leading-relaxed mt-6 max-w-2xl text-center"
      >
        Paste formatted text, code, or notes into a VS Code-style editor and share it
        peer-to-peer. Spacing, indentation, and blank lines arrive exactly as written —
        no accounts, no server storage.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex flex-col sm:flex-row items-center gap-3 sm:gap-3.5 mt-10 z-10"
      >
        <button
          onClick={scrollToWorkspace}
          className="button-primary py-3 px-8 text-sm font-semibold whitespace-nowrap inline-flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer shadow-lg relative z-10"
        >
          <span>Start Typing</span>
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          onClick={() => navigate('/')}
          className="button-secondary rounded-full py-3 px-8 text-sm font-semibold whitespace-nowrap inline-flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer relative z-10"
        >
          <span>Send Files instead</span>
        </button>
        <button
          onClick={() => {
            window.location.hash = 'docs';
          }}
          className="button-secondary rounded-full py-3 px-8 text-sm font-semibold whitespace-nowrap inline-flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer relative z-10"
        >
          <span>Docs</span>
          <Document12 size={16} />
        </button>
      </motion.div>
    </section>
  );
}
