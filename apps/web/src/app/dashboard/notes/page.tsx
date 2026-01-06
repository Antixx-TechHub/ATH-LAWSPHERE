"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  FileText,
  Plus,
  Search,
  Clock,
  MoreVertical,
  ExternalLink,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { aiClient } from "../../../lib/api/ai-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";

interface Note {
  id: string;
  session_id: string;
  title: string;
  content: string;
  updated_at: string;
}

export default function NotesPage() {
  const router = useRouter();
  const { data: authSession } = useSession();
  const userId = authSession?.user?.id || authSession?.user?.email;
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  useEffect(() => {
    if (userId) loadNotes();
  }, [userId]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all sessions and their notes
      const sessions = await aiClient.listSessions(userId);
      const allNotes: Note[] = [];
      
      for (const session of sessions) {
        try {
          const context = await aiClient.getSessionContext(session.id);
          if (context.notes && context.notes.length > 0) {
            allNotes.push(...context.notes.map((note: Note) => ({
              ...note,
              session_id: session.id,
            })));
          }
        } catch (err) {
          console.error(`Failed to fetch notes for session ${session.id}`, err);
        }
      }
      
      // Sort by updated_at descending
      allNotes.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      setNotes(allNotes);
    } catch (err) {
      console.error("Failed to load notes", err);
      setError("Failed to connect to AI service. Please ensure the service is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenInChat = (sessionId: string) => {
    router.push(`/dashboard/chat?session=${sessionId}`);
  };

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
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
          <p className="text-gray-600 dark:text-gray-400">Loading notes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={loadNotes}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notes</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {notes.length} note{notes.length !== 1 ? "s" : ""} across all sessions
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchQuery ? "No notes found" : "No notes yet"}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchQuery 
              ? "Try adjusting your search query" 
              : "Notes created during chat sessions will appear here"}
          </p>
          <Button onClick={() => router.push("/dashboard/chat")}>
            <Plus className="h-4 w-4 mr-2" />
            Start a Chat
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className={cn(
                "group relative p-4 rounded-lg border bg-white dark:bg-gray-800",
                "border-gray-200 dark:border-gray-700",
                "hover:border-primary-300 dark:hover:border-primary-600",
                "transition-all duration-200 cursor-pointer"
              )}
              onClick={() => setSelectedNote(note)}
            >
              {/* Note Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary-600" />
                  <h3 className="font-medium text-gray-900 dark:text-white line-clamp-1">
                    {note.title}
                  </h3>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      handleOpenInChat(note.session_id);
                    }}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open in Chat
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Note Content Preview */}
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-3">
                {note.content}
              </p>

              {/* Note Footer */}
              <div className="flex items-center text-xs text-gray-500">
                <Clock className="h-3 w-3 mr-1" />
                <span>{formatDate(note.updated_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Note Preview Dialog */}
      <Dialog open={selectedNote !== null} onOpenChange={(open) => !open && setSelectedNote(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary-600" />
              {selectedNote?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <div className="prose dark:prose-invert max-w-none">
              <pre className="whitespace-pre-wrap text-sm bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                {selectedNote?.content}
              </pre>
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <span className="text-sm text-gray-500">
                Last updated: {selectedNote && formatDate(selectedNote.updated_at)}
              </span>
              <Button
                size="sm"
                onClick={() => selectedNote && handleOpenInChat(selectedNote.session_id)}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Chat
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
