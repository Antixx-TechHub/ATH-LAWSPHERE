/**
 * File Management Store with Zustand
 */

import { create } from 'zustand';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  progress: number;
  error?: string;
  uploadedAt: Date;
  processedAt?: Date;
  extractedText?: string;
  embedding?: boolean;
}

interface FileState {
  files: UploadedFile[];
  selectedFileId: string | null;
  isUploading: boolean;

  // Actions
  addFile: (file: Omit<UploadedFile, 'id' | 'uploadedAt'>) => string;
  updateFile: (id: string, updates: Partial<UploadedFile>) => void;
  removeFile: (id: string) => void;
  selectFile: (id: string | null) => void;
  setUploading: (uploading: boolean) => void;
  getSelectedFile: () => UploadedFile | null;
  clearFiles: () => void;
}

const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

export const useFileStore = create<FileState>((set, get) => ({
  files: [],
  selectedFileId: null,
  isUploading: false,

  addFile: (file) => {
    const id = generateId();
    const newFile: UploadedFile = {
      ...file,
      id,
      uploadedAt: new Date(),
    };

    set((state) => ({
      files: [...state.files, newFile],
    }));

    return id;
  },

  updateFile: (id, updates) => {
    set((state) => ({
      files: state.files.map((file) =>
        file.id === id ? { ...file, ...updates } : file
      ),
    }));
  },

  removeFile: (id) => {
    set((state) => ({
      files: state.files.filter((file) => file.id !== id),
      selectedFileId: state.selectedFileId === id ? null : state.selectedFileId,
    }));
  },

  selectFile: (id) => {
    set({ selectedFileId: id });
  },

  setUploading: (uploading) => {
    set({ isUploading: uploading });
  },

  getSelectedFile: () => {
    const state = get();
    return state.files.find((f) => f.id === state.selectedFileId) || null;
  },

  clearFiles: () => {
    set({ files: [], selectedFileId: null });
  },
}));
