/**
 * Socket.IO Server Configuration for Real-time Chat
 * This file sets up the WebSocket server for real-time messaging
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { prisma } from './prisma';

interface AuthenticatedSocket extends Socket {
  odpsUserId?: string;
  sessionId?: string;
}

export function initSocketServer(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    path: '/api/socket',
    cors: {
      origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      // Verify token and get user
      // In production, verify JWT token properly
      const odpsUserId = token; // Simplified for demo
      socket.odpsUserId = odpsUserId;

      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  // Connection handling
  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User connected: ${socket.odpsUserId}`);

    // Join a chat session room
    socket.on('join:session', async ({ sessionId }) => {
      socket.sessionId = sessionId;
      socket.join(`session:${sessionId}`);

      // Notify others in the session
      socket.to(`session:${sessionId}`).emit('user:joined', {
        odpsUserId: socket.odpsUserId,
        sessionId,
      });

      // Load previous messages
      try {
        const messages = await prisma.message.findMany({
          where: { sessionId },
          orderBy: { createdAt: 'asc' },
          take: 100,
        });

        socket.emit('messages:history', { messages });
      } catch (error) {
        console.error('Failed to load message history:', error);
      }
    });

    // Leave a chat session room
    socket.on('leave:session', ({ sessionId }) => {
      socket.leave(`session:${sessionId}`);
      socket.to(`session:${sessionId}`).emit('user:left', {
        odpsUserId: socket.odpsUserId,
        sessionId,
      });
    });

    // Send a message
    socket.on('message:send', async ({ sessionId, content }) => {
      if (!socket.odpsUserId || !sessionId) return;

      try {
        // Store user message
        const userMessage = await prisma.message.create({
          data: {
            sessionId,
            userId: socket.odpsUserId,
            type: 'USER',
            content,
          },
        });

        // Broadcast to session
        io.to(`session:${sessionId}`).emit('message:new', userMessage);

        // Trigger AI response
        triggerAIResponse(io, sessionId, content, socket.odpsUserId);
      } catch (error) {
        console.error('Failed to send message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicators
    socket.on('user:typing', ({ sessionId }) => {
      socket.to(`session:${sessionId}`).emit('user:typing', {
        odpsUserId: socket.odpsUserId,
        userName: 'User', // Get from session in production
      });
    });

    socket.on('user:stopped-typing', ({ sessionId }) => {
      socket.to(`session:${sessionId}`).emit('user:stopped-typing', {
        odpsUserId: socket.odpsUserId,
      });
    });

    // Disconnect handling
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.odpsUserId}`);

      if (socket.sessionId) {
        socket.to(`session:${socket.sessionId}`).emit('user:left', {
          odpsUserId: socket.odpsUserId,
        });
      }
    });
  });

  return io;
}

// Trigger AI response with streaming
async function triggerAIResponse(
  io: SocketIOServer,
  sessionId: string,
  userMessage: string,
  odpsUserId: string
) {
  const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

  try {
    // Get conversation history
    const history = await prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    const messages = history.map((m) => ({
      role: m.type === 'USER' ? 'user' : 'assistant',
      content: m.content,
    }));

    // Create placeholder for AI response
    const aiMessage = await prisma.message.create({
      data: {
        sessionId,
        userId: odpsUserId,
        type: 'AI',
        content: '',
      },
    });

    // Notify clients that AI is responding
    io.to(`session:${sessionId}`).emit('message:new', {
      ...aiMessage,
      streaming: true,
    });

    // Call AI service with streaming
    const response = await fetch(`${AI_SERVICE_URL}/api/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        stream: true,
        session_id: sessionId,
      }),
    });

    if (!response.ok) {
      throw new Error('AI service error');
    }

    // Handle streaming response
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullContent += parsed.content;

              // Stream to clients
              io.to(`session:${sessionId}`).emit('message:stream', {
                messageId: aiMessage.id,
                content: parsed.content,
              });
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }

    // Update message with full content
    await prisma.message.update({
      where: { id: aiMessage.id },
      data: { content: fullContent },
    });

    // Notify completion
    io.to(`session:${sessionId}`).emit('message:complete', {
      messageId: aiMessage.id,
    });

  } catch (error) {
    console.error('AI response error:', error);

    // Send error message
    io.to(`session:${sessionId}`).emit('message:error', {
      error: 'Failed to get AI response',
    });
  }
}

export default initSocketServer;
