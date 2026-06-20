import { useState } from 'react';
import { ChevronDown } from 'reicon-react';
import { motion, AnimatePresence } from 'framer-motion';

export function FAQ() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "How does Zapp transfer files without intermediate servers?",
      a: "Zapp establishes a direct Peer-to-Peer (P2P) connection between the sender and recipient browsers using WebRTC. Files are read as chunks in browser memory and streamed directly over an encrypted data channel. No intermediate servers ever receive or store your data."
    },
    {
      q: "How does the 1-to-Many Broadcast work, and is there a performance impact?",
      a: "The first peer to enter a room becomes the host. When additional receivers (up to 10) join using the same code, the host establishes a separate, independent WebRTC connection with each peer. Because connections are isolated, a slow connection on one receiver will not affect the speed of others."
    },
    {
      q: "Can I transfer multiple files or entire folders at once?",
      a: "Yes! Zapp supports bulk uploads. You can select multiple files or drag-and-drop entire folders. Zapp uses the browser's FileSystem API to recursively traverse folder directories, queuing and transferring all items sequentially."
    },
    {
      q: "Is there a limit on the file size I can share?",
      a: "No. Zapp streams files by reading them in dynamic 256 KB slices from disk, avoiding loading the entire file into memory. This allows you to transfer files of virtually any size (even hundreds of gigabytes) without crashing your browser tab."
    },
    {
      q: "How fast are the transfers on Zapp?",
      a: "Zapp is tuned for maximum throughput. By utilizing a 256 KB chunk size combined with a 4 MB backpressure buffer (using the bufferedAmountLowThreshold API), we keep the browser's network queue saturated without overflow. This achieves transfer speeds up to 16 times faster than standard WebRTC implementations."
    },
    {
      q: "What happens if my connection drops during a transfer?",
      a: "Zapp has built-in resilience. If a connection experiences transient network issues, the browser will automatically attempt an ICE (Interactive Connectivity Establishment) restart up to 3 times to restore the direct peer tunnel without losing transfer progress."
    }
  ];

  return (
    <section id="faq-section" className="w-full max-w-[1200px] mx-auto px-6 md:px-10 py-16 border-t border-white/[0.03]">
      <div className="text-center max-w-xl mx-auto mb-16">
        <span className="text-[10px] font-mono text-text-secondary/60 tracking-widest uppercase">
          HAVE QUESTIONS?
        </span>
        <h2 className="font-serif text-2xl md:text-3xl font-medium text-text-primary tracking-tight mt-3">
          Frequently Asked Questions
        </h2>
      </div>

      <div className="max-w-2xl mx-auto space-y-4">
        {faqs.map((faq, index) => {
          const isOpen = openFaq === index;
          return (
            <div 
              key={index} 
              className="bg-element-background/10 element-border rounded-xl overflow-hidden transition-all duration-300"
            >
              <button
                onClick={() => setOpenFaq(isOpen ? null : index)}
                className="w-full flex items-center justify-between p-5 text-left text-sm font-semibold text-text-primary focus:outline-none transition-colors duration-200"
              >
                <span className="font-serif text-base">{faq.q}</span>
                <motion.div
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-text-secondary/60"
                >
                  <ChevronDown className="h-4 w-4" />
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                  >
                    <div className="p-5 pt-0 text-xs md:text-sm text-text-secondary/80 leading-relaxed font-normal">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
