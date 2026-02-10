const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_VALUE !== 'production';
const hostname = 'localhost';
const port = 3001;
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    path: '/socket.io'
  });

  const db = require('./lib/db-node');

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-chat', (chatId) => {
      try {
        const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(chatId);
        if (!chat) {
          socket.emit('error', { message: 'Sessão não encontrada' });
          return;
        }

        if (chat.current_users >= chat.max_users) {
          socket.emit('error', { message: 'Sessão cheia' });
          // Note: In real app, we might want to allow reconnecting users
        }

        socket.join(chatId);
        db.prepare('UPDATE chats SET current_users = current_users + 1 WHERE id = ?').run(chatId);
        console.log(`User ${socket.id} joined chat: ${chatId}`);

        socket.on('disconnect', () => {
          db.prepare('UPDATE chats SET current_users = MAX(0, current_users - 1) WHERE id = ?').run(chatId);
          console.log(`User ${socket.id} disconnected from: ${chatId}`);
        });
      } catch (err) {
        console.error('Join error:', err);
      }
    });

    socket.on('send-message', (data) => {
      console.log(`Sending message to ${data.chatId}:`, data.content);
      io.to(data.chatId).emit('new-message', data);
    });

    socket.on('add-reaction', (data) => {
      io.to(data.chatId).emit('message-reaction', data);
    });

    socket.on('typing', (data) => {
      socket.to(data.chatId).emit('user-typing', data);
    });

    socket.on('message-expired', (data) => {
      io.to(data.chatId).emit('delete-message', data.messageId);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Ensure your browser connects to port ${port}`);
  });
});
