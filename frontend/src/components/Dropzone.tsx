import React, { useState, useRef } from 'react';
import { Library } from 'reicon-react';
import { motion } from 'framer-motion';

interface DropzoneProps {
  onFilesSelected: (files: FileList) => void;
  disabled: boolean;
}

export function Dropzone({ onFilesSelected, disabled }: DropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled) return;

    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
    }
  };

  const onButtonClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full relative z-20 flex-grow flex flex-col justify-center min-h-[280px]">
      <motion.div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
        whileHover={{ scale: disabled ? 1 : 1.01 }}
        whileTap={{ scale: disabled ? 1 : 0.99 }}
        transition={{ duration: 0.2 }}
        className={`relative flex-grow flex flex-col items-center justify-center p-12 cursor-pointer rounded-xl transition-all duration-300 ${
          disabled
            ? 'opacity-30 cursor-not-allowed border border-white/10 bg-black/20'
            : isDragActive
            ? 'border-2 border-white bg-element-background/30 shadow-lg shadow-black/40'
            : 'element-border bg-element-background/10 hover:bg-element-background/25'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleChange}
          disabled={disabled}
        />

        <div className="mb-5 bg-white/5 border border-white/10 p-4 rounded-full flex items-center justify-center text-text-secondary">
          <Library className={`h-6 w-6 ${isDragActive ? 'text-white' : 'text-text-secondary'}`} />
        </div>

        <h4 className="text-base font-semibold text-text-primary mb-1.5 text-center font-sans tracking-tight">
          {disabled ? 'Connecting Peer Tunnel...' : 'Drag & drop files here'}
        </h4>
        
        <p className="text-text-secondary/70 text-xs text-center px-4 max-w-sm font-normal leading-relaxed">
          {disabled
            ? 'Establishing connection... Your transfer starts automatically once connected.'
            : 'or click to browse local files. Direct browser-to-browser streaming.'}
        </p>

        {isDragActive && (
          <div className="absolute inset-0 rounded-xl border border-white/20 pointer-events-none" />
        )}
      </motion.div>
    </div>
  );
}
