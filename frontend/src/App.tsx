import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useWebRTC } from './hooks/useWebRTC';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Hero } from './components/Hero';
import { Dropzone } from './components/Dropzone';
import { JoinForm } from './components/JoinForm';
import { ActiveWorkspace } from './components/ActiveWorkspace';
import { TextSendPage } from './components/TextSendPage';
import { TextWorkspace } from './components/TextWorkspace';
import { TextHero } from './components/TextHero';
import { Features } from './components/Features';
import { FAQ } from './components/FAQ';
import { Docs } from './components/Docs';
import { AnimatePresence, motion } from 'framer-motion';
import { formatBytes } from './utils/format';

function App() {
  const [roomId, setRoomId] = useState(() => {
    const hash = window.location.hash.substring(1);
    return hash === 'docs' ? '' : hash;
  });

  const [view, setView] = useState<'home' | 'docs'>(() => {
    return window.location.hash.substring(1) === 'docs' ? 'docs' : 'home';
  });

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [hasStartedSending, setHasStartedSending] = useState(false);
  // /text is a fully separate page — same room flow, verbatim formatting
  const [routePath, setRoutePath] = useState(() => window.location.pathname);
  const [pendingText, setPendingText] = useState('');
  const [hasStartedSendingText, setHasStartedSendingText] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  // Receiver input code state
  const [inputCode, setInputCode] = useState('');

  const isTextPage = routePath.startsWith('/text');

  // Handle hash + pathname changes (SPA routing for / and /text)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.substring(1);
      if (hash === 'docs') {
        setView('docs');
        setRoomId('');
      } else {
        setView('home');
        setRoomId(hash);
        if (!hash) {
          // Reset state if we navigated home
          setPendingFiles([]);
          setHasStartedSending(false);
          setPendingText('');
          setHasStartedSendingText(false);
          setShowQR(false);
          setQrCodeUrl('');
          setInputCode('');
        }
      }
    };
    const handleRouteChange = () => setRoutePath(window.location.pathname);

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleRouteChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  // Text rooms carry a '-t' suffix so file rooms stay compatible.
  // Full hash (with suffix) is the signaling room; base code is the 6-digit display.
  const isTextRoom = roomId.endsWith('-t');
  const displayRoomCode = isTextRoom ? roomId.slice(0, 6) : roomId;

  // Keep rooms on their canonical page: text rooms → /text, file rooms → /
  useEffect(() => {
    if (!roomId || view !== 'home') return;
    if (isTextRoom && !isTextPage) {
      window.history.replaceState({}, '', `/text#${roomId}`);
      setRoutePath('/text');
    } else if (!isTextRoom && isTextPage) {
      window.history.replaceState({}, '', `/#${roomId}`);
      setRoutePath('/');
    }
  }, [roomId, isTextRoom, isTextPage, view]);

  // WebRTC initialization
  const {
    connectionState,
    isHost,
    peerCount,
    connectedPeers,
    transferQueue,
    textMessages,
    sendFiles,
    sendText,
    pauseTransfer,
    resumeTransfer,
    cancelTransfer
  } = useWebRTC(roomId);

  const isConnected = connectionState === 'connected';

  // Automatically start file transfer when connected (bulk)
  useEffect(() => {
    if (isConnected && pendingFiles.length > 0 && !hasStartedSending) {
      setHasStartedSending(true);
      sendFiles(pendingFiles);
    }
  }, [isConnected, pendingFiles, hasStartedSending, sendFiles]);

  // Automatically send pending text when connected (same semantics as files)
  useEffect(() => {
    if (isConnected && pendingText.length > 0 && !hasStartedSendingText) {
      setHasStartedSendingText(true);
      sendText(pendingText);
    }
  }, [isConnected, pendingText, hasStartedSendingText, sendText]);

  // Share links are page-scoped: text rooms → /text#…, file rooms → /#…
  const shareBase = isTextRoom || isTextPage ? `${window.location.origin}/text` : window.location.origin;
  const shareUrl = roomId ? `${shareBase}/#${roomId}` : '';
  useEffect(() => {
    if (!roomId) return;
    QRCode.toDataURL(shareUrl, {
      margin: 1,
      width: 256,
      color: { dark: '#09090b', light: '#ffffff' }
    })
      .then(url => setQrCodeUrl(url))
      .catch(err => console.error(err));
  }, [roomId, shareUrl]);

  const copyToClipboard = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileSelected = (files: FileList) => {
    if (files.length === 0) return;
    const fileArray = Array.from(files);
    setPendingFiles(fileArray);

    // Generate a cryptographically secure 6-digit numeric room ID code and set hash
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const randomCode = (100000 + (array[0] % 900000)).toString();
    window.location.hash = randomCode;
  };

  const generateRoomCode = () => {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return (100000 + (array[0] % 900000)).toString();
  };

  const handleTextCreate = (text: string) => {
    if (!text || text.length === 0) return;
    setPendingText(text);
    setHasStartedSendingText(false);
    // Text rooms get a '-t' suffix — same 6-digit UX, separate signaling room
    window.location.hash = `${generateRoomCode()}-t`;
  };

  const handleJoinCode = (e: React.FormEvent) => {
    e.preventDefault();
    // Accept raw codes ("123456"), text-room links ("...#123456-t"), or suffixed codes
    let raw = inputCode.trim().replace(/\s+/g, '');
    if (raw.includes('#')) raw = raw.split('#').pop() || raw;
    const digits = raw.replace(/-t$/i, '').replace(/t$/i, '');
    if (digits.length === 6 && /^\d+$/.test(digits)) {
      // Page decides the room kind: /text joins text rooms, / joins file rooms
      if (raw.endsWith('-t')) window.location.hash = raw;
      else window.location.hash = isTextPage ? `${digits}-t` : digits;
    } else {
      alert("Please enter a valid 6-digit code.");
    }
  };

  const handleReset = () => {
    setPendingFiles([]);
    setHasStartedSending(false);
    setPendingText('');
    setHasStartedSendingText(false);
    window.location.hash = '';
  };

  const scrollToWorkspace = () => {
    const el = document.getElementById('dashboard-workspace');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#09090b] text-text-primary font-sans relative select-none">

      <Header />

      {/* Page Content */}
      <div className="flex-grow flex flex-col items-center w-full relative z-10">

        {view === 'docs' ? (
          <div className="w-full pt-28 pb-20">
            <Docs />
          </div>
        ) : (
          <>
            {isTextPage ? (
              <TextHero scrollToWorkspace={scrollToWorkspace} />
            ) : (
              <Hero scrollToWorkspace={scrollToWorkspace} />
            )}

            {/* 2. Dashboard Workspace Section */}
            <section id="dashboard-workspace" className="w-full max-w-[1200px] mx-auto px-6 md:px-10 mb-20">
              <div className="rounded-2xl bg-element-background/40 element-border shadow-2xl shadow-black/50 p-6 md:p-8 backdrop-blur-md overflow-hidden relative max-w-4xl mx-auto">

                <div className="relative z-10">

                  {/* Top Navigation Trail inside Card */}
                  <div className="flex items-center justify-between border-b border-white/[0.04] pb-4 mb-6">
                    <nav className="flex items-center gap-1.5 text-xs text-text-secondary font-medium">
                      <span className="hidden sm:inline hover:text-text-primary cursor-pointer transition-colors" onClick={handleReset}>zapp</span>
                      <span className="hidden sm:inline text-text-secondary/40 select-none">/</span>
                      {roomId ? (
                        <>
                          <span className="font-mono bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-[10px] text-text-primary">
                            room-{displayRoomCode}
                          </span>
                          <span className="font-mono bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-[10px] text-text-secondary">
                            {isTextRoom ? 'text' : 'file'}
                          </span>
                          <span className="hidden sm:inline text-text-secondary/40 select-none">/</span>
                          <span className="hidden sm:inline text-text-primary font-normal">{isHost ? 'host' : (pendingFiles.length > 0 || pendingText.length > 0 ? 'sender' : 'receiver')}</span>
                        </>
                      ) : (
                        <span className="text-text-primary font-normal">new connection</span>
                      )}
                    </nav>

                    <div className="flex items-center gap-2">
                      {roomId && (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold border ${isConnected
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : connectionState === 'failed'
                              ? 'bg-red-500/10 text-red-400 border-red-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : connectionState === 'failed' ? 'bg-red-400' : 'bg-amber-400'
                            }`} />
                          {isConnected
                            ? peerCount > 1
                              ? `${peerCount} connected`
                              : 'connected'
                            : connectionState === 'failed' ? 'room full' : 'connecting...'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Main Content Areas — page-scoped: /text is text-only, / is files-only */}
                  <div className="space-y-6">

                    <AnimatePresence mode="wait">
                      {!roomId ? (
                        isTextPage ? (
                          <motion.div
                            key="text-view"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-8"
                          >
                            <TextSendPage onCreateRoom={handleTextCreate} />

                            <div className="relative flex items-center justify-center my-2" role="separator" aria-label="or connect">
                              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                              </div>
                              <span className="relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#141416] border border-white/[0.08] shadow-sm shadow-black/30 text-[10px] font-semibold text-text-secondary/70 uppercase tracking-[0.18em]">
                                <span className="w-1 h-1 rounded-full bg-white/30" aria-hidden="true" />
                                or join text room
                                <span className="w-1 h-1 rounded-full bg-white/30" aria-hidden="true" />
                              </span>
                            </div>

                            <JoinForm
                              inputCode={inputCode}
                              setInputCode={setInputCode}
                              handleJoinCode={handleJoinCode}
                              title="Receive Text Stream"
                            />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="upload-view"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-8"
                          >
                            <Dropzone onFilesSelected={handleFileSelected} disabled={false} />

                            <div className="relative flex items-center justify-center my-7" role="separator" aria-label="or connect">
                              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                              </div>
                              <span className="relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#141416] border border-white/[0.08] shadow-sm shadow-black/30 text-[10px] font-semibold text-text-secondary/70 uppercase tracking-[0.18em]">
                                <span className="w-1 h-1 rounded-full bg-white/30" aria-hidden="true" />
                                or connect
                                <span className="w-1 h-1 rounded-full bg-white/30" aria-hidden="true" />
                              </span>
                            </div>

                            <JoinForm
                              inputCode={inputCode}
                              setInputCode={setInputCode}
                              handleJoinCode={handleJoinCode}
                            />
                          </motion.div>
                        )
                      ) : isTextPage || isTextRoom ? (
                        <TextWorkspace
                          roomId={displayRoomCode}
                          pendingText={pendingText}
                          isConnected={isConnected}
                          isHost={isHost}
                          peerCount={peerCount}
                          shareUrl={shareUrl}
                          copied={copied}
                          copyToClipboard={copyToClipboard}
                          showQR={showQR}
                          setShowQR={setShowQR}
                          qrCodeUrl={qrCodeUrl}
                          textMessages={textMessages}
                          sendText={sendText}
                          handleReset={handleReset}
                        />
                      ) : (
                        <ActiveWorkspace
                          roomId={roomId}
                          pendingFiles={pendingFiles}
                          isConnected={isConnected}
                          isHost={isHost}
                          peerCount={peerCount}
                          connectedPeers={connectedPeers}
                          shareUrl={shareUrl}
                          copied={copied}
                          copyToClipboard={copyToClipboard}
                          showQR={showQR}
                          setShowQR={setShowQR}
                          qrCodeUrl={qrCodeUrl}
                          transferQueue={transferQueue}
                          cancelTransfer={cancelTransfer}
                          pauseTransfer={pauseTransfer}
                          resumeTransfer={resumeTransfer}
                          sendFiles={sendFiles}
                          handleReset={handleReset}
                          formatBytes={formatBytes}
                        />
                      )}
                    </AnimatePresence>

                  </div>

                </div>

              </div>
            </section>

            <Features />

            <FAQ />
          </>
        )}

      </div>

      <Footer />
    </div>
  );
}

export default App;
export { App };
