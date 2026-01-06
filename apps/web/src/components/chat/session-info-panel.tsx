"use client";

import { formatFileSize } from "../../lib/utils";
import {
  FileText,
  Image,
  Video,
  Music,
  File,
  Users,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

interface SessionFile {
  id: string;
  name: string;
  size?: number;
  mime_type?: string;
  status?: string;
  uploaded_at?: string;
  is_sensitive?: boolean;
  pii_detected?: boolean;
}

interface SessionInfoPanelProps {
  sessionId: string;
  files: SessionFile[];
  chatFiles?: SessionFile[];
}

export function SessionInfoPanel({ 
  sessionId, 
  files, 
  chatFiles = [] 
}: SessionInfoPanelProps) {
  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return File;
    if (mimeType.startsWith("image/")) return Image;
    if (mimeType.startsWith("video/")) return Video;
    if (mimeType.startsWith("audio/")) return Music;
    if (mimeType.includes("pdf") || mimeType.includes("word") || mimeType.includes("document")) {
      return FileText;
    }
    return File;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Recently added";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="h-full bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 flex flex-col">
      <h3 className="font-semibold mb-4">Session Info</h3>
      
      <div className="flex-1 space-y-4 overflow-y-auto">
        {/* Participants */}
        <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-primary-600" />
            <p className="text-sm font-medium">Participants</p>
          </div>
          <p className="text-sm text-neutral-500">3 users online</p>
        </div>

        {/* Files Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary-600" />
            <p className="text-sm font-medium">
              Uploaded Files ({files.length})
            </p>
          </div>
          
          {files.length === 0 ? (
            <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800">
              <p className="text-sm text-neutral-500">
                No files uploaded yet. Upload files to analyze them.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => {
                const FileIcon = getFileIcon(file.mime_type);
                return (
                  <div
                    key={file.id}
                    className="p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <FileIcon className="h-4 w-4 mt-0.5 text-primary-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">
                          {file.name}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <p className="text-xs text-neutral-500">
                            {file.size ? formatFileSize(file.size) : "Unknown size"}
                          </p>
                          <span className="text-xs text-neutral-400">•</span>
                          <p className="text-xs text-neutral-500">
                            {formatDate(file.uploaded_at)}
                          </p>
                        </div>
                        
                        {/* Alerts for sensitive content */}
                        {file.pii_detected && (
                          <div className="flex items-center gap-1 mt-2 p-1.5 rounded bg-yellow-50 dark:bg-yellow-900/20">
                            <AlertCircle className="h-3 w-3 text-yellow-600 dark:text-yellow-500 flex-shrink-0" />
                            <span className="text-xs text-yellow-700 dark:text-yellow-400">
                              PII Detected
                            </span>
                          </div>
                        )}
                        
                        {file.is_sensitive && (
                          <div className="flex items-center gap-1 mt-2 p-1.5 rounded bg-amber-50 dark:bg-amber-900/20">
                            <ShieldCheck className="h-3 w-3 text-amber-600 dark:text-amber-500 flex-shrink-0" />
                            <span className="text-xs text-amber-700 dark:text-amber-400">
                              Sensitive Content
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chat Files Section */}
        {chatFiles.length > 0 && (
          <div className="space-y-2 border-t border-neutral-200 dark:border-neutral-700 pt-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-accent-600" />
              <p className="text-sm font-medium">
                Files in Chat ({chatFiles.length})
              </p>
            </div>
            
            <div className="space-y-2">
              {chatFiles.map((file) => {
                const FileIcon = getFileIcon(file.mime_type);
                return (
                  <div
                    key={file.id}
                    className="p-2 rounded-lg bg-accent-50 dark:bg-accent-900/20 hover:bg-accent-100 dark:hover:bg-accent-900/30 transition-colors border border-accent-200 dark:border-accent-700/50"
                  >
                    <div className="flex items-start gap-2">
                      <FileIcon className="h-4 w-4 mt-0.5 text-accent-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">
                          {file.name}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <p className="text-xs text-neutral-500">
                            {file.size ? formatFileSize(file.size) : "Unknown size"}
                          </p>
                          <span className="text-xs text-neutral-400">•</span>
                          <p className="text-xs text-neutral-500">
                            Shared in chat
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
