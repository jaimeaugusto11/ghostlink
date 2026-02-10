'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface MediaViewerProps {
  type: 'image' | 'video';
  src: string;
  onClose: () => void;
  onExpire: () => void;
}

export default function MediaViewer({ type, src, onClose, onExpire }: MediaViewerProps) {
  const [timeLeft, setTimeLeft] = useState(10); // 10 seconds for one-time view

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onExpire]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-4">
      {/* Top Progress Bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-white/10 z-50">
        <motion.div 
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: 10, ease: 'linear' }}
          className="h-full bg-primary shadow-[0_0_10px_#2bee7c]"
        />
      </div>

      <header className="absolute top-0 left-0 w-full p-6 flex justify-between items-start">
        <div className="flex items-center gap-3 opacity-80">
          <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/5">
            <span className="material-icons text-white/70 text-sm">lock</span>
          </div>
          <div>
            <p className="text-white text-sm font-medium tracking-wide">Encrypted Media</p>
            <p className="text-white/40 text-xs">Self-destructing in {timeLeft}s</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 text-white/40 hover:text-white transition-colors"
        >
          <span className="material-icons">close</span>
        </button>
      </header>

      <div className="relative max-w-5xl max-h-[80vh] w-full flex items-center justify-center z-10">
        {type === 'image' ? (
          <img 
            src={src} 
            alt="One-time secure media" 
            className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
            onContextMenu={(e) => e.preventDefault()}
          />
        ) : (
          <video 
            src={src} 
            autoPlay 
            className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
            onContextMenu={(e) => e.preventDefault()}
          />
        )}
      </div>

      <footer className="absolute bottom-6 left-0 w-full text-center">
        <p className="text-primary/40 text-xs uppercase tracking-[0.2em] animate-pulse">
          Message will self-destruct
        </p>
      </footer>
    </div>
  );
}
