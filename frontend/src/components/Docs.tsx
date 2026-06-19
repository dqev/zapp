import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, Cpu, Shield, 
  HelpCircle, InfoCircle 
} from 'reicon-react';

export function Docs() {
  const [activeSection, setActiveSection] = useState('introduction');

  const sections = [
    { id: 'introduction', label: 'Overview', icon: BookOpen },
    { id: 'protocol', label: 'WebRTC Protocol', icon: Cpu },
    { id: 'memory-chunking', label: 'Memory Chunking', icon: InfoCircle },
    { id: 'security', label: 'Security & Privacy', icon: Shield },
    { id: 'faq', label: 'FAQ & Limits', icon: HelpCircle },
  ];

  const handleScrollTo = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const offset = 100; // Account for fixed header
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  // Set active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      let currentSection = activeSection;
      
      for (const section of sections) {
        const el = document.getElementById(section.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          // Check if the section top has crossed the viewport threshold (150px from top)
          if (rect.top <= 150 && rect.bottom > 150) {
            currentSection = section.id;
            break;
          }
        }
      }
      setActiveSection(currentSection);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeSection]);


  return (
    <div className="w-full max-w-[1200px] mx-auto px-6 md:px-10 flex flex-col md:flex-row gap-12 relative pt-8">
      {/* Left Sidebar navigation */}
      <aside className="w-full md:w-52 shrink-0 md:sticky md:top-28 h-fit space-y-8 select-none">

        <div className="space-y-4">
          <nav className="flex flex-row md:flex-col flex-wrap gap-x-6 gap-y-3">
            {sections.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => handleScrollTo(sec.id)}
                  className={`flex items-center gap-2.5 py-1 text-xs font-medium transition-all duration-200 relative ${
                    isActive
                      ? 'text-text-primary font-semibold'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="sidebar-active-indicator"
                      className="absolute -left-3.5 top-[7px] w-[1.5px] h-3 bg-white hidden md:block"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-text-primary' : 'text-text-secondary/70'}`} />
                  <span>{sec.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-grow max-w-3xl space-y-16 pb-12">
        
        {/* Overview Section */}
        <section id="introduction" className="space-y-4 scroll-mt-28">
          <span className="text-[10px] font-mono text-text-secondary/50 uppercase tracking-widest font-semibold block">
            01 / INTRODUCTION
          </span>
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-text-primary tracking-tight">
            Direct Peer-to-Peer Streaming
          </h1>
          <p className="text-sm text-text-secondary/80 leading-relaxed font-normal">
            Zapp is a zero-friction, end-to-end encrypted peer-to-peer file sharing application. Unlike conventional file sharing platforms that upload your files to a cloud server, Zapp creates a direct communication bridge between the sender's and recipient's web browsers.
          </p>
          <p className="text-sm text-text-secondary/80 leading-relaxed font-normal">
            By leveraging standard web technologies (WebRTC), your data is securely streamed in real time. It never touches third-party databases, preventing files from being cached, stored, or indexed.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <div className="border border-white/[0.06] bg-white/[0.01] p-5 rounded-xl text-center">
              <span className="text-2xl font-bold font-mono text-text-primary block">0%</span>
              <span className="text-[9px] text-text-secondary/50 uppercase tracking-wider font-semibold">Server Storage</span>
            </div>
            <div className="border border-white/[0.06] bg-white/[0.01] p-5 rounded-xl text-center">
              <span className="text-2xl font-bold font-mono text-text-primary block">AES-GCM</span>
              <span className="text-[9px] text-text-secondary/50 uppercase tracking-wider font-semibold">End-to-End Encrypted</span>
            </div>
            <div className="border border-white/[0.06] bg-white/[0.01] p-5 rounded-xl text-center">
              <span className="text-2xl font-bold font-mono text-text-primary block">Unlimited</span>
              <span className="text-[9px] text-text-secondary/50 uppercase tracking-wider font-semibold">File Payload Size</span>
            </div>
          </div>
        </section>

        {/* WebRTC Protocol Section */}
        <section id="protocol" className="space-y-4 scroll-mt-28 pt-10 border-t border-white/[0.05]">
          <span className="text-[10px] font-mono text-text-secondary/50 uppercase tracking-widest font-semibold block">
            02 / PROTOCOL ARCHITECTURE
          </span>
          <h2 className="font-serif text-2xl md:text-3xl font-medium text-text-primary tracking-tight">
            WebRTC SCTP Channels
          </h2>
          <p className="text-sm text-text-secondary/80 leading-relaxed font-normal">
            The underlying connection utilizes **WebRTC (Web Real-Time Communication)**. The handshake/connection negotiation works in three discrete stages:
          </p>
          <ul className="list-decimal pl-5 text-sm text-text-secondary/80 space-y-3 font-normal leading-relaxed">
            <li>
              <strong className="text-text-primary font-semibold">Signaling Handshake:</strong> A lightweight signaling service exchanges connection metadata (Session Description Protocol - SDP) and network options (ICE candidates) using the unique 6-digit key code.
            </li>
            <li>
              <strong className="text-text-primary font-semibold">Direct NAT Traversal:</strong> STUN (Session Traversal Utilities for NAT) servers identify public-facing IP addresses and ports to punch through local firewalls.
            </li>
            <li>
              <strong className="text-text-primary font-semibold">SCTP Data Channel:</strong> Once connected, the browsers establish a secure, direct SCTP data channel, and the signaling server is completely disconnected.
            </li>
          </ul>
        </section>

        {/* Memory Chunking Section */}
        <section id="memory-chunking" className="space-y-4 scroll-mt-28 pt-10 border-t border-white/[0.05]">
          <span className="text-[10px] font-mono text-text-secondary/50 uppercase tracking-widest font-semibold block">
            03 / PERFORMANCE
          </span>
          <h2 className="font-serif text-2xl md:text-3xl font-medium text-text-primary tracking-tight">
            Direct Memory Chunking
          </h2>
          <p className="text-sm text-text-secondary/80 leading-relaxed font-normal">
            To send files of arbitrary sizes (gigabytes or even terabytes) without crashing browser tabs, Zapp utilizes a low-overhead stream chunking architecture:
          </p>
          <p className="text-sm text-text-secondary/80 leading-relaxed font-normal">
            Rather than reading the entire file into the browser's RAM, Zapp slices files into raw binary chunks of **16KB to 64KB** dynamically. The sender reads these slices sequentially from disk using a stream reader and feeds them into the WebRTC data channel buffer.
          </p>
          <div className="border border-white/[0.06] bg-white/[0.01] rounded-xl p-5 font-mono text-xs text-text-secondary/90 leading-relaxed space-y-2.5">
            <div className="flex justify-between border-b border-white/[0.04] pb-2 text-[10px] text-text-secondary/50 uppercase tracking-wide font-semibold">
              <span>Data Flow Step</span>
              <span>Buffer State</span>
            </div>
            <div className="flex justify-between">
              <span>1. Disk slice read</span>
              <span className="text-emerald-400">Low RAM profile (~16KB)</span>
            </div>
            <div className="flex justify-between">
              <span>2. SCTP socket buffer push</span>
              <span className="text-amber-400">Backpressure monitoring</span>
            </div>
            <div className="flex justify-between">
              <span>3. Direct peer download</span>
              <span className="text-emerald-400">Real-time disk write / buffer assemble</span>
            </div>
          </div>
          <p className="text-sm text-text-secondary/80 leading-relaxed font-normal">
            On the receiving end, incoming binary packets are immediately assembled into a local stream and saved, preserving system memory.
          </p>
        </section>

        {/* Security & Privacy Section */}
        <section id="security" className="space-y-4 scroll-mt-28 pt-10 border-t border-white/[0.05]">
          <span className="text-[10px] font-mono text-text-secondary/50 uppercase tracking-widest font-semibold block">
            04 / PRIVACY STANDARD
          </span>
          <h2 className="font-serif text-2xl md:text-3xl font-medium text-text-primary tracking-tight">
            Security & Cryptography
          </h2>
          <p className="text-sm text-text-secondary/80 leading-relaxed font-normal">
            WebRTC SCTP channels enforce **DTLS (Datagram Transport Layer Security)** encryption by default. This provides standard bank-grade cryptographic security:
          </p>
          <ul className="list-disc pl-5 text-sm text-text-secondary/80 space-y-3 font-normal leading-relaxed">
            <li>
              <strong className="text-text-primary font-semibold">End-to-End Encryption:</strong> Only the sender and receiver hold the keys to decrypt the packet data. Intermediate signaling servers have no visibility into the payload.
            </li>
            <li>
              <strong className="text-text-primary font-semibold">Zero Logging:</strong> No metadata, file names, or contents are stored. Once a workspace connection terminates, all records are permanently deleted from the browsers' sandboxed memory.
            </li>
            <li>
              <strong className="text-text-primary font-semibold">No Cookies or Tracker Scripts:</strong> Zapp respects absolute digital sovereignty. We do not use third-party analytics or profile-tracking systems.
            </li>
          </ul>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="space-y-4 scroll-mt-28 pt-10 border-t border-white/[0.05]">
          <span className="text-[10px] font-mono text-text-secondary/50 uppercase tracking-widest font-semibold block">
            05 / UTILITIES
          </span>
          <h2 className="font-serif text-2xl md:text-3xl font-medium text-text-primary tracking-tight">
            FAQ & Troubleshooting
          </h2>
          <div className="space-y-6">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-text-primary">Why is my connection stuck on "connecting..."?</h4>
              <p className="text-xs text-text-secondary/80 leading-relaxed font-normal">
                This happens when firewalls or strict NAT configurations on either peer block direct peer-to-peer tunnels. In most domestic networks, WebRTC easily bypasses firewalls. However, corporate or university networks may restrict UDP traffic, causing the connection handshake to stall.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-text-primary">Can I close the tab while transferring files?</h4>
              <p className="text-xs text-text-secondary/80 leading-relaxed font-normal">
                No. Because Zapp reads and streams files directly from browser memory in real time, closing the tab, navigating away, or shutting down your machine will instantly drop the connection and terminate the transfer. Keep both tabs open until the progress bar displays 100%.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-text-primary">What formats or file types are supported?</h4>
              <p className="text-xs text-text-secondary/80 leading-relaxed font-normal">
                Every file type is supported, including `.zip` archives, high-definition videos, raw database images, or executables. Zapp treats all payloads as standard binary buffers, so files of any format can be shared transparently.
              </p>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
