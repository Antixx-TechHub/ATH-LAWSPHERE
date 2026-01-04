"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageSquare,
  Plus,
  Search,
  Trash2,
  Clock,
  MoreVertical,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { aiClient } from "@/lib/api/ai-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Session {
  id: string;
  title: string;
  updated_at: string;
  last_message_preview?: string;
}

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await aiClient.listSessions();
      setSessions(list);
    } catch (err) {
      console.error("Failed to load sessions", err);
      setError("Failed to connect to AI service. Please ensure the service is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleNewSession = async () => {
    try {
      // Don't pass title - API will generate default name with date
      const created = await aiClient.createSession();
      // Navigate to chat with this session
      router.push(`/dashboard/chat?session=${created.id}`);
    } catch (err) {
      console.error("Failed to create session", err);
    }
  };

  const handleOpenSession = (sessionId: string) => {
    router.push(`/dashboard/chat?session=${sessionId}`);
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Call delete API
      await aiClient.deleteSession(sessionId);
      setSessions(sessions.filter(s => s.id !== sessionId));
    } catch (err) {
      console.error("Failed to delete session", err);
    }
  };

  const handleStartRename = (session: Session, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditingTitle(session.title || "");
    // Focus input after state update
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(null);
    setEditingTitle("");
  };

  const handleSaveRename = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editingTitle.trim()) return;
    
    try {
      await aiClient.renameSession(sessionId, editingTitle.trim());
      setSessions(sessions.map(s => 
        s.id === sessionId ? { ...s, title: editingTitle.trim() } : s
      ));
      setEditingSessionId(null);
      setEditingTitle("");
    } catch (err) {
      console.error("Failed to rename session", err);
    }
  };

  const handleRenameKeyDown = (sessionId: string, e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveRename(sessionId, e as any);
    } else if (e.key === 'Escape') {
      handleCancelRename(e as any);
    }
  };

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.last_message_preview?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
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
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-neutral-500">Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Sessions</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Manage your chat sessions and continue previous conversations
          </p>
        </div>
        <Button onClick={handleNewSession}>
          <Plus className="h-4 w-4 mr-2" />
          New Session
        </Button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
        <Input
          placeholder="Search sessions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Sessions Grid */}
      {filteredSessions.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
            {searchQuery ? "No sessions found" : "No sessions yet"}
          </h3>
          <p className="text-neutral-500 mb-4">
            {searchQuery
              ? "Try a different search term"
              : "Start a new chat session to get started"}
          </p>
          {!searchQuery && (
            <Button onClick={handleNewSession}>
              <Plus className="h-4 w-4 mr-2" />
              Create your first session
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSessions.map((session) => (
            <div
              key={session.id}
              onClick={() => editingSessionId !== session.id && handleOpenSession(session.id)}
              className={cn(
                "p-4 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800",
                "hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md",
                "cursor-pointer transition-all duration-200",
                editingSessionId === session.id && "border-primary-500 ring-1 ring-primary-500"
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="p-2 bg-primary-50 dark:bg-primary-900/30 rounded-lg flex-shrink-0">
                    <MessageSquare className="h-4 w-4 text-primary-600" />
                  </div>
                  {editingSessionId === session.id ? (
                    <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                      <Input
                        ref={editInputRef}
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => handleRenameKeyDown(session.id, e)}
                        className="h-8 text-sm"
                        placeholder="Session name..."
                      />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 flex-shrink-0"
                        onClick={(e) => handleSaveRename(session.id, e)}
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 flex-shrink-0"
                        onClick={handleCancelRename}
                      >
                        <X className="h-4 w-4 text-neutral-500" />
                      </Button>
                    </div>
                  ) : (
                    <h3 className="font-medium text-neutral-900 dark:text-white truncate max-w-[180px]">
                      {session.title || "Untitled Session"}
                    </h3>
                  )}
                </div>
                {editingSessionId !== session.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => handleStartRename(session, e as any)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleDeleteSession(session.id, e as any)}>
                        <Trash2 className="h-4 w-4 mr-2 text-red-500" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {session.last_message_preview && (
                <p className="text-sm text-neutral-500 line-clamp-2 mb-3">
                  {session.last_message_preview}
                </p>
              )}

              <div className="flex items-center text-xs text-neutral-400">
                <Clock className="h-3 w-3 mr-1" />
                {formatDate(session.updated_at)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
