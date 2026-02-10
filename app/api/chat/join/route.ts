import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    
    if (!body) {
      return NextResponse.json({ error: 'Corpo da requisição inválido' }, { status: 400 });
    }

    const { chatId, password } = body;

    if (!chatId || !password) {
      return NextResponse.json({ error: 'Chat ID e senha são obrigatórios' }, { status: 400 });
    }

    const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(chatId) as any;

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Check if expired
    if (chat.expires_at < Math.floor(Date.now() / 1000)) {
      db.prepare('DELETE FROM chats WHERE id = ?').run(chatId);
      return NextResponse.json({ error: 'Chat has expired' }, { status: 410 });
    }

    // Check failed attempts
    if (chat.failed_attempts >= 3) {
      return NextResponse.json({ error: 'Chat locked due to too many failed attempts' }, { status: 403 });
    }

    // Check user count - only block if strictly full
    if (chat.current_users >= chat.max_users) {
      // In a real app we might allow re-entry of the same user if they refreshed
      // For now let's just ensure the limit is sane
      return NextResponse.json({ error: 'Sessão está cheia (máx 2 usuários)' }, { status: 403 });
    }

    const passwordMatch = await bcrypt.compare(password, chat.password_hash);

    if (!passwordMatch) {
      db.prepare('UPDATE chats SET failed_attempts = failed_attempts + 1 WHERE id = ?').run(chatId);
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Successfully validated
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error joining chat:', error);
    return NextResponse.json({ error: 'Failed to join chat' }, { status: 500 });
  }
}
