/**
 * Custom Next.js Server with Socket.IO
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
// Use 0.0.0.0 in production to accept external connections (required for Railway/Docker)
const hostname = process.env.HOSTNAME || (dev ? 'localhost' : '0.0.0.0');
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Initialize Socket.IO
  const { Server } = require('socket.io');
  const io = new Server(server, {
    path: '/api/socket',
    cors: {
      origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Socket.IO event handling
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join:session', ({ sessionId }) => {
      socket.join(`session:${sessionId}`);
      console.log(`Socket ${socket.id} joined session ${sessionId}`);
    });

    socket.on('leave:session', ({ sessionId }) => {
      socket.leave(`session:${sessionId}`);
    });

    socket.on('message:send', async ({ sessionId, content }) => {
      // Broadcast to session room
      io.to(`session:${sessionId}`).emit('message:new', {
        id: `msg-${Date.now()}`,
        role: 'user',
        content,
        sessionId,
        createdAt: new Date(),
      });

      // Trigger AI response (simplified)
      setTimeout(() => {
        io.to(`session:${sessionId}`).emit('message:new', {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: 'I received your message. This is a demo response.',
          sessionId,
          createdAt: new Date(),
        });
      }, 1000);
    });

    socket.on('user:typing', ({ sessionId }) => {
      socket.to(`session:${sessionId}`).emit('user:typing', {
        userId: socket.id,
        userName: 'User',
      });
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // Bind to hostname (0.0.0.0 in production for external access)
  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
