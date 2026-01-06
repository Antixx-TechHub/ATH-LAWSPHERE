/**
 * Files Page - Library
 * Displays all files uploaded by the user (from chat attachments and direct uploads)
 * Features: Grid/List views, pagination, session linking, file preview
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '../../../components/layout/dashboard-layout';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { useDropzone } from 'react-dropzone';
import { 
  Loader2, Search, FileText, Image, Trash2, Download, RefreshCw, 
  Grid, List, Eye, MessageSquare, Upload, ChevronLeft, ChevronRight,
  Calendar, FolderOpen, User
} from 'lucide-react';

interface FileItem {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: string;
  createdAt: string;
  sessionId?: string;
  sessionName?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  url?: string;
}

type ViewMode = 'grid' | 'list';

const ITEMS_PER_PAGE = 12;

export default function FilesPage() {
  const router = useRouter();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, { name: string; progress: number; error?: string }>>(new Map());
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

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

  const handleViewFile = (file: FileItem) => {
    setPreviewFile(file);
  };

  const handleGoToChat = (sessionId: string) => {
    router.push(`/dashboard/chat?session=${sessionId}`);
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

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const getSourceTag = (file: FileItem) => {
    if (file.sessionId) {
      return (
        <span className="text-[10px] md:text-xs text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded flex items-center gap-1">
          <MessageSquare className="h-3 w-3" />
          Chat
        </span>
      );
    }
    return (
      <span className="text-[10px] md:text-xs text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded flex items-center gap-1">
        <FolderOpen className="h-3 w-3" />
        Library
      </span>
    );
  };

  const filteredFiles = files.filter(file =>
    file.filename?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.originalName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredFiles.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedFiles = filteredFiles.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const uploadingArray = Array.from(uploadingFiles.entries()).map(([id, data]) => ({ id, ...data }));

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6 pb-16 md:pb-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-3xl font-serif font-bold tracking-tight">Library</h1>
            <p className="text-sm text-muted-foreground hidden sm:block">
              All your uploaded documents in one place • {filteredFiles.length} files
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex items-center bg-muted rounded-lg p-1">
              <Button 
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                size="sm" 
                className="h-7 w-7 p-0"
                onClick={() => setViewMode('grid')}
                title="Grid view"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button 
                variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                size="sm" 
                className="h-7 w-7 p-0"
                onClick={() => setViewMode('list')}
                title="List view"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={() => { setIsLoading(true); fetchFiles(); }} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search files..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>

        {/* Compact Upload Zone */}
        <Card>
          <CardContent className="p-0">
            <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}`}>
              <input {...getInputProps()} />
              <div className="flex items-center justify-center gap-3">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <p className="text-sm font-medium">{isDragActive ? 'Drop files here' : 'Click to upload or drag files'}</p>
                  <p className="text-[10px] text-muted-foreground">PDF, DOCX, TXT, PNG, JPG (max 50MB)</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Uploading Files */}
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

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Files Display */}
        {!isLoading && paginatedFiles.length > 0 && (
          <div className="space-y-3 md:space-y-4">
            <h2 className="text-base md:text-lg font-semibold">
              {searchQuery ? `Search Results (${filteredFiles.length})` : `All Files (${filteredFiles.length})`}
            </h2>

            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {paginatedFiles.map((file) => (
                  <Card key={file.id} className="relative group hover:shadow-md transition-shadow">
                    <CardContent className="p-3 md:p-4">
                      <div className="flex items-start gap-2 md:gap-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                          {getFileIcon(file.mimeType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm md:text-base truncate" title={file.originalName || file.filename}>
                            {file.originalName || file.filename}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(file.status)}`} />
                            <span className="text-[10px] capitalize">{file.status?.toLowerCase()}</span>
                            {getSourceTag(file)}
                          </div>
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span className="truncate max-w-[100px]" title={file.userName || 'Unknown'}>{file.userName || 'Unknown'}</span>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDateShort(file.createdAt)}
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 mt-3 pt-2 border-t">
                        <Button variant="ghost" size="sm" className="h-7 text-xs flex-1" onClick={() => handleViewFile(file)}>
                          <Eye className="h-3 w-3 mr-1" /> View
                        </Button>
                        {file.sessionId && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs flex-1" onClick={() => handleGoToChat(file.sessionId!)}>
                            <MessageSquare className="h-3 w-3 mr-1" /> Chat
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDownload(file.id, file.originalName || file.filename)}>
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(file.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr className="text-left text-xs font-medium text-muted-foreground">
                      <th className="px-4 py-3">File</th>
                      <th className="px-4 py-3 hidden md:table-cell">Size</th>
                      <th className="px-4 py-3 hidden lg:table-cell">Source</th>
                      <th className="px-4 py-3 hidden xl:table-cell">Uploaded By</th>
                      <th className="px-4 py-3 hidden sm:table-cell">Uploaded</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paginatedFiles.map((file) => (
                      <tr key={file.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                              {getFileIcon(file.mimeType)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate max-w-[200px]" title={file.originalName || file.filename}>
                                {file.originalName || file.filename}
                              </p>
                              <p className="text-xs text-muted-foreground md:hidden">{formatFileSize(file.size)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                          {formatFileSize(file.size)}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          {getSourceTag(file)}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden xl:table-cell">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5" />
                            <span className="truncate max-w-[120px]" title={file.userName || 'Unknown'}>{file.userName || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                          {formatDateTime(file.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${getStatusColor(file.status)}`} />
                            <span className="text-xs capitalize">{file.status?.toLowerCase()}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleViewFile(file)} title="View file">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {file.sessionId && (
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleGoToChat(file.sessionId!)} title="Go to chat">
                                <MessageSquare className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDownload(file.id, file.originalName || file.filename)} title="Download">
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(file.id)} title="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredFiles.length)} of {filteredFiles.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredFiles.length === 0 && (
          <Card>
            <CardContent className="py-8 md:py-12 text-center px-4">
              <FileText className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground" />
              <h3 className="mt-3 md:mt-4 text-base md:text-lg font-medium">
                {searchQuery ? 'No files found' : 'No files uploaded'}
              </h3>
              <p className="mt-1 md:mt-2 text-sm text-muted-foreground">
                {searchQuery ? 'Try a different search term' : 'Upload documents here or attach files in chat - they will all appear here.'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* File Preview Modal */}
        {previewFile && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setPreviewFile(null)}>
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                      {getFileIcon(previewFile.mimeType)}
                    </div>
                    <div>
                      <h3 className="font-semibold">{previewFile.originalName || previewFile.filename}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(previewFile.size)} • {formatDateTime(previewFile.createdAt)}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setPreviewFile(null)}>✕</Button>
                </div>
                
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-24">Status:</span>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(previewFile.status)}`} />
                      <span className="capitalize">{previewFile.status?.toLowerCase()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-24">Source:</span>
                    {getSourceTag(previewFile)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-24">Uploaded By:</span>
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      <span>{previewFile.userName || 'Unknown'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-24">Type:</span>
                    <span>{previewFile.mimeType}</span>
                  </div>
                  {previewFile.sessionId && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-24">Session:</span>
                      <Button variant="link" size="sm" className="h-auto p-0 text-sm" onClick={() => { setPreviewFile(null); handleGoToChat(previewFile.sessionId!); }}>
                        Go to chat session →
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-6">
                  <Button className="flex-1" onClick={() => handleDownload(previewFile.id, previewFile.originalName || previewFile.filename)}>
                    <Download className="h-4 w-4 mr-2" /> Download
                  </Button>
                  {previewFile.sessionId && (
                    <Button variant="outline" className="flex-1" onClick={() => { setPreviewFile(null); handleGoToChat(previewFile.sessionId!); }}>
                      <MessageSquare className="h-4 w-4 mr-2" /> Open Chat
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
