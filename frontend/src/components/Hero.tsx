import { motion } from 'framer-motion';
import { ArrowRight, Document12 } from 'reicon-react';

interface HeroProps {
  scrollToWorkspace: () => void;
}

export function Hero({ scrollToWorkspace }: HeroProps) {
  return (
    <section className="relative w-full max-w-[960px] mx-auto px-6 md:px-10 pt-24 md:pt-32 pb-16 flex flex-col items-center">
      <motion.h1 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="font-serif font-medium tracking-tight text-3xl sm:text-4xl md:text-[54px] text-text-primary text-center leading-[1.1] max-w-3xl"
      >
        The fastest way to stream files, <br />
        without intermediate servers
      </motion.h1>

      <motion.p 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="text-sm md:text-[20px] text-text-secondary/70 font-normal leading-relaxed mt-6 max-w-xl text-center"
      >
        Stream large files, images, or archives directly in memory. Zapp automatically establishes a secure tunnel and streams everything end-to-end.
      </motion.p>

      {/* Hero CTAs */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex flex-row items-center gap-3.5 mt-10 z-10"
      >
        <button 
          onClick={scrollToWorkspace}
          className="button-primary py-3 px-8 text-sm font-semibold whitespace-nowrap inline-flex items-center gap-2.5 transition-all duration-200 cursor-pointer shadow-lg relative z-10"
        >
          <span>Start Sharing</span>
          <ArrowRight className="h-4 w-4" />
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
