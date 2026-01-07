import { create } from 'zustand';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  sessionId: string | null;
  
  // Actions
  addMessage: (message: Message) => void;
  setLoading: (loading: boolean) => void;
  setSessionId: (id: string | null) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,
  sessionId: null,

  addMessage: (message) => 
    set((state) => ({ messages: [...state.messages, message] })),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setSessionId: (sessionId) => set({ sessionId }),
  
  clearChat: () => set({ messages: [], sessionId: null }),
}));
