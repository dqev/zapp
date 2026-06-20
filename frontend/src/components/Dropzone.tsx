import React, { useState, useRef } from 'react';
import { Library, Folder } from 'reicon-react';
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

export function Dropzone({ onFilesSelected, disabled }: DropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isDragOver, setIsDragOver]     = useState(false);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const dragCounter    = useRef(0); // track nested drag enter/leave

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

      // Convert File[] → FileList-like object via DataTransfer
      const dt = new DataTransfer();
      files.forEach(f => dt.items.add(f));
      onFilesSelected(dt.files);
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
        className={`relative flex-grow flex flex-col items-center justify-center p-10 cursor-pointer rounded-xl transition-all duration-300 ${
          disabled
            ? 'opacity-30 cursor-not-allowed border border-white/10 bg-black/20'
            : isDragOver
            ? 'border-2 border-white bg-element-background/30 shadow-2xl shadow-white/5'
            : isDragActive
            ? 'border-2 border-white/50 bg-element-background/20'
            : 'element-border bg-element-background/10 hover:bg-element-background/25'
        }`}
      >
        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled}
        />
        {/* Folder input */}
        <input
          ref={folderInputRef}
          type="file"
          // @ts-ignore — webkitdirectory is non-standard but widely supported
          webkitdirectory=""
          multiple
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled}
        />

        {/* Icon */}
        <motion.div
          animate={{ scale: isDragActive ? 1.15 : 1, rotate: isDragActive ? 5 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="mb-5 bg-white/5 border border-white/10 p-4 rounded-full flex items-center justify-center text-text-secondary"
        >
          <Library className={`h-6 w-6 ${isDragActive ? 'text-white' : 'text-text-secondary'}`} />
        </motion.div>

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
                  : 'Multiple files and entire folders supported. Direct browser-to-browser streaming.'}
              </p>

              {!disabled && (
                <div className="flex items-center gap-2 justify-center">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="px-4 py-2 text-xs font-semibold rounded-full bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 text-text-primary transition-all duration-200 active:scale-95"
                  >
                    Browse Files
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click(); }}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-text-secondary hover:text-text-primary transition-all duration-200 active:scale-95"
                  >
                    <Folder className="h-3.5 w-3.5" />
                    Browse Folder
                  </button>
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
