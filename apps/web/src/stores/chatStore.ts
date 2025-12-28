/**
 * Chat State Management with Zustand
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Types
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
  model?: string;
  tokens?: number;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
  model: string;
  matter?: {
    id: string;
    name: string;
  };
}

interface ChatState {
  // Sessions
  sessions: ChatSession[];
  activeSessionId: string | null;

  // Current session state
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;

  // Model selection
  selectedModel: string;

  // Actions
  createSession: (title?: string, matterId?: string) => ChatSession;
  deleteSession: (sessionId: string) => void;
  setActiveSession: (sessionId: string | null) => void;
  getActiveSession: () => ChatSession | null;

  addMessage: (sessionId: string, message: Omit<Message, 'id' | 'createdAt'>) => void;
  updateMessage: (sessionId: string, messageId: string, content: string) => void;
  clearMessages: (sessionId: string) => void;

  setLoading: (loading: boolean) => void;
  setStreaming: (streaming: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedModel: (model: string) => void;

  updateSessionTitle: (sessionId: string, title: string) => void;
}

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      // Initial state
      sessions: [],
      activeSessionId: null,
      isLoading: false,
      isStreaming: false,
      error: null,
      selectedModel: 'gpt-4o',

      // Create new session
      createSession: (title, matterId) => {
        const newSession: ChatSession = {
          id: generateId(),
          title: title || 'New Chat',
          createdAt: new Date(),
          updatedAt: new Date(),
          messages: [],
          model: get().selectedModel,
          matter: matterId ? { id: matterId, name: '' } : undefined,
        };

        set((state) => ({
          sessions: [newSession, ...state.sessions],
          activeSessionId: newSession.id,
        }));

        return newSession;
      },

      // Delete session
      deleteSession: (sessionId) => {
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== sessionId),
          activeSessionId:
            state.activeSessionId === sessionId ? null : state.activeSessionId,
        }));
      },

      // Set active session
      setActiveSession: (sessionId) => {
        set({ activeSessionId: sessionId, error: null });
      },

      // Get active session
      getActiveSession: () => {
        const state = get();
        return state.sessions.find((s) => s.id === state.activeSessionId) || null;
      },

      // Add message to session
      addMessage: (sessionId, message) => {
        const newMessage: Message = {
          ...message,
          id: generateId(),
          createdAt: new Date(),
        };

        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId
              ? {
                  ...session,
                  messages: [...session.messages, newMessage],
                  updatedAt: new Date(),
                }
              : session
          ),
        }));
      },

      // Update message content (for streaming)
      updateMessage: (sessionId, messageId, content) => {
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId
              ? {
                  ...session,
                  messages: session.messages.map((msg) =>
                    msg.id === messageId ? { ...msg, content } : msg
                  ),
                }
              : session
          ),
        }));
      },

      // Clear messages in session
      clearMessages: (sessionId) => {
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId
              ? { ...session, messages: [], updatedAt: new Date() }
              : session
          ),
        }));
      },

      // Loading state
      setLoading: (loading) => set({ isLoading: loading }),
      setStreaming: (streaming) => set({ isStreaming: streaming }),
      setError: (error) => set({ error }),
      setSelectedModel: (model) => set({ selectedModel: model }),

      // Update session title
      updateSessionTitle: (sessionId, title) => {
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId
              ? { ...session, title, updatedAt: new Date() }
              : session
          ),
        }));
      },
    }),
    {
      name: 'lawsphere-chat-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sessions: state.sessions.slice(0, 50), // Keep last 50 sessions
        selectedModel: state.selectedModel,
      }),
    }
  )
);
