"use client";

import { useState, useRef, useEffect } from "react";
import { ChatPanel } from "@/components/chat/chat-panel";
import { FilesPanel } from "@/components/chat/files-panel";
import { NotesPanel } from "@/components/chat/notes-panel";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  FileText,
  StickyNote,
  Users,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ActivePanel = "chat" | "files" | "notes";

export default function ChatPage() {
  const [activePanel, setActivePanel] = useState<ActivePanel>("chat");
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [sessionId] = useState("new");

  return (
    <div className="h-[calc(100vh-8rem)]">
      {/* Panel Toggle Tabs */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <Button
            variant={activePanel === "chat" ? "default" : "outline"}
            size="sm"
            onClick={() => setActivePanel("chat")}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Chat
          </Button>
          <Button
            variant={activePanel === "files" ? "default" : "outline"}
            size="sm"
            onClick={() => setActivePanel("files")}
          >
            <FileText className="h-4 w-4 mr-2" />
            Files
          </Button>
          <Button
            variant={activePanel === "notes" ? "default" : "outline"}
            size="sm"
            onClick={() => setActivePanel("notes")}
          >
            <StickyNote className="h-4 w-4 mr-2" />
            Notes
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Users className="h-4 w-4" />
            <span>3 online</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
          >
            {rightPanelOpen ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex gap-4 h-[calc(100%-3rem)]">
        {/* Left Panel - Chat */}
        <div
          className={cn(
            "flex-1 transition-all duration-300",
            rightPanelOpen ? "w-2/3" : "w-full"
          )}
        >
          <ChatPanel sessionId={sessionId} />
        </div>

        {/* Right Panel - Files/Notes */}
        {rightPanelOpen && (
          <div className="w-1/3 min-w-[300px]">
            {activePanel === "files" ? (
              <FilesPanel sessionId={sessionId} />
            ) : activePanel === "notes" ? (
              <NotesPanel sessionId={sessionId} />
            ) : (
              <div className="h-full bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
                <div className="flex flex-col h-full">
                  <h3 className="font-semibold mb-4">Session Info</h3>
                  <div className="flex-1 space-y-4">
                    <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800">
                      <p className="text-sm font-medium">Participants</p>
                      <p className="text-sm text-neutral-500">3 users online</p>
                    </div>
                    <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800">
                      <p className="text-sm font-medium">Files</p>
                      <p className="text-sm text-neutral-500">
                        12 files uploaded
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800">
                      <p className="text-sm font-medium">Notes</p>
                      <p className="text-sm text-neutral-500">
                        5 collaborative notes
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
