import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, Cpu, Shield,
  HelpCircle, InfoCircle, Users
} from 'reicon-react';

export function Docs() {
  const [activeSection, setActiveSection] = useState('introduction');

  const sections = [
    { id: 'introduction', label: 'Overview', icon: BookOpen },
    { id: 'broadcast', label: '1-to-Many Broadcast', icon: Users },
    { id: 'protocol', label: 'WebRTC Protocol', icon: Cpu },
    { id: 'performance', label: 'Performance', icon: InfoCircle },
    { id: 'security', label: 'Security & Privacy', icon: Shield },
    { id: 'faq', label: 'FAQ & Limits', icon: HelpCircle },
  ];

  const handleScrollTo = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const offset = 100;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const offsetPosition = (elementRect - bodyRect) - offset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      let current = activeSection;
      for (const section of sections) {
        const el = document.getElementById(section.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 150 && rect.bottom > 150) { current = section.id; break; }
        }
      }
      setActiveSection(current);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeSection]);

  return (
    <div className="w-full max-w-[1200px] mx-auto px-6 md:px-10 flex flex-col md:flex-row gap-12 relative pt-8">

      {/* Sidebar */}
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
                  className={`flex items-center gap-2.5 py-1 text-xs font-medium transition-all duration-200 relative ${isActive ? 'text-text-primary font-semibold' : 'text-text-secondary hover:text-text-primary'
                    }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-indicator"
                      className="absolute -left-3.5 top-[7px] w-[1.5px] h-3 bg-white hidden md:block"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
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

      {/* Main */}
      <main className="flex-grow max-w-3xl space-y-16 pb-12">

        {/* ── 01 Overview ─────────────────────────────────────────────── */}
        <section id="introduction" className="space-y-4 scroll-mt-28">
          <span className="text-[10px] font-mono text-text-secondary/50 uppercase tracking-widest font-semibold block">
            01 / INTRODUCTION
          </span>
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-text-primary tracking-tight">
            Direct Peer-to-Peer Streaming
          </h1>
          <p className="text-sm text-text-secondary/80 leading-relaxed font-normal">
            Zapp is a zero-friction, end-to-end encrypted peer-to-peer file sharing and broadcasting application. Unlike cloud platforms, Zapp streams data directly between web browsers over WebRTC — files never touch a third-party server.
          </p>
          <p className="text-sm text-text-secondary/80 leading-relaxed font-normal">
            With the new <strong className="text-text-primary font-semibold">1-to-many broadcast mode</strong>, a single host can share files with up to 10 receivers simultaneously, each receiving their own independent data stream.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
            {[
              { value: '0%', label: 'Server Storage' },
              { value: 'E2EE', label: 'Encrypted' },
              { value: '10', label: 'Max Receivers' },
              { value: '∞', label: 'File Size' },
            ].map(s => (
              <div key={s.label} className="border border-white/[0.06] bg-white/[0.01] p-5 rounded-xl text-center">
                <span className="text-xl font-bold font-mono text-text-primary block">{s.value}</span>
                <span className="text-[9px] text-text-secondary/50 uppercase tracking-wider font-semibold mt-1 block">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── 02 Broadcast ─────────────────────────────────────────────── */}
        <section id="broadcast" className="space-y-4 scroll-mt-28 pt-10 border-t border-white/[0.05]">
          <span className="text-[10px] font-mono text-text-secondary/50 uppercase tracking-widest font-semibold block">
            02 / BROADCAST MODE
          </span>
          <h2 className="font-serif text-2xl md:text-3xl font-medium text-text-primary tracking-tight">
            1-to-Many Broadcasting
          </h2>
          <p className="text-sm text-text-secondary/80 leading-relaxed font-normal">
            Zapp uses a <strong className="text-text-primary font-semibold">Star topology</strong> for multi-peer sessions. The first peer to join a room automatically becomes the <em>host</em>. Every subsequent peer that joins becomes a <em>receiver</em>. The host maintains a dedicated RTCPeerConnection and DataChannel per receiver.
          </p>

          {/* Topology diagram */}
          <div className="border border-white/[0.06] bg-white/[0.01] rounded-xl p-5 font-mono text-xs text-text-secondary/80 leading-relaxed">
            <div className="text-[10px] text-text-secondary/40 uppercase tracking-wide font-semibold mb-3 pb-2 border-b border-white/[0.04]">
              TOPOLOGY — STAR / HUB MODEL
            </div>
            <pre className="text-[11px] leading-loose text-text-secondary/70 whitespace-pre overflow-x-auto">{`
         ┌──────────────────────────────┐
         │     HOST / BROADCASTER       │  ← first peer to join
         └────┬──────────┬──────────┬───┘
              │          │          │
         [Peer A]    [Peer B]   [Peer C]   ...up to 10
              ↕              ↕          ↕
        independent     independent   independent
        DataChannel     DataChannel   DataChannel
        `}</pre>
          </div>

          <ul className="list-decimal pl-5 text-sm text-text-secondary/80 space-y-3 font-normal leading-relaxed">
            <li>
              <strong className="text-text-primary font-semibold">Host joins first:</strong> Signaling server tracks the first joiner as the host via <code className="text-xs bg-white/5 px-1 py-0.5 rounded">isHost: true</code> in the <code className="text-xs bg-white/5 px-1 py-0.5 rounded">joined</code> message.
            </li>
            <li>
              <strong className="text-text-primary font-semibold">Receiver joins:</strong> Server sends <code className="text-xs bg-white/5 px-1 py-0.5 rounded">peer-joined</code> to the host, which immediately opens a new RTCPeerConnection to that receiver and initiates a fresh WebRTC offer/answer exchange.
            </li>
            <li>
              <strong className="text-text-primary font-semibold">File broadcast:</strong> When the host drops files, <code className="text-xs bg-white/5 px-1 py-0.5 rounded">sendFiles()</code> fans out — it queues independent <code className="text-xs bg-white/5 px-1 py-0.5 rounded">SenderEntry</code> objects per receiver and starts an independent send pump per DataChannel. Each pump has its own flow control.
            </li>
            <li>
              <strong className="text-text-primary font-semibold">Host leaves:</strong> A <code className="text-xs bg-white/5 px-1 py-0.5 rounded">host-left</code> event is broadcast to all receivers — they clean up immediately.
            </li>
          </ul>

          <div className="border border-white/[0.06] bg-white/[0.01] rounded-xl p-5 space-y-2">
            <div className="text-[10px] text-text-secondary/40 uppercase tracking-wide font-semibold pb-2 border-b border-white/[0.04]">
              HOW TO USE BROADCAST MODE
            </div>
            <ol className="list-decimal pl-4 text-xs text-text-secondary/80 space-y-2 font-normal leading-relaxed">
              <li>Open Zapp and drop your files — a 6-digit room code is generated and you become the <strong className="text-text-primary">host</strong>.</li>
              <li>Share the code or the direct link with all intended receivers. They can join by typing the code or clicking the link.</li>
              <li>Each receiver that joins triggers an automatic P2P handshake. The host's UI shows a live receiver count badge.</li>
              <li>Once the first receiver connects, the transfer starts automatically. Subsequent receivers who join mid-transfer will start from the beginning of the queue.</li>
              <li>Receivers can also send files back to the host via the "Send files to host" button.</li>
            </ol>
          </div>
        </section>

        {/* ── 03 Protocol ─────────────────────────────────────────────── */}
        <section id="protocol" className="space-y-4 scroll-mt-28 pt-10 border-t border-white/[0.05]">
          <span className="text-[10px] font-mono text-text-secondary/50 uppercase tracking-widest font-semibold block">
            03 / PROTOCOL ARCHITECTURE
          </span>
          <h2 className="font-serif text-2xl md:text-3xl font-medium text-text-primary tracking-tight">
            WebRTC SCTP Channels
          </h2>
          <p className="text-sm text-text-secondary/80 leading-relaxed font-normal">
            The underlying transport is a <strong className="text-text-primary font-semibold">WebRTC SCTP DataChannel</strong> with <code className="text-xs bg-white/5 px-1 py-0.5 rounded">ordered: true</code> for reliable delivery. Connection negotiation works in three stages:
          </p>
          <ul className="list-decimal pl-5 text-sm text-text-secondary/80 space-y-3 font-normal leading-relaxed">
            <li>
              <strong className="text-text-primary font-semibold">Signaling Handshake:</strong> A lightweight Node.js WebSocket server exchanges SDP offers/answers and ICE candidates using the 6-digit room code. The server is stateless — it only routes JSON messages between peers and maintains an in-memory room map.
            </li>
            <li>
              <strong className="text-text-primary font-semibold">NAT Traversal:</strong> 6 STUN servers (5× Google, 1× Cloudflare) + 3 OpenRelay TURN servers are configured. <code className="text-xs bg-white/5 px-1 py-0.5 rounded">iceCandidatePoolSize: 10</code> pre-gathers candidates for sub-100ms connect times. ICE restart is attempted up to 3 times on failure.
            </li>
            <li>
              <strong className="text-text-primary font-semibold">SCTP Data Channel:</strong> Once P2P is established, the signaling connection is irrelevant — all data flows over the encrypted SCTP channel. <code className="text-xs bg-white/5 px-1 py-0.5 rounded">bundlePolicy: max-bundle</code> multiplexes everything on a single transport.
            </li>
          </ul>
        </section>

        {/* ── 04 Performance ─────────────────────────────────────────── */}
        <section id="performance" className="space-y-4 scroll-mt-28 pt-10 border-t border-white/[0.05]">
          <span className="text-[10px] font-mono text-text-secondary/50 uppercase tracking-widest font-semibold block">
            04 / PERFORMANCE ENGINE
          </span>
          <h2 className="font-serif text-2xl md:text-3xl font-medium text-text-primary tracking-tight">
            High-Throughput Streaming
          </h2>
          <p className="text-sm text-text-secondary/80 leading-relaxed font-normal">
            Zapp's send pump uses <code className="text-xs bg-white/5 px-1 py-0.5 rounded">Blob.slice().arrayBuffer()</code> — a Promise-based API that reads file chunks directly from disk with no FileReader callbacks and no stale-handler risk.
          </p>

          {/* Perf table */}
          <div className="border border-white/[0.06] bg-white/[0.01] rounded-xl p-5 font-mono text-xs text-text-secondary/90 leading-relaxed">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1.4fr)] gap-x-3 border-b border-white/[0.04] pb-2 text-[10px] text-text-secondary/40 uppercase tracking-wide font-semibold">
              <span>Parameter</span><span className="text-center">Value</span><span className="text-right">Purpose</span>
            </div>
            {[
              ['CHUNK_SIZE', '256 KB', 'Max safe DataChannel chunk'],
              ['BUFFER_HIGH_WATERMARK', '4 MB', 'Stop filling — OS buffer full'],
              ['BUFFER_LOW_WATERMARK', '512 KB', 'Wake pump — buffer draining'],
              ['STATS_INTERVAL_MS', '300 ms', 'Progress update cadence'],
              ['MAX_ICE_RESTARTS', '3', 'Retry cap before cleanup'],
              ['iceCandidatePoolSize', '10', 'Pre-gather for fast connect'],
            ].map(([key, val, desc]) => (
              <div key={key} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1.4fr)] gap-x-3 py-1.5 border-b border-white/[0.02] last:border-0 items-baseline">
                <span className="text-text-secondary/80 break-words">{key}</span>
                <span className="text-emerald-400 text-center whitespace-nowrap">{val}</span>
                <span className="text-text-secondary/50 text-right break-words">{desc}</span>
              </div>
            ))}
          </div>

          <p className="text-sm text-text-secondary/80 leading-relaxed font-normal">
            The pump sleeps via <code className="text-xs bg-white/5 px-1 py-0.5 rounded">await new Promise(resolve =&gt; sender.resolvePump = resolve)</code> when the buffer is full, and wakes up inside <code className="text-xs bg-white/5 px-1 py-0.5 rounded">dc.onbufferedamountlow</code> — zero busy-spinning, zero stall risk.
          </p>

          <div className="border border-white/[0.06] bg-white/[0.01] rounded-xl p-5 font-mono text-xs text-text-secondary/90 leading-relaxed space-y-2.5">
            <div className="flex justify-between border-b border-white/[0.04] pb-2 text-[10px] text-text-secondary/50 uppercase tracking-wide font-semibold">
              <span>Data Flow Step</span><span>Buffer State</span>
            </div>
            <div className="flex justify-between"><span>1. file.slice().arrayBuffer()</span><span className="text-emerald-400">Async read, zero RAM spike</span></div>
            <div className="flex justify-between"><span>2. dc.send(chunk)</span><span className="text-amber-400">Push to OS SCTP buffer</span></div>
            <div className="flex justify-between"><span>3. bufferedAmount &gt; 4 MB → sleep</span><span className="text-amber-400">Back-pressure applied</span></div>
            <div className="flex justify-between"><span>4. onbufferedamountlow → wake</span><span className="text-emerald-400">Resume pumping</span></div>
            <div className="flex justify-between"><span>5. Receiver assembles chunks</span><span className="text-emerald-400">Blob.download() on file-end</span></div>
          </div>
        </section>

        {/* ── 05 Security ─────────────────────────────────────────────── */}
        <section id="security" className="space-y-4 scroll-mt-28 pt-10 border-t border-white/[0.05]">
          <span className="text-[10px] font-mono text-text-secondary/50 uppercase tracking-widest font-semibold block">
            05 / PRIVACY STANDARD
          </span>
          <h2 className="font-serif text-2xl md:text-3xl font-medium text-text-primary tracking-tight">
            Security & Cryptography
          </h2>
          <p className="text-sm text-text-secondary/80 leading-relaxed font-normal">
            WebRTC SCTP channels mandate <strong className="text-text-primary font-semibold">DTLS (Datagram Transport Layer Security)</strong> encryption — it is not optional. This provides bank-grade security:
          </p>
          <ul className="list-disc pl-5 text-sm text-text-secondary/80 space-y-3 font-normal leading-relaxed">
            <li>
              <strong className="text-text-primary font-semibold">End-to-End Encryption:</strong> Only the sender and receiver hold the DTLS session keys. The signaling server routes JSON messages only — it never sees file payloads.
            </li>
            <li>
              <strong className="text-text-primary font-semibold">Zero Logging:</strong> No metadata, file names, or payload data is persisted. Room maps live in Node.js process memory and are deleted when peers disconnect.
            </li>
            <li>
              <strong className="text-text-primary font-semibold">Room Isolation:</strong> A 6-digit code is required to join. The server enforces a hard cap of 10 peers per room and returns a typed <code className="text-xs bg-white/5 px-1 py-0.5 rounded">ROOM_FULL</code> error to late joiners.
            </li>
            <li>
              <strong className="text-text-primary font-semibold">No Cookies or Tracking:</strong> Zapp has no analytics, no account system, no persistent identifiers. Digital sovereignty is absolute.
            </li>
          </ul>
        </section>

        {/* ── 06 FAQ ─────────────────────────────────────────────────── */}
        <section id="faq" className="space-y-6 scroll-mt-28 pt-10 border-t border-white/[0.05]">
          <span className="text-[10px] font-mono text-text-secondary/50 uppercase tracking-widest font-semibold block">
            06 / FAQ & TROUBLESHOOTING
          </span>
          <h2 className="font-serif text-2xl md:text-3xl font-medium text-text-primary tracking-tight">
            FAQ & Limits
          </h2>
          <div className="space-y-6">
            {[
              {
                q: 'How many people can receive the same file at once?',
                a: 'Up to 10 receivers can join a single room. The first peer to join becomes the host/broadcaster. Each additional peer gets an independent RTCPeerConnection and DataChannel — they never interfere with each other.'
              },
              {
                q: 'Can receivers also send files to the host?',
                a: 'Yes. Receivers have a "Send files to host" button in the workspace. Since every WebRTC connection is bidirectional, the receiver\'s DataChannel can also be used to send files back.'
              },
              {
                q: 'Why is my connection stuck on "connecting..."?',
                a: 'Strict firewalls (especially corporate or university networks) may block UDP traffic required by WebRTC. Zapp uses TURN relay servers (OpenRelay) as a fallback, which tunnel over TCP port 443. If still blocked, try a mobile hotspot.'
              },
              {
                q: 'Can I close the tab while transferring?',
                a: 'No. Zapp reads chunks directly from browser memory at transfer time. Closing the tab terminates the connection and the transfer immediately. Keep the tab open until the progress bar shows 100%.'
              },
              {
                q: 'What file types are supported?',
                a: 'Every format — ZIPs, videos, executables, databases, ISOs. Zapp treats all payloads as raw binary buffers. There are no file type restrictions or content inspection.'
              },
              {
                q: 'Is there a file size limit?',
                a: 'No. Files are read in 256 KB slices directly from disk via Blob.slice() — they are never fully loaded into RAM. Gigabyte-scale and terabyte-scale transfers are supported without crashing the browser tab.'
              },
              {
                q: 'What happens if the connection drops mid-transfer?',
                a: 'Zapp automatically attempts ICE restart up to 3 times. If the connection is restored, the transfer resumes from the current pump position. If all 3 restarts fail, the transfer is marked as failed and you will need to re-send.'
              },
            ].map(({ q, a }) => (
              <div key={q} className="space-y-2">
                <h4 className="text-sm font-semibold text-text-primary">{q}</h4>
                <p className="text-xs text-text-secondary/80 leading-relaxed font-normal">{a}</p>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
