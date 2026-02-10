import db from './db';
import * as fs from 'fs';
import * as path from 'path';

export function runCleanup() {
  const now = Math.floor(Date.now() / 1000);

  // 1. Delete expired chats
  const expiredChats = db.prepare('SELECT id FROM chats WHERE expires_at < ?').all() as { id: string }[];
  
  for (const chat of expiredChats) {
    // Before deleting the chat, delete its messages (cascade handles it, but good to be explicit for media)
    console.log(`Cleaning up expired chat: ${chat.id}`);
  }
  
  db.prepare('DELETE FROM chats WHERE expires_at < ?').run(now);

  // 2. Delete expired messages
  // (Assuming cascade delete on messages table if chat is deleted)
  // For individual message expiry (60s):
  db.prepare('DELETE FROM messages WHERE expires_at < ?').run(now);

  // 3. Clean up orphans or non-persisted media if any (placeholder for real file deletion)
  console.log('Cleanup job ran at:', new Date().toISOString());
}

// In a real environment, we'd run this every few minutes
// setInterval(runCleanup, 60000);
