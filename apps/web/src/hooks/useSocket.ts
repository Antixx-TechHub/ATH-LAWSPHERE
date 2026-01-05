/**
 * Socket.IO Client Hook for Real-time Chat
 */

import { useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';
import { create } from 'zustand';

// Types
interface Message {
  id: string;
  type: 'USER' | 'AI' | 'SYSTEM';
  content: string;
  createdAt: Date;
  sessionId: string;
  streaming?: boolean;
}

interface TypingUser {
  odpsUserId: string;
  userName: string;
}

interface SocketState {
  isConnected: boolean;
  messages: Message[];
  typingUsers: TypingUser[];
  addMessage: (message: Message) => void;
  updateMessage: (id: string, content: string) => void;
  setMessages: (messages: Message[]) => void;
  setConnected: (connected: boolean) => void;
  addTypingUser: (user: TypingUser) => void;
  removeTypingUser: (odpsUserId: string) => void;
  clearMessages: () => void;
}

// Zustand store for socket state
export const useSocketStore = create<SocketState>((set) => ({
  isConnected: false,
  messages: [],
  typingUsers: [],
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  updateMessage: (id, content) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + content, streaming: true } : m
      ),
    })),
  setMessages: (messages) => set({ messages }),
  setConnected: (connected) => set({ isConnected: connected }),
  addTypingUser: (user) =>
    set((state) => ({
      typingUsers: [...state.typingUsers.filter((u) => u.odpsUserId !== user.odpsUserId), user],
    })),
  removeTypingUser: (odpsUserId) =>
    set((state) => ({
      typingUsers: state.typingUsers.filter((u) => u.odpsUserId !== odpsUserId),
    })),
  clearMessages: () => set({ messages: [], typingUsers: [] }),
}));

// Socket hook
export function useSocket(sessionId?: string) {
  const { data: session } = useSession();
  const socketRef = useRef<Socket | null>(null);
  const { setConnected, addMessage, updateMessage, addTypingUser, removeTypingUser } =
    useSocketStore();

  useEffect(() => {
    if (!session?.user) return;

    // Create socket connection
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || '', {
      path: '/api/socket',
      auth: {
        token: session.user.id,
      },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);

      // Join session room if provided
      if (sessionId) {
        socket.emit('join:session', { sessionId });
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Message events
    socket.on('message:new', (message: Message) => {
      addMessage({
        ...message,
        createdAt: new Date(message.createdAt),
      });
    });

    socket.on('message:stream', (data: { messageId: string; content: string }) => {
      updateMessage(data.messageId, data.content);
    });

    socket.on('message:complete', (_data: { messageId: string }) => {
      // Mark message as complete (stop streaming indicator)
    });

    // Typing events
    socket.on('user:typing', (user: TypingUser) => {
      addTypingUser(user);
    });

    socket.on('user:stopped-typing', (data: { odpsUserId: string }) => {
      removeTypingUser(data.odpsUserId);
    });

    // Cleanup
    return () => {
      if (sessionId) {
        socket.emit('leave:session', { sessionId });
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, [session, sessionId, setConnected, addMessage, updateMessage, addTypingUser, removeTypingUser]);

  // Send message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!socketRef.current || !sessionId) return;

      const message: Partial<Message> = {
        id: `temp-${Date.now()}`,
        type: 'USER',
        content,
        sessionId,
        createdAt: new Date(),
      };

      // Optimistically add message
      addMessage(message as Message);

      // Emit to server
      socketRef.current.emit('message:send', {
        sessionId,
        content,
      });
    },
    [sessionId, addMessage]
  );

  // Typing indicator
  const sendTypingIndicator = useCallback(
    (isTyping: boolean) => {
      if (!socketRef.current || !sessionId) return;

      if (isTyping) {
        socketRef.current.emit('user:typing', { sessionId });
      } else {
        socketRef.current.emit('user:stopped-typing', { sessionId });
      }
    },
    [sessionId]
  );

  return {
    socket: socketRef.current,
    sendMessage,
    sendTypingIndicator,
  };
}
