import React, { useState, useRef, useEffect } from 'react';
import { Library, File as FileIcon, Folder, Text, ChevronDown } from 'reicon-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DropzoneProps {
  onFilesSelected: (files: FileList) => void;
  disabled: boolean;
}

// Recursively collect all File objects from a dropped DataTransferItem (handles folders)
async function collectFilesFromEntry(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    return new Promise<File[]>((resolve) => {
      (entry as FileSystemFileEntry).file(
        (file) => resolve([file]),
        () => resolve([])
      );
    });
  } else if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    const allEntries: FileSystemEntry[] = [];

    // readEntries only returns up to 100 at a time — loop until exhausted
    await new Promise<void>((resolve) => {
      const readBatch = () => {
        reader.readEntries((batch) => {
          if (batch.length === 0) { resolve(); return; }
          allEntries.push(...batch);
          readBatch();
        }, () => resolve());
      };
      readBatch();
    });

    const nested = await Promise.all(allEntries.map(collectFilesFromEntry));
    return nested.flat();
  }
  return [];
}

// Wrap an array of File objects into a FileList via DataTransfer
function toFileList(files: File[]): FileList {
  const dt = new DataTransfer();
  files.forEach(f => dt.items.add(f));
  return dt.files;
}

export function Dropzone({ onFilesSelected, disabled }: DropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textContent, setTextContent] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const dragCounter = useRef(0); // track nested drag enter/leave

  // Close the dropdown when clicking outside of it
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;

    if (e.type === 'dragenter') {
      dragCounter.current++;
      setIsDragActive(true);
      // Peek at item count
      if (e.dataTransfer.items) {
        setPendingCount(e.dataTransfer.items.length);
      }
    } else if (e.type === 'dragover') {
      setIsDragOver(true);
    } else if (e.type === 'dragleave') {
      dragCounter.current--;
      if (dragCounter.current === 0) {
        setIsDragActive(false);
        setIsDragOver(false);
        setPendingCount(null);
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragActive(false);
    setIsDragOver(false);
    setPendingCount(null);
    if (disabled) return;

    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;

    // Use FileSystem API to recursively expand folders
    const entries: FileSystemEntry[] = [];
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry?.();
      if (entry) entries.push(entry);
    }

    if (entries.length > 0) {
      const fileArrays = await Promise.all(entries.map(collectFilesFromEntry));
      const files = fileArrays.flat().filter(Boolean);
      if (files.length === 0) return;
      onFilesSelected(toFileList(files));
    } else if (e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled || !e.target.files || e.target.files.length === 0) return;
    onFilesSelected(e.target.files);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  // ── Dropdown actions ───────────────────────────────────────────────────────
  const handleUploadFile = () => {
    setMenuOpen(false);
    fileInputRef.current?.click();
  };

  const handleUploadFolder = () => {
    setMenuOpen(false);
    folderInputRef.current?.click();
  };

  const handleUploadText = async () => {
    setMenuOpen(false);
    setShowTextInput(true);
    // Try to prefill from the clipboard so already-copied text shows up automatically
    try {
      const clip = await navigator.clipboard.readText();
      if (clip && clip.trim().length > 0) {
        setTextContent(clip);
      }
    } catch {
      // Clipboard read blocked (no permission / not focused) — user can paste manually
    }
    setTimeout(() => textAreaRef.current?.focus(), 50);
  };

  const handleSendText = () => {
    const content = textContent.trim();
    if (!content) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const file = new File([content], `text-${stamp}.txt`, { type: 'text/plain' });
    onFilesSelected(toFileList([file]));
    setTextContent('');
    setShowTextInput(false);
  };

  const handleCancelText = () => {
    setShowTextInput(false);
    setTextContent('');
  };

  return (
    <div className="w-full relative z-20 flex-grow flex flex-col justify-center min-h-[280px]">
      <motion.div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        whileHover={{ scale: disabled ? 1 : 1.005 }}
        whileTap={{ scale: disabled ? 1 : 0.99 }}
        transition={{ duration: 0.2 }}
        className={`relative flex-grow flex flex-col items-center justify-center cursor-pointer rounded-xl transition-all duration-300 ${showTextInput ? 'p-2 sm:p-3' : 'p-5 sm:p-10'
          } ${disabled
            ? 'opacity-30 cursor-not-allowed border border-white/10 bg-black/20'
            : isDragOver
              ? 'border-2 border-white bg-element-background/30 shadow-2xl shadow-white/5'
              : isDragActive
                ? 'border-2 border-white/50 bg-element-background/20'
                : 'element-border bg-element-background/10 hover:bg-element-background/25'
          }`}
      >
        {/* Hidden file input — single or multiple files */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled}
        />
        {/* Hidden folder input */}
        <input
          ref={folderInputRef}
          type="file"
          // @ts-expect-error — webkitdirectory is non-standard but widely supported
          webkitdirectory=""
          multiple
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled}
        />

        {/* Icon — hidden in text mode */}
        {!showTextInput && (
          <motion.div
            animate={{ scale: isDragActive ? 1.15 : 1, rotate: isDragActive ? 5 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="mb-5 bg-white/5 border border-white/10 p-4 rounded-full flex items-center justify-center text-text-secondary"
          >
            <Library className={`h-6 w-6 ${isDragActive ? 'text-white' : 'text-text-secondary'}`} />
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {isDragActive ? (
            <motion.div
              key="drag-active"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="text-center"
            >
              <h4 className="text-base font-semibold text-white mb-1 font-sans tracking-tight">
                {pendingCount && pendingCount > 1
                  ? `Drop ${pendingCount} items`
                  : 'Drop to send'}
              </h4>
              <p className="text-white/60 text-xs">Folders supported — all files inside will be queued</p>
            </motion.div>
          ) : showTextInput ? (
            <motion.div
              key="text-input"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-2">
                <span className="text-[10px] font-semibold text-text-secondary/60 uppercase tracking-widest">
                  Paste or type text
                </span>
              </div>
              <textarea
                ref={textAreaRef}
                value={textContent}
                onChange={(e) => { setTextContent(e.target.value); }}
                placeholder="Paste your text here — it will be sent as a .txt file"
                rows={5}
                className="w-full resize-none bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-mono text-text-primary placeholder-text-secondary/40 outline-none focus:border-white/30 transition-colors"
              />
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleCancelText}
                  className="button-secondary px-5 py-2 text-xs font-semibold rounded-full transition-all duration-200 active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendText}
                  disabled={textContent.trim().length === 0}
                  className="button-primary px-5 py-2 text-xs font-semibold rounded-full disabled:opacity-40 transition-all duration-200 active:scale-95"
                >
                  Send Text
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="text-center"
            >
              <h4 className="text-base font-semibold text-text-primary mb-1.5 font-sans tracking-tight">
                {disabled ? 'Connecting Peer Tunnel...' : 'Drag & drop files or folders'}
              </h4>
              <p className="text-text-secondary/70 text-xs px-4 max-w-sm font-normal leading-relaxed mb-5">
                {disabled
                  ? 'Establishing connection… transfer starts automatically once connected.'
                  : 'Files, entire folders, or pasted text supported. Direct browser-to-browser streaming.'}
              </p>

              {!disabled && (
                <div className="relative inline-block" ref={menuRef}>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
                    className="button-primary group inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-full transition-all duration-200 active:scale-95"
                  >
                    <span>Upload</span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${menuOpen ? '' : 'rotate-180'}`} />
                  </button>

                  <AnimatePresence>
                    {menuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-44 z-30 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden p-1"
                      >
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleUploadFile(); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-lg transition-colors text-left"
                        >
                          <FileIcon className="h-3.5 w-3.5 shrink-0" />
                          Upload File
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleUploadFolder(); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-lg transition-colors text-left"
                        >
                          <Folder className="h-3.5 w-3.5 shrink-0" />
                          Upload Folder
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleUploadText(); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-lg transition-colors text-left"
                        >
                          <Text className="h-3.5 w-3.5 shrink-0" />
                          Upload Text
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drop overlay border glow */}
        {isDragActive && (
          <div className="absolute inset-0 rounded-xl border border-white/20 pointer-events-none shadow-[inset_0_0_40px_rgba(255,255,255,0.04)]" />
        )}
      </motion.div>
    </div>
  );
}
