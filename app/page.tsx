'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { db } from '@/lib/firebase';
import { doc, getDoc, addDoc, collection, serverTimestamp, updateDoc, increment } from 'firebase/firestore';

export default function Home() {
  const [sessionKey, setSessionKey] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdChat, setCreatedChat] = useState<{id: string, password: string} | null>(null);
  const router = useRouter();

  const handleJoin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    const joinId = sessionKey.trim();
    const joinPassword = password.trim();
    
    if (!joinId || !joinPassword) {
      setError('Por favor, insira o ID da Sessão e a Senha.');
      setLoading(false);
      return;
    }

    try {
      const chatRef = doc(db, 'chats', joinId);
      const chatSnap = await getDoc(chatRef);

      if (!chatSnap.exists()) {
        setError('Sessão não encontrada ou expirada.');
        setLoading(false);
        return;
      }

      const chatData = chatSnap.data();

      // Check Password
      if (chatData.password !== joinPassword) {
        setError('Senha incorreta.');
        setLoading(false);
        return;
      }

      // Check Expiration (Client-side check, ideally Firestore TTL handles deletion)
      if (chatData.expiresAt && chatData.expiresAt.toMillis() < Date.now()) {
         setError('Sessão expirada.');
         setLoading(false);
         return;
      }

      if (chatData.currentUsers >= chatData.maxUsers) {
        setError(`Sessão cheia (Máx ${chatData.maxUsers}).`);
        setLoading(false);
        return;
      }

      // Update User Count
      await updateDoc(chatRef, {
        currentUsers: increment(1)
      });

      // Save password in session storage so the chat page can use it
      sessionStorage.setItem(`chat_pwd_${joinId}`, joinPassword);
      router.push(`/chat/${joinId}`);

    } catch (err: any) {
      console.error(err);
      setError('Erro ao entrar na sessão: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChat = async () => {
    setLoading(true);
    setError('');
    setCreatedChat(null);
    const generatedPassword = Math.random().toString(36).substring(7);
    
    try {
      const chatRef = await addDoc(collection(db, 'chats'), {
        password: generatedPassword,
        maxUsers: 10,
        currentUsers: 0,
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      });

      setCreatedChat({ id: chatRef.id, password: generatedPassword });
      setSessionKey(chatRef.id);
      setPassword(generatedPassword);
    } catch (err: any) {
      console.error(err);
      setError('Failed to create chat: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative z-10 w-full max-w-md mx-auto min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full scanlines opacity-20 pointer-events-none z-0"></div>
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none z-0"></div>
      
      {/* Status Indicator */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-surface-dark border border-primary/10 shadow-lg">
          <span className="relative flex h-2 w-2 mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          <span className="text-xs font-medium tracking-widest uppercase text-primary/80">End-to-end Encrypted</span>
        </div>
      </div>

      {/* The Entry Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-xl p-8 md:p-10 w-full transition-all duration-500 hover:shadow-primary/5 hover:border-primary/20"
      >
        {/* Logo Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-surface-dark to-background-dark border border-primary/20 mb-4 shadow-inner shadow-primary/5 group">
            <span className="material-icons text-primary text-3xl group-hover:text-white transition-colors duration-300">visibility_off</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Ghost<span className="text-primary">Link</span></h1>
          <p className="text-slate-400 text-sm font-light">Anonymous Temporary Channel (Firebase)</p>
        </div>

        {/* Form Section */}
        {createdChat ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 p-4 rounded-lg bg-primary/10 border border-primary/20 space-y-4"
          >
            <div className="flex items-center justify-between text-xs text-primary font-bold uppercase tracking-widest">
              <span>Session Created</span>
              <span className="material-icons text-sm">check_circle</span>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-tighter mb-1">Session ID</p>
                <div className="flex items-center justify-between bg-background-dark/50 p-2 rounded border border-slate-800">
                  <code className="text-sm font-mono text-white truncate mr-2">{createdChat.id}</code>
                  <button 
                    onClick={() => navigator.clipboard.writeText(createdChat.id)}
                    className="text-slate-500 hover:text-primary transition-colors"
                  >
                    <span className="material-icons text-sm">content_copy</span>
                  </button>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-tighter mb-1">Passkey</p>
                <div className="flex items-center justify-between bg-background-dark/50 p-2 rounded border border-slate-800">
                  <code className="text-sm font-mono text-white truncate mr-2">{createdChat.password}</code>
                  <button 
                    onClick={() => navigator.clipboard.writeText(createdChat.password)}
                    className="text-slate-500 hover:text-primary transition-colors"
                  >
                    <span className="material-icons text-sm">content_copy</span>
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => handleJoin()}
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg bg-primary hover:bg-primary-light text-background-dark font-bold transition-all flex items-center justify-center group"
            >
              <span>{loading ? "Decrypting..." : "Enter Secure Session"}</span>
              <span className="material-icons ml-2 text-sm group-hover:translate-x-1 transition-transform">login</span>
            </button>
            <button 
              onClick={() => setCreatedChat(null)}
              className="w-full text-[10px] text-slate-500 hover:text-white transition-colors"
            >
              Back to entry screen
            </button>
          </motion.div>
        ) : (
          <form onSubmit={(e) => handleJoin(e)} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 pl-1" htmlFor="session-id">Session ID</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="material-icons text-slate-500 text-lg group-focus-within:text-primary transition-colors">tag</span>
                  </div>
                  <input
                    id="session-id"
                    type="text"
                    value={sessionKey}
                    onChange={(e) => setSessionKey(e.target.value)}
                    placeholder="Enter Session ID"
                    className="block w-full pl-11 pr-4 py-4 bg-background-dark border border-slate-700/50 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all font-mono text-sm tracking-tight shadow-inner"
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 pl-1" htmlFor="password">Passkey</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="material-icons text-slate-500 text-lg group-focus-within:text-primary transition-colors">vpn_key</span>
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter Passkey"
                    className="block w-full pl-11 pr-12 py-4 bg-background-dark border border-slate-700/50 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all font-mono text-sm tracking-tight shadow-inner"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-primary transition-colors focus:outline-none"
                  >
                    <span className="material-icons text-lg">{showPassword ? "visibility_off" : "visibility"}</span>
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 rounded-lg bg-accent-purple hover:bg-purple-400 focus:ring-4 focus:ring-purple-500/30 text-white font-semibold shadow-lg shadow-purple-900/20 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center group"
            >
              <span>{loading ? "Decrypting..." : "Join Secure Chat"}</span>
              <span className="material-icons ml-2 text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          </form>
        )}

        {error && (
          <p className="mt-4 text-center text-red-400 text-xs font-mono">{error}</p>
        )}

        {/* Footer / Subtext */}
        {!createdChat && (
          <div className="mt-8 text-center border-t border-slate-700/30 pt-6">
            <button 
              onClick={handleCreateChat}
              className="text-xs text-primary hover:text-white transition-colors mb-4 block mx-auto underline"
            >
              Create new secure session
            </button>
            <p className="text-xs text-slate-500 leading-relaxed max-w-[260px] mx-auto">
              No accounts, no logs. Enter the key to access this temporary session.
            </p>
          </div>
        )}
      </motion.div>

      {/* Bottom secure badge */}
      <div className="mt-8 text-center">
        <p className="text-[10px] text-slate-600 font-mono">NODE: <span className="text-primary/70">FIREBASE-SECURE</span></p>
      </div>
    </main>
  );
}
