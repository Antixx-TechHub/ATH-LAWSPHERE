/**
 * Files Page - Library
 * Displays all files uploaded by the user (from chat attachments and direct uploads)
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { DashboardLayout } from '../../../components/layout/dashboard-layout';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { useDropzone } from 'react-dropzone';
import { Loader2, Search, FileText, Image, Trash2, Download, RefreshCw } from 'lucide-react';

interface FileItem {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: string;
  createdAt: string;
  sessionId?: string;
  url?: string;
}

export default function FilesPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, { name: string; progress: number; error?: string }>>(new Map());

  const fetchFiles = useCallback(async () => {
    try {
      const response = await fetch('/api/files');
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
      }
    } catch (error) {
      console.error('Failed to fetch files:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setUploadingFiles(prev => new Map(prev).set(tempId, { name: file.name, progress: 0 }));

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/files', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          setUploadingFiles(prev => {
            const next = new Map(prev);
            next.delete(tempId);
            return next;
          });
          await fetchFiles();
        } else {
          const errorData = await response.json();
          setUploadingFiles(prev => {
            const next = new Map(prev);
            next.set(tempId, { name: file.name, progress: 100, error: errorData.error || 'Upload failed' });
            return next;
          });
        }
      } catch (error) {
        setUploadingFiles(prev => {
          const next = new Map(prev);
          next.set(tempId, { name: file.name, progress: 100, error: 'Upload failed' });
          return next;
        });
      }
    }
  }, [fetchFiles]);

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    try {
      const response = await fetch(`/api/files?id=${fileId}`, { method: 'DELETE' });
      if (response.ok) {
        setFiles(prev => prev.filter(f => f.id !== fileId));
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  };

  const handleDownload = async (fileId: string, filename: string) => {
    try {
      const response = await fetch(`/api/files/download?id=${fileId}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
    },
    maxSize: 50 * 1024 * 1024,
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'READY': return 'bg-green-500';
      case 'PROCESSING': return 'bg-yellow-500';
      case 'UPLOADING': return 'bg-blue-500';
      case 'ERROR': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType?.startsWith('image/')) return <Image className="h-5 w-5 text-purple-500" />;
    return <FileText className="h-5 w-5 text-blue-500" />;
  };

  const filteredFiles = files.filter(file =>
    file.filename?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.originalName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const uploadingArray = Array.from(uploadingFiles.entries()).map(([id, data]) => ({ id, ...data }));

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6 pb-16 md:pb-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-3xl font-serif font-bold tracking-tight">Library</h1>
            <p className="text-sm text-muted-foreground hidden sm:block">All your uploaded documents in one place</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { setIsLoading(true); fetchFiles(); }} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search files..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>

        <Card>
          <CardContent className="p-0">
            <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-6 md:p-12 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}`}>
              <input {...getInputProps()} />
              <svg className="mx-auto h-8 w-8 md:h-12 md:w-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="mt-3 md:mt-4 text-base md:text-lg font-medium">{isDragActive ? 'Drop files here' : 'Tap to upload or drag files'}</p>
              <p className="mt-2 md:mt-4 text-[10px] md:text-xs text-muted-foreground">PDF, DOCX, TXT, PNG, JPG (max 50MB)</p>
            </div>
          </CardContent>
        </Card>

        {uploadingArray.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">Uploading...</h2>
            {uploadingArray.map((file) => (
              <Card key={file.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="flex-1 truncate text-sm">{file.name}</span>
                  {file.error && <span className="text-xs text-red-500">{file.error}</span>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && filteredFiles.length > 0 && (
          <div className="space-y-3 md:space-y-4">
            <h2 className="text-base md:text-lg font-semibold">{searchQuery ? `Search Results (${filteredFiles.length})` : `All Files (${filteredFiles.length})`}</h2>
            <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {filteredFiles.map((file) => (
                <Card key={file.id} className="relative group">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-start gap-2 md:gap-3">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                        {getFileIcon(file.mimeType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm md:text-base truncate" title={file.originalName || file.filename}>{file.originalName || file.filename}</p>
                        <p className="text-xs md:text-sm text-muted-foreground">{formatFileSize(file.size)} • {formatDate(file.createdAt)}</p>
                        <div className="flex items-center gap-1.5 md:gap-2 mt-1.5 md:mt-2">
                          <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${getStatusColor(file.status)}`} />
                          <span className="text-[10px] md:text-xs capitalize">{file.status?.toLowerCase()}</span>
                          {file.sessionId && <span className="text-[10px] md:text-xs text-muted-foreground bg-muted px-1.5 rounded">Chat</span>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-0.5 md:gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" className="h-7 w-7 md:h-8 md:w-8 p-0" onClick={() => handleDownload(file.id, file.originalName || file.filename)} title="Download file">
                          <Download className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 md:h-8 md:w-8 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(file.id)} title="Delete file">
                          <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {!isLoading && filteredFiles.length === 0 && (
          <Card>
            <CardContent className="py-8 md:py-12 text-center px-4">
              <FileText className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground" />
              <h3 className="mt-3 md:mt-4 text-base md:text-lg font-medium">{searchQuery ? 'No files found' : 'No files uploaded'}</h3>
              <p className="mt-1 md:mt-2 text-sm text-muted-foreground">{searchQuery ? 'Try a different search term' : 'Upload documents here or attach files in chat - they will all appear here.'}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
