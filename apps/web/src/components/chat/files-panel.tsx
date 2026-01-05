"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Upload,
  FileText,
  Image,
  Video,
  Music,
  File,
  Search,
  MoreVertical,
  Download,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  ShieldCheck,
  Shield,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatFileSize } from "@/lib/utils";
import { aiClient } from "@/lib/api/ai-client";

interface FilesPanelProps {
  sessionId: string;
  onFilesChanged?: () => void;
  refreshSignal?: number;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: "uploading" | "processing" | "ready" | "error";
  progress?: number;
  uploadedAt: Date;
  isSensitive?: boolean;
  piiDetected?: boolean;
}

export function FilesPanel({ sessionId, onFilesChanged, refreshSignal }: FilesPanelProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingFile, setViewingFile] = useState<UploadedFile | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);

  const refreshFiles = useCallback(async () => {
    if (!sessionId) {
      setIsLoadingFiles(false);
      return;
    }
    setIsLoadingFiles(true);
    try {
      const res = await aiClient.listSessionFiles(sessionId);
    const mapped: UploadedFile[] = (res.files || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      size: f.size || 0,
      type: f.mime_type || "application/octet-stream",
      status: (f.status as UploadedFile["status"]) || "ready",
      uploadedAt: f.uploaded_at ? new Date(f.uploaded_at) : new Date(),
      isSensitive: f.is_sensitive,
      piiDetected: f.pii_detected,
    }));
    setFiles(mapped);
    } finally {
      setIsLoadingFiles(false);
    }
  }, [sessionId]);

  useEffect(() => {
    refreshFiles().catch((err) => console.error("Failed to load files", err));
  }, [refreshFiles]);

  // Refresh whenever the parent signals a change (e.g., chat attachments uploaded)
  useEffect(() => {
    if (refreshSignal !== undefined) {
      refreshFiles().catch((err) => console.error("Failed to refresh files", err));
    }
  }, [refreshSignal, refreshFiles]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      const tempId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      
      // Add file with uploading status
      const newFile: UploadedFile = {
        id: tempId,
        name: file.name,
        size: file.size,
        type: file.type,
        status: "uploading" as const,
        progress: 0,
        uploadedAt: new Date(),
      };
      
      setFiles((prev) => [newFile, ...prev]);

      try {
        // Upload file to API
        const result = await aiClient.uploadFile(file, sessionId);
        
        // Update file status
        setFiles((prev) =>
          prev.map((f) =>
            f.id === tempId
              ? { 
                  ...f, 
                  id: result.file_id,
                  status: "processing",
                  progress: 100,
                }
              : f
          )
        );

        // Refresh from API after upload completes
        await refreshFiles();
        
        // Notify parent component
        onFilesChanged?.();

      } catch (error) {
        console.error('File upload error:', error);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === tempId
              ? { ...f, status: "error" as const }
              : f
          )
        );
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/rtf": [".rtf"],
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".tiff", ".bmp", ".svg"],
      "audio/*": [".mp3", ".wav", ".m4a"],
      "video/*": [".mp4", ".mov", ".avi"],
      "text/*": [".txt", ".md", ".csv"],
    },
  });

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return Image;
    if (type.startsWith("video/")) return Video;
    if (type.startsWith("audio/")) return Music;
    if (type.includes("pdf") || type.includes("word") || type.includes("document"))
      return FileText;
    return File;
  };

  const getStatusIcon = (status: UploadedFile["status"]) => {
    switch (status) {
      case "ready":
        return <CheckCircle className="h-4 w-4 text-accent-600" />;
      case "processing":
        return <Clock className="h-4 w-4 text-amber-500 animate-pulse" />;
      case "uploading":
        return <Clock className="h-4 w-4 text-primary-500 animate-pulse" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
        <h3 className="font-semibold mb-3">Files</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Drop Zone */}
      <div className="p-4">
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            isDragActive
              ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
              : "border-neutral-300 dark:border-neutral-700 hover:border-primary-400"
          )}
        >
          <input {...getInputProps()} />
          <Upload className="h-8 w-8 mx-auto mb-2 text-neutral-400" />
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {isDragActive
              ? "Drop files here..."
              : "Drag & drop files or click to browse"}
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            PDF, DOC, Images, Audio, Video
          </p>
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {isLoadingFiles ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600 mb-3" />
            <p className="text-sm text-neutral-500">Loading files...</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {filteredFiles.map((file) => {
            const FileIcon = getFileIcon(file.type);
            return (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                  <FileIcon className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{file.name}</p>
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <span>{formatFileSize(file.size)}</span>
                    {file.status === "uploading" && file.progress && (
                      <span>{file.progress}%</span>
                    )}
                    {file.isSensitive && (
                      <span className="flex items-center gap-0.5 text-green-600 font-medium">
                        <ShieldCheck className="h-3 w-3" />
                        <span>Protected</span>
                      </span>
                    )}
                  </div>
                  {file.status === "uploading" && file.progress && (
                    <div className="mt-1 h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 transition-all"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(file.status)}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={async () => {
                          try {
                            setViewingFile(file);
                            const response = await fetch(`/api/files/${file.id}/content`);
                            if (response.ok) {
                              const data = await response.json();
                              setFileContent(data.content || "No content available");
                            } else {
                              setFileContent("Failed to load file content");
                            }
                          } catch (err) {
                            console.error('Failed to load file', err);
                            setFileContent("Error loading file");
                          }
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async () => {
                          try {
                            const response = await fetch(`/api/files/${file.id}/content`);
                            if (response.ok) {
                              const data = await response.json();
                              const blob = new Blob([data.content || ""], { type: 'text/plain' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = file.name;
                              a.click();
                              URL.revokeObjectURL(url);
                            }
                          } catch (err) {
                            console.error('Failed to download', err);
                          }
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={async () => {
                          try {
                            await aiClient.deleteFile(file.id);
                            // Optimistically remove from UI
                            setFiles((prev) => prev.filter((f) => f.id !== file.id));
                            // Refresh from API and notify parent
                            await refreshFiles();
                            onFilesChanged?.();
                          } catch (err) {
                            console.error('Delete failed', err);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>

        {filteredFiles.length === 0 && (
              <div className="text-center py-8 text-neutral-500">
                <File className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No files found</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* File Viewer Dialog */}
      {viewingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setViewingFile(null)}>
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary-600" />
                <div>
                  <h3 className="font-semibold">{viewingFile.name}</h3>
                  <p className="text-xs text-neutral-500">{formatFileSize(viewingFile.size)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={async () => {
                    try {
                      // For images, download the raw file
                      if (viewingFile.type.startsWith('image/')) {
                        const response = await fetch(`/api/files/${viewingFile.id}/raw`);
                        if (response.ok) {
                          const blob = await response.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = viewingFile.name;
                          a.click();
                          URL.revokeObjectURL(url);
                        }
                      } else {
                        const response = await fetch(`/api/files/${viewingFile.id}/content`);
                        if (response.ok) {
                          const data = await response.json();
                          const blob = new Blob([data.content || ""], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = viewingFile.name;
                          a.click();
                          URL.revokeObjectURL(url);
                        }
                      }
                    } catch (err) {
                      console.error('Failed to download', err);
                    }
                  }}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setViewingFile(null)}>
                  <span className="text-xl">×</span>
                </Button>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Image Preview */}
              {viewingFile.type.startsWith("image/") ? (
                <div className="space-y-4">
                  <div className="flex justify-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-4">
                    <img 
                      src={`/api/files/${viewingFile.id}/raw`}
                      alt={viewingFile.name}
                      className="max-w-full max-h-[50vh] object-contain rounded"
                    />
                  </div>
                  {fileContent && !fileContent.startsWith("[") && (
                    <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
                      <h4 className="text-sm font-medium mb-2 text-neutral-600 dark:text-neutral-400">
                        📝 Extracted Text (OCR)
                      </h4>
                      <pre className="text-sm whitespace-pre-wrap font-mono bg-neutral-50 dark:bg-neutral-800 p-4 rounded">
                        {fileContent}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {viewingFile.type === "application/pdf" && (
                    <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        📄 PDF Preview: Showing extracted text content. Download for the full document.
                      </p>
                    </div>
                  )}
                  {fileContent ? (
                    <pre className="text-sm whitespace-pre-wrap font-mono bg-neutral-50 dark:bg-neutral-800 p-4 rounded">
                      {fileContent}
                    </pre>
                  ) : (
                    <div className="flex items-center justify-center h-32 text-neutral-500">
                      <Clock className="h-5 w-5 mr-2 animate-spin" />
                      Loading content...
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
