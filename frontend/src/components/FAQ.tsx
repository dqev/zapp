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
      q: "Is there a limit on the file size I can share?",
      a: "No. Since your files are read dynamically as streams in chunks instead of being uploaded whole, Zapp bypasses all traditional server-side storage limits. You can send gigabytes or terabytes directly, as long as both browser tabs remain open."
    },
    {
      q: "Are my transfers secure and encrypted?",
      a: "Yes. All WebRTC data channels are encrypted end-to-end by default using DTLS (Datagram Transport Layer Security) and SRTP. Even if someone intercepts the network, they cannot read the streamed file chunks."
    },
    {
      q: "Do I or my recipient need to register or install software?",
      a: "Never. Zapp is designed to be completely zero-friction. It runs entirely inside standard modern web browsers (Chrome, Safari, Firefox, Edge) without requiring accounts, sign-ups, or plugins."
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
                    <div className="p-5 pt-0 text-xs md:text-sm text-text-secondary/80 leading-relaxed border-t border-white/[0.02] font-normal">
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
