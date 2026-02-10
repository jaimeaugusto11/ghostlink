import Database from 'better-sqlite3';
import * as path from 'path';

const dbPath = path.join(process.cwd(), 'database.sqlite');
const db = new Database(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    max_users INTEGER DEFAULT 2,
    current_users INTEGER DEFAULT 0,
    failed_attempts INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    type TEXT NOT NULL, -- 'text', 'image', 'video'
    content TEXT,
    expires_at INTEGER,
    view_once BOOLEAN DEFAULT 0,
    viewed BOOLEAN DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
  );
`);

export default db;

export interface Chat {
  id: string;
  password_hash: string;
  expires_at: number;
  max_users: number;
  current_users: number;
  failed_attempts: number;
  created_at: number;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  type: 'text' | 'image' | 'video';
  content: string;
  expires_at?: number;
  view_once: boolean;
  viewed: boolean;
  created_at: number;
}
