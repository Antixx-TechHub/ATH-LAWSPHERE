import axios from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

// API base URLs
const API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://ath-lawsphere.antixxtechhub.in';
const AI_API_URL = Constants.expoConfig?.extra?.aiApiUrl || 'https://ai-service-production-870d.up.railway.app';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const aiApi = axios.create({
  baseURL: AI_API_URL,
  timeout: 60000, // Longer timeout for AI responses
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, clear auth state
      await SecureStore.deleteItemAsync('auth_token');
    }
    return Promise.reject(error);
  }
);

// AI API interceptor
aiApi.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// API service functions
export const authService = {
  login: (email: string, password: string) =>
    api.post('/api/auth/mobile-login', { email, password }),
  
  register: (email: string, password: string, name: string) =>
    api.post('/api/auth/register', { email, password, name }),
  
  forgotPassword: (email: string) =>
    api.post('/api/auth/forgot-password', { email }),
  
  me: () => api.get('/api/auth/me'),
};

export const chatService = {
  sendMessage: (message: string, sessionId?: string) =>
    aiApi.post('/api/v1/chat', { message, session_id: sessionId }),
  
  getSessions: () => api.get('/api/chat/sessions'),
  
  getSession: (id: string) => api.get(`/api/chat/sessions/${id}`),
  
  createSession: (name: string) =>
    api.post('/api/chat/sessions', { name }),
};

export const filesService = {
  getFiles: () => api.get('/api/files'),
  
  uploadFile: (formData: FormData) =>
    api.post('/api/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  
  deleteFile: (id: string) => api.delete(`/api/files/${id}`),
};

export const notesService = {
  getNotes: () => api.get('/api/notes'),
  
  createNote: (title: string, content: string) =>
    api.post('/api/notes', { title, content }),
  
  updateNote: (id: string, title: string, content: string) =>
    api.put(`/api/notes/${id}`, { title, content }),
  
  deleteNote: (id: string) => api.delete(`/api/notes/${id}`),
};

export const knowledgeService = {
  getGraphs: () => api.get('/api/knowledge-graph'),
  
  getGraph: (id: string) => api.get(`/api/knowledge-graph/${id}`),
  
  generateGraph: (text: string) =>
    aiApi.post('/api/v1/knowledge-graph', { text }),
};
