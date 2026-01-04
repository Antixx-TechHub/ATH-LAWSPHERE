"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
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
  const { data: authSession } = useSession();
  const userId = authSession?.user?.id || authSession?.user?.email;
  
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
    // Wait for auth to be ready before initializing
    if (!userId) return;
    
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
          // Don't pass title - API will generate default name with date
          const created = await aiClient.createSession(undefined, userId);
          console.log("[Chat] Created session:", created);
          if (created && created.id) {
            setSessionId(created.id);
          } else {
            // Fallback to local session if creation failed
            console.warn("[Chat] Session creation returned invalid response, using local session");
            setSessionId("local-" + Date.now());
          }
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
  }, [sessionParam, userId]);

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
    <div className="h-[calc(100vh-6rem)] md:h-[calc(100vh-6rem)]">
      {/* Error Banner */}
      {error && (
        <div className="mb-2 md:mb-4 p-2 md:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-xs md:text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Panel Toggle Tabs - Scrollable on mobile */}
      <div className="flex items-center justify-between mb-2 md:mb-4 overflow-x-auto">
        <div className="flex gap-1 md:gap-2 flex-shrink-0">
          <Button
            variant={activePanel === "chat" ? "default" : "outline"}
            size="sm"
            onClick={() => setActivePanel("chat")}
            className="text-xs md:text-sm px-2 md:px-3"
          >
            <MessageSquare className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            <span className="hidden xs:inline">Chat</span>
          </Button>
          <Button
            variant={activePanel === "files" ? "default" : "outline"}
            size="sm"
            onClick={() => setActivePanel("files")}
            className="text-xs md:text-sm px-2 md:px-3"
          >
            <FileText className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            <span className="hidden xs:inline">Files</span>
          </Button>
          <Button
            variant={activePanel === "notes" ? "default" : "outline"}
            size="sm"
            onClick={() => setActivePanel("notes")}
            className="text-xs md:text-sm px-2 md:px-3"
          >
            <StickyNote className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            <span className="hidden xs:inline">Notes</span>
          </Button>
        </div>

        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
          <div className="hidden md:flex items-center gap-2 text-sm text-neutral-500">
            <Users className="h-4 w-4" />
            <span>3 online</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className="hidden md:flex h-8 w-8"
          >
            {rightPanelOpen ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Main Content - Stack on mobile, side-by-side on desktop */}
      <div className="flex flex-col md:flex-row gap-2 md:gap-4 h-[calc(100%-3rem)]">
        {/* Left Panel - Chat (full width on mobile, or when files/notes tab is not active) */}
        <div
          className={cn(
            "transition-all duration-300",
            // On mobile: full height when chat active, hidden otherwise
            activePanel === "chat" ? "flex-1" : "hidden md:block",
            // On desktop: flex with right panel
            rightPanelOpen ? "md:w-2/3" : "md:w-full"
          )}
        >
          {sessionId ? (
            <ChatPanel 
              sessionId={sessionId} 
              onSessionUpdate={() => loadSessionData(sessionId)} 
              refreshSignal={refreshSignal}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
              <div className="text-center">
                <p className="text-neutral-500 mb-2">Unable to load chat session</p>
                <Button onClick={() => window.location.reload()} variant="outline" size="sm">
                  Retry
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Files/Notes (full width on mobile when active) */}
        <div className={cn(
          "transition-all duration-300",
          // On mobile: show only when files or notes tab is active
          activePanel !== "chat" ? "flex-1" : "hidden md:block",
          // On desktop: side panel with fixed width
          rightPanelOpen ? "md:w-1/3 md:min-w-[280px]" : "md:hidden"
        )}>
          {activePanel === "files" ? (
            sessionId ? <FilesPanel sessionId={sessionId} onFilesChanged={() => loadSessionData(sessionId)} refreshSignal={refreshSignal} /> : null
          ) : activePanel === "notes" ? (
            sessionId ? <NotesPanel sessionId={sessionId} /> : null
          ) : (
            sessionId ? <SessionInfoPanel sessionId={sessionId} files={sessionFiles} chatFiles={chatFiles} /> : null
          )}
        </div>
      </div>
    </div>
  );
}
