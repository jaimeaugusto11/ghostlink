import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { password, durationMinutes = 30 } = await req.json();

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const chatId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    const expiresAt = Math.floor(Date.now() / 1000) + (durationMinutes * 60);

    const stmt = db.prepare('INSERT INTO chats (id, password_hash, expires_at) VALUES (?, ?, ?)');
    stmt.run(chatId, passwordHash, expiresAt);

    return NextResponse.json({
      chatId,
      accessLink: `/chat/${chatId}`,
      expiresAt,
    });
  } catch (error) {
    console.error('Error creating chat:', error);
    return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 });
  }
}
