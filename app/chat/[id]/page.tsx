'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  senderId: string;
  type: 'text' | 'image' | 'video';
  content: string;
  expiresAt: number;
  viewOnce: boolean;
  timeLeft: number;
  reactions?: Record<string, string[]>;
}

export default function ChatPage() {
  const { id: chatId } = useParams();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[] & { reactions?: Record<string, string[]> }[]>([]);
  const [inputText, setInputText] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [userId] = useState(() => Math.random().toString(36).substring(7));
  const [isValidating, setIsValidating] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Access Validation
  useEffect(() => {
    const pwd = sessionStorage.getItem(`chat_pwd_${chatId}`);
    if (!pwd) {
      router.push('/');
    } else {
      setIsValidating(false);
    }
  }, [chatId, router]);

  useEffect(() => {
    if (isValidating) return;

    // Explicitly connect to the same host/port to avoid auto-discovery issues
    const socketUrl = window.location.origin;
    const newSocket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });
    
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket connected successfully:', newSocket.id);
      newSocket.emit('join-chat', chatId);
    });

    newSocket.on('connect_error', (err: any) => {
      console.error('Socket connection error:', err);
    });

    newSocket.on('error', (err: any) => {
      console.error('Socket business error:', err.message);
      if (err.message === 'Sessão não encontrada') {
        alert('Sessão não encontrada ou expirada.');
        router.push('/');
      }
    });

    newSocket.on('new-message', (msg: any) => {
      console.log('New message received:', msg);
      setMessages((prev) => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, { ...msg, timeLeft: 60, reactions: {} }];
      });
    });

    newSocket.on('message-reaction', (data: { messageId: string, emoji: string, userId: string }) => {
      setMessages((prev) => prev.map(m => {
        if (m.id === data.messageId) {
          const reactions = { ...(m.reactions || {}) };
          if (!reactions[data.emoji]) reactions[data.emoji] = [];
          if (!reactions[data.emoji].includes(data.userId)) {
            reactions[data.emoji].push(data.userId);
          }
          return { ...m, reactions };
        }
        return m;
      }));
    });

    newSocket.on('delete-message', (messageId: string) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    });

    return () => {
      newSocket.disconnect();
    };
  }, [chatId, isValidating]);

  useEffect(() => {
    const timer = setInterval(() => {
      setMessages((prev) => 
        prev.map((m) => ({ ...m, timeLeft: m.timeLeft - 1 }))
            .filter((m) => m.timeLeft > 0)
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !socket) return;

    const msg = {
      id: Math.random().toString(36).substring(7),
      senderId: userId,
      type: 'text',
      content: inputText,
      expiresAt: Date.now() + 60000,
      viewOnce: false,
      timeLeft: 60,
      reactions: {}
    };

    socket.emit('send-message', { ...msg, chatId });
    setInputText('');
  };

  const addReaction = (messageId: string, emoji: string) => {
    if (!socket) return;
    socket.emit('add-reaction', { chatId, messageId, emoji, userId });
  };

  if (isValidating) {
    return <div className="min-h-screen flex items-center justify-center bg-deep-void text-primary font-mono">Authenticating...</div>;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-deep-void">
      {/* Header */}
      <header className="glass-panel z-50 px-6 py-4 flex items-center justify-between shadow-lg relative">
        <div className="flex items-center gap-3">
          <span className="material-icons-round text-primary text-3xl animate-pulse-slow">leak_add</span>
          <div>
            <h1 className="font-bold text-lg tracking-tight leading-none text-white">GhostLink</h1>
            <p className="text-xs text-primary/60 font-mono tracking-wider">#{chatId?.toString().substring(0, 8).toUpperCase()}</p>
          </div>
        </div>
        <button 
          onClick={() => {
            sessionStorage.removeItem(`chat_pwd_${chatId}`);
            router.push('/');
          }}
          className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors text-sm font-medium border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 px-4 py-2 rounded-lg"
        >
          <span className="material-icons-round text-sm">logout</span>
          Leave Chat
        </button>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
        <div className="max-w-4xl mx-auto flex flex-col gap-8">
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: msg.senderId === userId ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
                className={`flex flex-col ${msg.senderId === userId ? 'items-end' : 'items-start'}`}
              >
                <div className={`relative max-w-[85%] group`}>
                  <div className={`p-4 rounded-xl shadow-lg border transition-all duration-300 ${
                    msg.senderId === userId 
                      ? 'bg-primary/10 border-primary/30 text-white rounded-tr-none' 
                      : 'bg-surface-dark border-gray-700/50 text-gray-200 rounded-tl-none'
                  }`}>
                    {msg.type === 'image' ? (
                      <img src={msg.content} alt="Shared content" className="rounded-lg max-h-60 max-w-full object-cover" />
                    ) : (
                      <p className="text-sm md:text-base leading-relaxed break-words">{msg.content}</p>
                    )}
                    
                    {/* Reactions Display */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(msg.reactions).map(([emoji, users]) => (
                          <span key={emoji} className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-background-dark/80 border border-slate-700 text-[10px] space-x-1">
                            <span>{emoji}</span>
                            <span className="text-primary/70">{users.length}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Reaction Button - Hidden by default, shows on hover */}
                  <div className={`absolute -top-4 ${msg.senderId === userId ? 'right-0' : 'left-0'} opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-surface-dark/90 p-1 rounded-lg border border-slate-700 shadow-xl z-10`}>
                    {['👍', '🔥', '😂', '😮', '😢'].map(emoji => (
                      <button 
                        key={emoji}
                        onClick={() => addReaction(msg.id, emoji)}
                        className="hover:scale-125 transition-transform p-0.5"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  {/* Timer */}
                  <div className={`absolute ${msg.senderId === userId ? '-left-14' : '-right-14'} top-1 flex flex-col items-center gap-0.5 text-[10px] font-mono font-bold opacity-50 ${
                    msg.timeLeft < 10 ? 'text-red-400' : 'text-primary'
                  }`}>
                    <span className="material-icons-round text-xs">timer</span>
                    {msg.timeLeft}s
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Footer */}
      <footer className="z-50 px-4 md:px-8 py-6 relative">
        <div className="max-w-4xl mx-auto flex flex-col gap-2">
          <form 
            onSubmit={(e) => sendMessage(e)} 
            className="flex items-center gap-3 bg-surface-dark border border-gray-700 rounded-xl p-2 shadow-2xl focus-within:border-primary/50 transition-all"
          >
            <button type="button" className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-white group">
              <span className="material-icons-round group-hover:rotate-90 transition-transform">add</span>
            </button>
            <div className="w-[1px] h-6 bg-gray-700"></div>
            <input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              className="flex-1 bg-transparent border-none text-white placeholder-gray-500 focus:ring-0 text-sm md:text-base p-0"
              placeholder="Type a self-destructing message..."
              autoComplete="off"
            />
            <button 
              type="submit" 
              disabled={!inputText.trim()}
              className="bg-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-400 text-background-dark w-10 h-10 rounded-lg flex items-center justify-center shadow-lg transform active:scale-95 transition-all"
            >
              <span className="material-icons-round -mr-1">send</span>
            </button>
          </form>
          <p className="text-[10px] text-center text-slate-600 uppercase tracking-widest font-mono">Press Enter to send</p>
        </div>
      </footer>
    </div>
  );
}
