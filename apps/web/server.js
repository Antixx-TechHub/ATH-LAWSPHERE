/**
 * Custom Next.js Server with Socket.IO
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);

// Debug logging for Railway
console.log(`[Server] Starting with NODE_ENV=${process.env.NODE_ENV}`);
console.log(`[Server] Will bind to port ${port}`);
console.log(`[Server] Process PID: ${process.pid}`);

// Catch uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('[Server] UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server] UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

// Don't pass hostname to next() - it can cause issues in production
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  console.log('[Server] Next.js app prepared, creating HTTP server...');
  
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

  // Explicitly bind to 0.0.0.0 for Docker/Railway (IPv4)
  server.listen(port, '0.0.0.0', () => {
    console.log(`[Server] HTTP server listening on 0.0.0.0:${port}`);
    console.log(`> Ready on http://0.0.0.0:${port}`);
    console.log(`[Server] Server is now accepting connections`);
  });

  server.on('error', (err) => {
    console.error('[Server] Server error:', err);
    process.exit(1);
  });

  // Keep process alive
  setInterval(() => {
    console.log(`[Server] Heartbeat - still running on port ${port}`);
  }, 30000);
}).catch((err) => {
  console.error('[Server] Failed to prepare Next.js app:', err);
  process.exit(1);
});
