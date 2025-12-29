"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ChatPanel } from "@/components/chat/chat-panel";
import { FilesPanel } from "@/components/chat/files-panel";
import { NotesPanel } from "@/components/chat/notes-panel";
import { SessionInfoPanel } from "@/components/chat/session-info-panel";
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
import { aiClient } from "@/lib/api/ai-client";

type ActivePanel = "chat" | "files" | "notes";

export default function ChatPage() {
  const searchParams = useSearchParams();
  const sessionParam = searchParams.get("session");
  
  const [activePanel, setActivePanel] = useState<ActivePanel>("chat");
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionFiles, setSessionFiles] = useState<any[]>([]);
  const [chatFiles, setChatFiles] = useState<any[]>([]);
  const [refreshSignal, setRefreshSignal] = useState(0);

  const loadSessionData = async (id: string) => {
    try {
      // Load uploaded files
      const res = await aiClient.listSessionFiles(id);
      setSessionFiles(res.files || []);
      // Increment refresh signal so FilesPanel can react
      setRefreshSignal((prev) => prev + 1);
      
      // Load chat context to get messages with file references
      const context = await aiClient.getSessionContext(id);
      if (context.messages) {
        // Extract files from system messages that indicate attachments
        // These messages look like: "📎 Document attached: **filename.txt** (size KB)"
        const filesFromChat = context.messages
          .filter((msg: any) => 
            msg.type === "system" && 
            msg.content?.includes("Document attached:") &&
            !msg.content?.includes("Document removed")
          )
          .map((msg: any) => {
            // Parse the system message: "📎 Document attached: **filename.txt** (123.5 KB)"
            const match = msg.content?.match(/Document attached: \*\*(.+?)\*\* \((.+?) KB\)/);
            if (match) {
              const filename = match[1];
              const sizeStr = match[2];
              const sizeKB = parseFloat(sizeStr);
              return {
                id: msg.id,
                name: filename,
                size: sizeKB * 1024, // Convert back to bytes
                mime_type: filename.endsWith(".md") ? "text/markdown" : 
                          filename.endsWith(".json") ? "application/json" : 
                          "text/plain",
                status: "ready",
                uploaded_at: msg.timestamp,
                from_chat: true,
              };
            }
            return null;
          })
          .filter((file: any) => file !== null);
        setChatFiles(filesFromChat);
      }
    } catch (err) {
      console.error("Failed to load session data", err);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use session from URL if provided, otherwise create new
        if (sessionParam) {
          setSessionId(sessionParam);
          // Fetch session files and chat data
          await loadSessionData(sessionParam);
        } else {
          const created = await aiClient.createSession("New Session");
          setSessionId(created.id);
        }
      } catch (err) {
        console.error("Unable to initialize session", err);
        setError("Failed to connect to AI service. Please ensure the service is running on port 8000.");
        setSessionId("local-" + Date.now());
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [sessionParam]);

  if (loading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-neutral-500">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)]">
      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

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
          {sessionId && <ChatPanel sessionId={sessionId} onSessionUpdate={() => loadSessionData(sessionId)} />}
        </div>

        {/* Right Panel - Files/Notes */}
        {rightPanelOpen && (
          <div className="w-1/3 min-w-[300px]">
            {activePanel === "files" ? (
              sessionId && <FilesPanel sessionId={sessionId} onFilesChanged={() => loadSessionData(sessionId)} refreshSignal={refreshSignal} />
            ) : activePanel === "notes" ? (
              sessionId && <NotesPanel sessionId={sessionId} />
            ) : (
              sessionId && <SessionInfoPanel sessionId={sessionId} files={sessionFiles} chatFiles={chatFiles} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
