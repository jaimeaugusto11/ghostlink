'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';

export default function JoinPage() {
  const { id: chatId } = useParams();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [chatExists, setChatExists] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkChat = async () => {
      try {
        const chatSnap = await getDoc(doc(db, 'chats', chatId as string));
        setChatExists(chatSnap.exists());
      } catch (e) {
        setChatExists(false);
      }
    };
    checkChat();
  }, [chatId]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const chatRef = doc(db, 'chats', chatId as string);
      const chatSnap = await getDoc(chatRef);
      const chatData = chatSnap.data();

      if (!chatSnap.exists() || (chatData?.expiresAt && chatData.expiresAt.toMillis() < Date.now())) {
        setError('Sessão expirada ou não encontrada.');
        setLoading(false);
        return;
      }

      if (chatData?.password !== password.trim()) {
        setError('Senha incorreta.');
        setLoading(false);
        return;
      }

      await updateDoc(chatRef, { currentUsers: increment(1) });
      sessionStorage.setItem(`chat_pwd_${chatId}`, password.trim());
      router.push(`/chat/${chatId}`);
    } catch (err: any) {
      setError('Erro ao entrar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (chatExists === false) {
    return (
      <div className="min-h-screen bg-deep-void flex items-center justify-center p-4">
        <div className="glass-panel p-8 text-center rounded-xl max-w-sm w-full">
          <span className="material-icons text-red-500 text-5xl mb-4">error_outline</span>
          <h1 className="text-xl font-bold text-white mb-2">Sessão Inválida</h1>
          <p className="text-slate-400 text-sm mb-6">Esta sessão não existe ou já expirou.</p>
          <button onClick={() => router.push('/')} className="w-full py-3 bg-primary/20 text-primary border border-primary/30 rounded-lg hover:bg-primary/30 transition-all font-bold">
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-[100svh] bg-deep-void flex items-center justify-center p-4">
      <div className="absolute top-0 left-0 w-full h-full scanlines opacity-20 pointer-events-none z-0"></div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel p-8 md:p-10 rounded-xl max-w-sm w-full relative z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 mb-4">
            <span className="material-icons text-primary">lock</span>
          </div>
          <h1 className="text-2xl font-bold text-white">GhostLink</h1>
          <p className="text-slate-400 text-xs font-mono mt-1">Sessão #{chatId?.toString().substring(0, 8).toUpperCase()}</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 pl-1">Senha da Sessão</label>
            <div className="relative group">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Insira a Senha"
                autoFocus
                className="w-full bg-background-dark border border-slate-700/50 rounded-lg px-4 py-3 md:py-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-primary transition-colors"
               >
                <span className="material-icons text-lg">{showPassword ? "visibility_off" : "visibility"}</span>
              </button>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={loading || !password}
            className="w-full h-12 md:h-14 bg-primary hover:bg-primary-light text-background-dark font-bold rounded-lg shadow-lg transition-all flex items-center justify-center gap-2"
          >
             {loading ? "Verificando..." : "Entrar na Sessão"}
             <span className="material-icons text-sm">login</span>
          </motion.button>
        </form>

        {error && <p className="mt-4 text-center text-red-400 text-xs font-mono bg-red-500/10 p-2 rounded">{error}</p>}
        
        <p className="mt-8 text-center text-[10px] text-slate-600 uppercase tracking-widest font-mono">
          Decifragem de ponta a ponta
        </p>
      </motion.div>
    </main>
  );
}
