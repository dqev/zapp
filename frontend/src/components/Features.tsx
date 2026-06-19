import { Radio, Flash2, Shield } from 'reicon-react';

export function Features() {
  return (
    <section id="features-section" className="w-full max-w-[1200px] mx-auto px-6 md:px-10 py-16">
      <div className="text-center max-w-xl mx-auto mb-16">
        <span className="text-[10px] font-mono text-text-secondary/60 tracking-widest uppercase">
          TECHNICAL PROTOCOL DETAILS
        </span>
        <h2 className="font-serif text-2xl md:text-3xl font-medium text-text-primary tracking-tight mt-3">
          Direct Memory Chunking
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {/* Feature 1 */}
        <div className="bg-element-background/10 element-border rounded-xl p-6 flex flex-col justify-between h-56 hover:bg-element-background/15 transition-all duration-300">
          <div className="flex items-center justify-between text-text-secondary/50 text-[10px] font-mono">
            <span>01 / PROTOCOL</span>
            <Radio className="h-4 w-4" />
          </div>
          <div className="space-y-2 mt-6">
            <h3 className="font-serif font-medium text-lg text-text-primary">
              End-to-End Tunnel
            </h3>
            <p className="text-xs text-text-secondary/70 leading-relaxed font-sans">
              Files are negotiated directly browser-to-browser via WebRTC SCTP data channels, utilizing secure signaling.
            </p>
          </div>
        </div>

        {/* Feature 2 */}
        <div className="bg-element-background/10 element-border rounded-xl p-6 flex flex-col justify-between h-56 hover:bg-element-background/15 transition-all duration-300">
          <div className="flex items-center justify-between text-text-secondary/50 text-[10px] font-mono">
            <span>02 / SIZE_LIMIT</span>
            <Flash2 className="h-4 w-4" />
          </div>
          <div className="space-y-2 mt-6">
            <h3 className="font-serif font-medium text-lg text-text-primary">
              Infinite Payloads
            </h3>
            <p className="text-xs text-text-secondary/70 leading-relaxed font-sans">
              Zapp streams file chunks sequentially straight out of local disk storage, entirely bypassing file size limits.
            </p>
          </div>
        </div>

        {/* Feature 3 */}
        <div className="bg-element-background/10 element-border rounded-xl p-6 flex flex-col justify-between h-56 hover:bg-element-background/15 transition-all duration-300">
          <div className="flex items-center justify-between text-text-secondary/50 text-[10px] font-mono">
            <span>03 / SECURITY</span>
            <Shield className="h-4 w-4" />
          </div>
          <div className="space-y-2 mt-6">
            <h3 className="font-serif font-medium text-lg text-text-primary">
              Absolute Privacy
            </h3>
            <p className="text-xs text-text-secondary/70 leading-relaxed font-sans">
              No tracking scripts, cloud servers, database saves, or account mandates. Data is transferred without logging.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
