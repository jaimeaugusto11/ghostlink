'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, arrayUnion, getDoc, increment, deleteDoc, setDoc } from 'firebase/firestore';
import { generateCodename } from '@/utils/codenames';
import { UploadButton } from '@/utils/uploadthing';
import "@uploadthing/react/styles.css";

interface Message {
  id: string;
  senderId: string;
  senderName?: string;
  type: 'text' | 'image' | 'video';
  content: string;
  createdAt: any; // Firestore Timestamp
  viewOnce: boolean;
  timeLeft: number;
  reactions?: Record<string, string[]>;
}

export default function ChatPage() {
  const { id: chatId } = useParams();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{id: string, name: string}[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [msgExpiry, setMsgExpiry] = useState(900);
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  
  // Persistent User Identity (Session Storage or Generated)
  const [userId] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(`user_id_${chatId}`);
      if (stored) return stored;
      const newId = Math.random().toString(36).substring(7);
      sessionStorage.setItem(`user_id_${chatId}`, newId);
      return newId;
    }
    return Math.random().toString(36).substring(7);
  });

  const [userName] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(`user_name_${chatId}`);
      if (stored) return stored;
      const newName = generateCodename();
      sessionStorage.setItem(`user_name_${chatId}`, newName);
      return newName;
    }
    return 'Anonymous';
  });

  const [isValidating, setIsValidating] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Access Validation & Security Listeners
  useEffect(() => {
    const handleFocus = () => setIsWindowFocused(true);
    const handleBlur = () => setIsWindowFocused(false);
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    const checkAccess = async () => {
      const pwd = sessionStorage.getItem(`chat_pwd_${chatId}`);
      if (!pwd) {
        router.push('/');
        return;
      }

      // Verify chat existence mainly
      try {
        const chatDoc = await getDoc(doc(db, 'chats', chatId as string));
        if (chatDoc.exists()) {
           const data = chatDoc.data();
           setMsgExpiry(data.messageExpirySeconds || 900);
        } else {
           alert('Chat not found or expired');
           router.push('/');
           return;
        }
        setIsValidating(false);

        // Request Notification Permission
        if (typeof window !== 'undefined' && 'Notification' in window) {
          if (Notification.permission === 'default') {
            await Notification.requestPermission();
          }
        }
      } catch (e) {
        console.error("Access error", e);
      }
    };
    checkAccess();
  }, [chatId, router]);

  // Real-time Messages
  useEffect(() => {
    if (isValidating) return;

    // Subscribe to messages
    const q = query(
      collection(db, 'chats', chatId as string, 'messages'), 
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          // Notify if tab is hidden and message is not from current user
          if (
            document.hidden && 
            data.senderId !== userId && 
            data.createdAt // Ensure it's not the local optimistic addition
          ) {
            new Notification(`GhostLink: ${data.senderName || 'Anonymous'}`, {
              body: data.type === 'text' ? data.content : 'Shared an image/video',
              icon: '/favicon.ico'
            });
          }
        }
      });

      const msgs = snapshot.docs.map(doc => {
        const data = doc.data();
        
        // Calculate timeLeft based on server timestamp if available
        let timeLeft = msgExpiry;
        if (data.createdAt) {
          const secondsElapsed = Math.floor((Date.now() - data.createdAt.toMillis()) / 1000);
          timeLeft = Math.max(0, msgExpiry - secondsElapsed);
        }

        return {
          id: doc.id,
          ...data,
          timeLeft
        };
      }) as Message[];
      
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [chatId, isValidating]);

  // Typing Status Sync
  useEffect(() => {
    if (isValidating) return;

    const typingRef = doc(db, 'chats', chatId as string, 'typing', userId);

    if (isTyping) {
      setDoc(typingRef, {
        name: userName,
        updatedAt: serverTimestamp()
      }).catch(err => console.error("Error setting typing status:", err));
    } else {
      deleteDoc(typingRef).catch(err => console.error("Error clearing typing status:", err));
    }

    // Cleanup on unmount
    return () => {
      deleteDoc(typingRef).catch(() => {});
    };
  }, [isTyping, chatId, userId, userName, isValidating]);

  // Listen for other typing users
  useEffect(() => {
    if (isValidating) return;

    const q = collection(db, 'chats', chatId as string, 'typing');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs
        .filter(doc => doc.id !== userId)
        .map(doc => ({ id: doc.id, name: doc.data().name }));
      setTypingUsers(users);
    });

    return () => unsubscribe();
  }, [chatId, userId, isValidating]);

  // Timer Effect & Deletion
  useEffect(() => {
    const timer = setInterval(() => {
      setMessages((prev) => {
        // Prepare to delete expired messages
        prev.forEach((m) => {
           if (m.timeLeft <= 1 && m.id) {
               // Trigger deletion in Firestore
               deleteDoc(doc(db, 'chats', chatId as string, 'messages', m.id))
                 .catch(err => console.error("Error auto-deleting:", err));
           }
        });

        return prev.map((m) => {
           return { ...m, timeLeft: m.timeLeft - 1 };
        }).filter((m) => m.timeLeft > 0);
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [chatId]);

  // Improved Scroll
  useEffect(() => {
    if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]); // Only scroll on new messages count change

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    try {
      // Haptic Feedback
      if (typeof window !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10);
      }
      
      await addDoc(collection(db, 'chats', chatId as string, 'messages'), {
        senderId: userId,
        senderName: userName,
        type: 'text',
        content: inputText,
        createdAt: serverTimestamp(),
        viewOnce: false,
        timeLeft: msgExpiry,
        reactions: {}
      });
      setInputText('');
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const sendImageMessage = async (url: string) => {
    try {
      await addDoc(collection(db, 'chats', chatId as string, 'messages'), {
        senderId: userId,
        senderName: userName,
        type: 'image',
        content: url,
        createdAt: serverTimestamp(),
        viewOnce: false,
        timeLeft: msgExpiry,
        reactions: {}
      });
    } catch (err) {
      console.error("Error sending image message:", err);
    }
  };

  const addReaction = async (messageId: string, emoji: string) => {
     try {
       const msgRef = doc(db, 'chats', chatId as string, 'messages', messageId);
       
       await updateDoc(msgRef, {
         [`reactions.${emoji}`]: arrayUnion(userName) // Use Name instead of ID for display context? Or keep ID? kept Name for simpler display maybe? usually ID is better but let's use ID for consistency.
         // Actually arrayUnion(userId) is better for unique reaction per user.
         // kept userId here.
       });
       
       // Note: Updating reactions logic to use arrayUnion(userId) is correct.
       // However, to show WHO reacted, we might need names.
       // For now, simple count or just showing reaction is enough.
       // Let's stick to userId.
       
       await updateDoc(msgRef, {
          [`reactions.${emoji}`]: arrayUnion(userId)
       });

     } catch (err) {
       console.error("Error adding reaction:", err);
     }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isValidating) {
    return <div className="min-h-screen flex items-center justify-center bg-deep-void text-primary font-mono">Authenticating...</div>;
  }

  return (
    <div className={`flex flex-col h-[100dvh] overflow-hidden bg-deep-void no-print secure-content ${!isWindowFocused ? 'blur-md' : ''}`}>
      {!isWindowFocused && (
        <div className="no-screenshot-overlay">
          <div className="text-center p-8 bg-surface-dark rounded-2xl border border-primary/20 shadow-2xl">
            <span className="material-icons text-primary text-5xl mb-4">visibility_off</span>
            <h2 className="text-xl font-bold">Privacy Mode</h2>
            <p className="text-slate-400 text-sm mt-2">Content hidden for security</p>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="glass-panel z-50 px-4 md:px-6 py-3 flex items-center justify-between shadow-xl relative backdrop-blur-xl border-b border-primary/10">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/5 border border-primary/20">
            <span className="material-icons-round text-primary text-2xl animate-pulse-slow">leak_add</span>
          </div>
          <div>
            <h1 className="font-bold text-base md:text-lg tracking-tight leading-none text-white">GhostLink</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <p className="text-[10px] text-primary/50 font-mono tracking-tighter">#{chatId?.toString().substring(0, 6).toUpperCase()}</p>
              <span className="w-1 h-1 rounded-full bg-slate-700"></span>
              <p className="text-[10px] text-primary font-bold">{userName}</p>
            </div>
          </div>
        </div>
        
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={async () => {
            try {
               const chatRef = doc(db, 'chats', chatId as string);
               await updateDoc(chatRef, { currentUsers: increment(-1) });
            } catch(e) { console.error("Error leaving", e); }
            sessionStorage.removeItem(`chat_pwd_${chatId}`);
            router.push('/');
          }}
          className="flex items-center justify-center w-10 h-10 md:w-auto md:px-4 md:py-2 text-red-500 hover:text-red-400 transition-all border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 rounded-xl"
          title="Leave Chat"
        >
          <span className="material-icons-round text-xl">logout</span>
          <span className="hidden md:inline ml-2 text-sm font-medium">Leave</span>
        </motion.button>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
        <div className="max-w-4xl mx-auto flex flex-col gap-8">
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: msg.senderId === userId ? 10 : -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                className={`flex flex-col ${msg.senderId === userId ? 'items-end' : 'items-start'}`}
              >
                <div className={`flex flex-col ${msg.senderId === userId ? 'items-end' : 'items-start'} max-w-[90%] md:max-w-[75%] group relative`}>
                  
                  {/* Sender Name Label */}
                  <span className={`text-[10px] uppercase font-bold tracking-wider mb-1 px-1 ${
                    msg.senderId === userId ? 'text-primary/70' : 'text-slate-500'
                  }`}>
                    {msg.senderName || 'Anonymous'}
                  </span>

                  <div className={`relative p-4 rounded-xl shadow-lg border transition-all duration-300 ${
                    msg.senderId === userId 
                      ? 'bg-primary/10 border-primary/30 text-white rounded-tr-none' 
                      : 'bg-surface-dark border-gray-700/50 text-gray-200 rounded-tl-none'
                  }`}>
                    {msg.type === 'image' ? (
                      <img 
                        src={msg.content} 
                        alt="Shared content" 
                        onContextMenu={(e) => e.preventDefault()}
                        draggable={false}
                        className="rounded-lg max-h-[50svh] md:max-h-96 w-auto max-w-full object-contain select-none pointer-events-none" 
                      />
                    ) : (
                      <p className="text-xs md:text-base leading-relaxed break-words">{msg.content}</p>
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
                  <div className={`absolute -top-4 ${msg.senderId === userId ? 'right-0' : 'left-0'} opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-surface-dark/90 p-1 rounded-lg border border-slate-700 shadow-xl z-20`}>
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

                  <div className={`absolute ${msg.senderId === userId ? '-left-14' : '-right-14'} top-8 flex flex-col items-center gap-0.5 text-[10px] font-mono font-bold opacity-50 ${
                    msg.timeLeft < 60 ? 'text-red-400' : 'text-primary'
                  }`}>
                    <span className="material-icons-round text-xs">timer</span>
                    {formatTime(msg.timeLeft)}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {/* Typing Indicator UI */}
          <div className="flex flex-col gap-1 min-h-[1.5rem]">
            {typingUsers.map(user => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-primary/60 text-[10px] font-mono"
              >
                <div className="flex gap-0.5">
                  <span className="dot animate-bounce">.</span>
                  <span className="dot animate-bounce [animation-delay:0.2s]">.</span>
                  <span className="dot animate-bounce [animation-delay:0.4s]">.</span>
                </div>
                <span>{user.name} is typing...</span>
              </motion.div>
            ))}
          </div>

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Footer */}
      <footer className="z-50 px-3 md:px-6 pb-4 md:pb-8 pt-2 relative mobile-safe-bottom">
        <div className="max-w-4xl mx-auto">
          <div className="glass-panel rounded-2xl p-1.5 flex items-center gap-2 shadow-2xl border border-white/5">
            <div className="flex items-center justify-center">
              <UploadButton
                endpoint="imageUploader"
                onClientUploadComplete={(res) => {
                  res.forEach(file => sendImageMessage(file.url));
                }}
                onUploadError={(error: Error) => {
                  alert(`Upload error: ${error.message}`);
                }}
                appearance={{
                  button: "ut-uploading:cursor-not-allowed bg-white/5 hover:bg-white/10 text-primary w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center transition-all p-0 border border-white/10 shadow-inner",
                  allowedContent: "hidden",
                }}
                content={{
                  button: <span className="material-icons-round text-2xl">add_photo_alternate</span>,
                }}
              />
            </div>
            
            <form 
              onSubmit={(e) => sendMessage(e)} 
              className="flex-1 flex items-center gap-2 bg-black/40 rounded-xl px-3 py-1 border border-white/5 focus-within:border-primary/30 transition-all"
            >
              <input
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  if (!isTyping) setIsTyping(true);
                  if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                  typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                    setIsTyping(false);
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                  }
                }}
                onFocus={() => {
                  setTimeout(() => {
                    if (messagesEndRef.current) {
                      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
                    }
                  }, 300);
                }}
                className="flex-1 bg-transparent border-none text-white placeholder-slate-500 focus:ring-0 text-sm md:text-base py-2 font-sans"
                placeholder="Type a message..."
                autoComplete="off"
              />
              
              <motion.button 
                whileTap={{ scale: 0.9 }}
                type="submit" 
                disabled={!inputText.trim()}
                className="bg-primary hover:bg-primary-light disabled:bg-slate-800 disabled:opacity-30 text-background-dark w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center shadow-lg transition-all"
              >
                <span className="material-icons-round text-2xl">send</span>
              </motion.button>
            </form>
          </div>
          <p className="text-[9px] text-center text-slate-600 uppercase tracking-[0.2em] font-mono mt-2 opacity-50">
            Secure Encrypted Node
          </p>
        </div>
      </footer>
    </div>
  );
}
