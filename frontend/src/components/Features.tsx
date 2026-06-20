import { motion } from 'framer-motion';
import { Users, Folder2, Flash2, Lock } from 'reicon-react';

interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: Users,
    title: '1-to-Many Broadcast',
    description: 'Establish isolated RTCPeerConnections with up to 10 receivers simultaneously. A slow network connection on one peer will never impact the transfer speeds of other receivers.',
  },
  {
    icon: Folder2,
    title: 'Bulk & Folder Transfers',
    description: "Send multiple files or entire nested directory structures in one batch. Zapp recursively expands folder structures using the browser's native FileSystem API.",
  },
  {
    icon: Flash2,
    title: 'Maximized WebRTC Speed',
    description: 'Stream data at high speeds using tuned 256 KB chunks paired with a 4 MB backpressure buffer. Flow control prevents buffer overflow while saturating the OS queue.',
  },
  {
    icon: Lock,
    title: 'End-to-End Encryption',
    description: 'Every transfer is fully encrypted in-browser using DTLS and AES-GCM. Signaling servers only negotiate the handshake — your data never passes through intermediate servers.',
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }
  }),
};

export function Features() {
  return (
    <section id="features-section" className="w-full max-w-[1200px] mx-auto px-6 md:px-10 py-20">

      {/* Header */}
      <div className="text-center max-w-xl mx-auto mb-16">
        <span className="text-[10px] font-mono text-text-secondary/50 tracking-widest uppercase">
          CAPABILITIES
        </span>
        <h2 className="font-serif text-2xl md:text-3xl font-medium text-text-primary tracking-tight mt-3">
          Everything you need to share instantly
        </h2>
        <p className="text-sm text-text-secondary/60 font-normal mt-3 leading-relaxed">
          Built on WebRTC — no server uploads, no size limits, no account required.
        </p>
      </div>

      {/* Feature Grid (2x2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
        {features.map((feature, i) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={feature.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              variants={cardVariants}
              className="group bg-element-background/10 element-border rounded-xl p-6 flex flex-col justify-between
                hover:bg-element-background/20 transition-all duration-300 cursor-default"
            >
              {/* Main Content: Icon on left with border and background + Text details on right */}
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-text-secondary/80 group-hover:text-text-primary group-hover:bg-white/[0.08] transition-all duration-300 shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-2 flex-1 min-w-0">
                  <h3 className="font-serif font-medium text-lg text-text-primary leading-snug">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-text-secondary/65 leading-relaxed font-sans">
                    {feature.description}
                  </p>
                </div>
              </div>

              {/* Bottom accent line — animates on hover */}
              <div className="mt-5 h-px w-0 group-hover:w-full bg-white/10 transition-all duration-500 ease-out" />
            </motion.div>
          );
        })}
      </div>

      {/* Bottom stat strip */}
      <div className="mt-16 max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { value: '0%',     label: 'Server storage' },
          { value: '10',     label: 'Max receivers / room' },
          { value: '256 KB', label: 'Chunk size' },
          { value: 'E2EE',   label: 'DTLS encryption' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
            className="group bg-element-background/10 element-border rounded-xl p-5 text-center
              hover:bg-element-background/20 transition-all duration-300 cursor-default overflow-hidden relative"
          >
            <span className="text-xl md:text-2xl font-bold font-mono text-text-primary block transition-colors duration-300 group-hover:text-white">{stat.value}</span>
            <span className="text-[9px] font-mono text-text-secondary/40 uppercase tracking-widest mt-1.5 block">{stat.label}</span>
            {/* Bottom accent line — animates on hover */}
            <div className="mt-4 h-px w-0 group-hover:w-1/2 mx-auto bg-white/10 transition-all duration-500 ease-out" />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
