"use client";

import { useState } from "react";
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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

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

const mockNotes: Note[] = [
  {
    id: "1",
    title: "Case Summary - Smith v. Jones",
    content:
      "Key points from the initial consultation:\n\n1. Client claims breach of contract\n2. Contract dated March 2024\n3. Damages estimated at $50,000\n\n**Next Steps:**\n- Request contract copy\n- Schedule follow-up meeting",
    updatedAt: new Date(Date.now() - 1800000),
    collaborators: 2,
  },
  {
    id: "2",
    title: "Legal Research Notes",
    content:
      "Relevant precedents:\n\n- ABC Corp v. XYZ Inc (2023)\n- Johnson v. State (2022)\n\nKey statutes to review:\n- Contract Law Section 45\n- Commercial Code Article 2",
    updatedAt: new Date(Date.now() - 7200000),
    collaborators: 1,
  },
  {
    id: "3",
    title: "Meeting Notes - Dec 20",
    content:
      "Discussed strategy with senior partner. Agreed to pursue mediation first before litigation.",
    updatedAt: new Date(Date.now() - 86400000),
    collaborators: 3,
  },
];

export function NotesPanel({ sessionId }: NotesPanelProps) {
  const [notes, setNotes] = useState<Note[]>(mockNotes);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");

  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
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

  const handleSaveNote = () => {
    if (selectedNote) {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === selectedNote.id
            ? { ...n, content: editContent, updatedAt: new Date() }
            : n
        )
      );
      setIsEditing(false);
    }
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    if (selectedNote?.id === noteId) {
      setSelectedNote(null);
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
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
