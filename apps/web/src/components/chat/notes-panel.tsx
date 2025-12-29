"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Search,
  StickyNote,
  MoreVertical,
  Edit,
  Trash2,
  Clock,
  Users,
  History,
  RotateCcw,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { aiClient } from "@/lib/api/ai-client";

interface NotesPanelProps {
  sessionId: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: Date;
  collaborators: number;
}

interface NoteVersion {
  version: number;
  title: string;
  content: string;
  edited_at: string;
  is_current: boolean;
}

export function NotesPanel({ sessionId }: NotesPanelProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [noteHistory, setNoteHistory] = useState<NoteVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<NoteVersion | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!sessionId) return;
      try {
        const res = await aiClient.listSessionNotes(sessionId);
        const mapped: Note[] = (res.notes || []).map((n: any) => ({
          id: n.id,
          title: n.title,
          content: n.content,
          updatedAt: n.updated_at ? new Date(n.updated_at) : new Date(),
          collaborators: 1,
        }));
        setNotes(mapped);
        setSelectedNote(mapped[0] || null);
        setEditContent(mapped[0]?.content || "");
      } catch (err) {
        console.error("Failed to load notes", err);
      }
    };
    load();
  }, [sessionId]);

  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateNote = () => {
    const newNote: Note = {
      id: "draft",
      title: "Untitled Note",
      content: "",
      updatedAt: new Date(),
      collaborators: 1,
    };
    setNotes((prev) => [newNote, ...prev]);
    setSelectedNote(newNote);
    setIsEditing(true);
    setEditContent("");
  };

  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    setIsEditing(false);
    setEditContent(note.content);
  };

  const handleSaveNote = async () => {
    if (selectedNote && sessionId) {
      const res = await aiClient.upsertNote(sessionId, selectedNote.title || "Untitled Note", editContent, selectedNote.id === "draft" ? undefined : selectedNote.id);
      const savedId = res.note_id || selectedNote.id;
      setNotes((prev) =>
        prev.map((n) =>
          n.id === selectedNote.id
            ? { ...n, id: savedId, content: editContent, updatedAt: new Date() }
            : n
        )
      );
      setSelectedNote((prev) => (prev ? { ...prev, id: savedId } : prev));
      setIsEditing(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (noteId !== "draft") {
      await aiClient.deleteNote(noteId);
    }
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    if (selectedNote?.id === noteId) {
      setSelectedNote(null);
    }
  };

  const handleViewHistory = async (noteId: string) => {
    if (noteId === "draft") return;
    
    setLoadingHistory(true);
    try {
      const res = await aiClient.getNoteHistory(noteId);
      setNoteHistory(res.history || []);
      setShowHistory(true);
      setSelectedVersion(null);
    } catch (err) {
      console.error("Failed to load note history", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleRestoreVersion = async (version: number) => {
    if (!selectedNote || selectedNote.id === "draft") return;
    
    try {
      await aiClient.restoreNoteVersion(selectedNote.id, version);
      // Reload the note content
      const res = await aiClient.listSessionNotes(sessionId);
      const mapped: Note[] = (res.notes || []).map((n: any) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        updatedAt: n.updated_at ? new Date(n.updated_at) : new Date(),
        collaborators: 1,
      }));
      setNotes(mapped);
      const restored = mapped.find(n => n.id === selectedNote.id);
      if (restored) {
        setSelectedNote(restored);
        setEditContent(restored.content);
      }
      setShowHistory(false);
      setSelectedVersion(null);
    } catch (err) {
      console.error("Failed to restore version", err);
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Notes</h3>
          <Button size="sm" onClick={handleCreateNote}>
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Notes List */}
        <div
          className={cn(
            "overflow-y-auto border-r border-neutral-200 dark:border-neutral-800",
            selectedNote ? "w-1/2" : "w-full"
          )}
        >
          <div className="p-2 space-y-1">
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => handleSelectNote(note)}
                className={cn(
                  "p-3 rounded-lg cursor-pointer transition-colors",
                  selectedNote?.id === note.id
                    ? "bg-primary-100 dark:bg-primary-900/20 border-primary-200"
                    : "hover:bg-neutral-50 dark:hover:bg-neutral-800"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{note.title}</p>
                    <p className="text-xs text-neutral-500 truncate mt-1">
                      {note.content.slice(0, 50)}...
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(note.updatedAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {note.collaborators}
                      </span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectNote(note);
                          setIsEditing(true);
                          setEditContent(note.content);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectNote(note);
                          handleViewHistory(note.id);
                        }}
                        disabled={note.id === "draft"}
                      >
                        <History className="h-4 w-4 mr-2" />
                        View History
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNote(note.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}

            {filteredNotes.length === 0 && (
              <div className="text-center py-8 text-neutral-500">
                <StickyNote className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No notes found</p>
              </div>
            )}
          </div>
        </div>

        {/* Note Editor */}
        {selectedNote && (
          <div className="w-1/2 flex flex-col">
            <div className="p-3 border-b border-neutral-200 dark:border-neutral-800">
              <Input
                value={selectedNote.title}
                onChange={(e) => {
                  setNotes((prev) =>
                    prev.map((n) =>
                      n.id === selectedNote.id
                        ? { ...n, title: e.target.value }
                        : n
                    )
                  );
                  setSelectedNote((prev) =>
                    prev ? { ...prev, title: e.target.value } : null
                  );
                }}
                className="font-medium border-0 p-0 h-auto focus-visible:ring-0"
                placeholder="Note title..."
              />
            </div>
            <div className="flex-1 p-3">
              {isEditing ? (
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="h-full resize-none border-0 focus-visible:ring-0"
                  placeholder="Start writing..."
                />
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                  {selectedNote.content || (
                    <span className="text-neutral-400">No content</span>
                  )}
                </div>
              )}
            </div>
            <div className="p-3 border-t border-neutral-200 dark:border-neutral-800">
              {isEditing ? (
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveNote}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(true);
                      setEditContent(selectedNote.content);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  {selectedNote.id !== "draft" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleViewHistory(selectedNote.id)}
                    >
                      <History className="h-4 w-4 mr-1" />
                      History
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* History Modal */}
      {showHistory && selectedNote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-lg w-full max-w-3xl max-h-[80vh] flex flex-col m-4">
            {/* Header */}
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Version History</h3>
                <p className="text-sm text-neutral-500">{selectedNote.title}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowHistory(false);
                  setSelectedVersion(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex">
              {/* Version List */}
              <div className="w-1/3 border-r border-neutral-200 dark:border-neutral-800 overflow-y-auto">
                {loadingHistory ? (
                  <div className="p-4 text-center text-neutral-500">
                    Loading history...
                  </div>
                ) : noteHistory.length === 0 ? (
                  <div className="p-4 text-center text-neutral-500">
                    <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No version history</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {noteHistory.map((v) => (
                      <div
                        key={v.version}
                        onClick={() => setSelectedVersion(v)}
                        className={cn(
                          "p-3 rounded-lg cursor-pointer transition-colors",
                          selectedVersion?.version === v.version
                            ? "bg-primary-100 dark:bg-primary-900/20"
                            : "hover:bg-neutral-50 dark:hover:bg-neutral-800"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">
                            Version {v.version}
                          </span>
                          {v.is_current && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">
                          {new Date(v.edited_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Version Preview */}
              <div className="w-2/3 flex flex-col">
                {selectedVersion ? (
                  <>
                    <div className="p-4 flex-1 overflow-y-auto">
                      <h4 className="font-medium mb-2">{selectedVersion.title}</h4>
                      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-neutral-600 dark:text-neutral-300">
                        {selectedVersion.content || (
                          <span className="text-neutral-400">Empty content</span>
                        )}
                      </div>
                    </div>
                    {!selectedVersion.is_current && (
                      <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
                        <Button
                          size="sm"
                          onClick={() => handleRestoreVersion(selectedVersion.version)}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Restore This Version
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-neutral-500">
                    <p>Select a version to preview</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
