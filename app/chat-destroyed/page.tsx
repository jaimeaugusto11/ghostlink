'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function ChatDestroyed() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background-dark flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-background-dark/80 backdrop-blur-md"></div>
      <div className="scanlines absolute inset-0 opacity-20"></div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-lg bg-background-dark border border-primary/30 rounded-2xl shadow-2xl overflow-hidden z-20"
      >
        <div className="h-2 w-full bg-gradient-to-r from-primary/0 via-primary to-primary/0"></div>
        <div className="p-8 sm:p-10 text-center flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 ring-1 ring-primary/30 relative">
            <span className="material-icons text-primary text-4xl">gpp_bad</span>
            <span className="absolute inset-0 rounded-full border border-primary/40 animate-ping opacity-20"></span>
          </div>

          <h1 className="text-3xl font-bold text-white mb-2 uppercase tracking-tight">Session Terminated</h1>
          <p className="text-gray-400 mb-8 max-w-sm mx-auto leading-relaxed">
            This secure channel has been closed. All message logs, media, and metadata have been <span className="text-primary font-medium">permanently purged</span> from our servers.
          </p>

          <div className="w-full bg-black/20 rounded-lg p-4 mb-8 border border-primary/10 text-left">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs font-mono uppercase">
                <span className="text-gray-500">Local Cache</span>
                <span className="text-primary flex items-center gap-1">
                  <span className="material-icons text-[10px]">check_circle</span> Cleared
                </span>
              </div>
              <div className="flex justify-between items-center text-xs font-mono uppercase">
                <span className="text-gray-500">Server Logs</span>
                <span className="text-primary flex items-center gap-1">
                  <span className="material-icons text-[10px]">check_circle</span> Overwritten
                </span>
              </div>
              <div className="flex justify-between items-center text-xs font-mono uppercase">
                <span className="text-gray-500">Encryption Keys</span>
                <span className="text-primary flex items-center gap-1">
                  <span className="material-icons text-[10px]">check_circle</span> Destroyed
                </span>
              </div>
            </div>
          </div>

          <button 
            onClick={() => router.push('/')}
            className="w-full group bg-primary hover:bg-primary/90 text-background-dark font-bold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 transform active:scale-95"
          >
            <span className="material-icons group-hover:rotate-180 transition-transform duration-500">refresh</span>
            Start New Chat
          </button>
        </div>
        
        <div className="bg-black/20 p-2 border-t border-primary/10">
          <div className="flex justify-between text-[10px] text-primary/30 font-mono uppercase tracking-widest">
            <span>STATUS: 0xDEAD</span>
            <span>EOF</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
