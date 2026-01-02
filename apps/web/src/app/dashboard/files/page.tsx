/**
 * Files Page
 */

'use client';

import { useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useDropzone } from 'react-dropzone';
import { useFileStore } from '@/stores/fileStore';

export default function FilesPage() {
  const { files, addFile, updateFile, removeFile } = useFileStore();
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      const fileId = addFile({
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'uploading',
        progress: 0,
      });

      setUploadingFiles(prev => [...prev, fileId]);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/files', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          
          // Check if already READY (no processing needed)
          if (data.status === 'READY') {
            updateFile(fileId, {
              id: data.id,
              status: 'ready',
              progress: 100,
              url: data.url,
            });
          } else {
            // Still processing, start polling
            updateFile(fileId, {
              id: data.id,
              status: 'processing',
              progress: 100,
            });
            pollFileStatus(data.id, fileId);
          }
        } else {
          updateFile(fileId, {
            status: 'error',
            error: 'Upload failed',
          });
        }
      } catch (error) {
        updateFile(fileId, {
          status: 'error',
          error: 'Upload failed',
        });
      } finally {
        setUploadingFiles(prev => prev.filter(id => id !== fileId));
      }
    }
  }, [addFile, updateFile]);

  const pollFileStatus = async (serverId: string, localId: string) => {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes with 5s intervals

    const poll = async () => {
      try {
        const response = await fetch(`/api/files?id=${serverId}`);
        if (response.ok) {
          const data = await response.json();
          
          // Check for READY status (from database) or completed (legacy)
          if (data.status === 'READY' || data.status === 'completed') {
            updateFile(localId, { status: 'ready', url: data.downloadUrl });
            return;
          } else if (data.status === 'ERROR' || data.status === 'failed') {
            updateFile(localId, { status: 'error', error: 'Processing failed' });
            return;
          }
        }
      } catch {
        // Continue polling
      }

      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, 5000);
      } else {
        updateFile(localId, { status: 'error', error: 'Processing timed out' });
      }
    };

    setTimeout(poll, 5000);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'image/*': ['.png', '.jpg', '.jpeg'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-green-500';
      case 'processing': return 'bg-yellow-500';
      case 'uploading': return 'bg-blue-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold tracking-tight">Files</h1>
            <p className="text-muted-foreground">
              Upload and manage your legal documents
            </p>
          </div>
        </div>

        {/* Upload Zone */}
        <Card>
          <CardContent className="p-0">
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
                transition-colors
                ${isDragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-primary/50'
                }
              `}
            >
              <input {...getInputProps()} />
              <svg
                className="mx-auto h-12 w-12 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="mt-4 text-lg font-medium">
                {isDragActive ? 'Drop files here' : 'Drag and drop files here'}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                or <span className="text-primary">browse</span> to upload
              </p>
              <p className="mt-4 text-xs text-muted-foreground">
                Supports PDF, DOCX, DOC, TXT, PNG, JPG (max 50MB)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Uploaded Files</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {files.map((file) => (
                <Card key={file.id} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(file.size)}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(file.status)}`} />
                          <span className="text-xs capitalize">{file.status}</span>
                        </div>
                        {file.status === 'uploading' && (
                          <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary transition-all"
                              style={{ width: `${file.progress}%` }}
                            />
                          </div>
                        )}
                        {file.error && (
                          <p className="text-xs text-destructive mt-1">{file.error}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        {file.status === 'ready' && file.url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(file.url, '_blank')}
                            title="Open file"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(file.id)}
                          title="Remove file"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {files.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <h3 className="mt-4 text-lg font-medium">No files uploaded</h3>
              <p className="mt-2 text-muted-foreground">
                Upload your legal documents to get started with AI-powered analysis.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
