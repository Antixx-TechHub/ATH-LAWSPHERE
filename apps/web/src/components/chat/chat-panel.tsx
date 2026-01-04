"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Send,
  Paperclip,
  Bot,
  User,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Sparkles,
  Shield,
  ShieldCheck,
  Cloud,
  Lock,
  FileText,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { TrustBadge } from "./trust-badge";
import { aiClient } from "@/lib/api/ai-client";

// Attached document interface
interface AttachedDocument {
  id: string;
  name: string;
  content: string;
  size: number;
}

interface ChatPanelProps {
  sessionId: string;
  onSessionUpdate?: () => void;
}

interface TrustInfo {
  is_local: boolean;
  trust_badge: string;
  trust_message: string;
  trust_details: string[];
  sensitivity_level: string;
  pii_detected: boolean;
  document_attached: boolean;
  model_used: string;
  model_provider: string;
  audit_id: string;
}

interface Message {
  id: string;
  type: "user" | "ai" | "system";
  content: string;
  timestamp: Date;
  model?: string;
  trust?: TrustInfo;
  user?: {
    name: string;
    avatar?: string;
  };
}

const AI_MODELS = [
  // Auto Mode - Recommended for privacy-first automatic routing
  { id: "auto", name: "🤖 Auto (Recommended)", provider: "Smart", cost: "Optimized", isLocal: null, available: true, isAuto: true },
  // Local Models (Secure) - Ordered by speed on CPU
  { id: "qwen2.5-3b", name: "Qwen 2.5 3B (Fast)", provider: "Local", cost: "FREE", isLocal: true, available: false },
  { id: "qwen2.5-7b", name: "Qwen 2.5 7B", provider: "Local", cost: "FREE", isLocal: true, available: true },
  { id: "qwen2.5-14b", name: "Qwen 2.5 14B", provider: "Local", cost: "FREE", isLocal: true, available: true },
  { id: "llama3.1-8b", name: "Llama 3.1 8B", provider: "Local", cost: "FREE", isLocal: true, available: true },
  // Cloud Models - Fast and cheap
  { id: "gpt-5-mini", name: "GPT-5 Mini", provider: "OpenAI", cost: "₹0.006/1K", isLocal: false, available: true },
  { id: "gemini-flash", name: "Gemini 2.0 Flash", provider: "Google", cost: "₹0.006/1K", isLocal: false, available: true },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", cost: "₹0.01/1K", isLocal: false, available: true },
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", cost: "₹0.40/1K", isLocal: false, available: true },
  { id: "claude-3-sonnet", name: "Claude 3 Sonnet", provider: "Anthropic", cost: "₹0.25/1K", isLocal: false, available: true },
];

const initialMessages: Message[] = [
  {
    id: "1",
    type: "system",
    content: "Welcome to Lawsphere AI Assistant. How can I help you with your legal research today?",
    timestamp: new Date(),
  },
];

export function ChatPanel({ sessionId, onSessionUpdate }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("auto");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionCost, setSessionCost] = useState({ totalInr: 0, savedInr: 0, queries: 0 });
  const [attachedDocs, setAttachedDocs] = useState<AttachedDocument[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load persisted context when session changes
  useEffect(() => {
    const loadContext = async () => {
      if (!sessionId) return;
      try {
        const ctx = await aiClient.getSessionContext(sessionId);
        const restored: Message[] = (ctx.messages || []).map((m: any) => ({
          id: String(m.id),
          type: m.role === "assistant" ? "ai" : (m.role as "user" | "system" | "ai"),
          content: m.content,
          timestamp: m.created_at ? new Date(m.created_at) : new Date(),
          model: m.metadata?.model,
        }));
        setMessages(restored.length ? restored : initialMessages);
        
        // Restore session cost from context if available
        if (ctx.session_cost) {
          setSessionCost({
            totalInr: ctx.session_cost.totalInr || 0,
            savedInr: ctx.session_cost.savedInr || 0,
            queries: ctx.session_cost.queries || 0,
          });
        } else {
          setSessionCost({ totalInr: 0, savedInr: 0, queries: 0 });
        }
      } catch (err) {
        console.error("Failed to load session context", err);
        setMessages(initialMessages);
        setSessionCost({ totalInr: 0, savedInr: 0, queries: 0 });
      }
    };
    loadContext();
    setAttachedDocs([]);
  }, [sessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Handle file attachment
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Supported text-based formats
    const supportedTypes = [
      'text/plain',
      'text/markdown',
      'application/json',
    ];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Check if it's a text-based file or small enough to read
        const isTextFile = supportedTypes.includes(file.type) || 
                           file.name.endsWith('.txt') || 
                           file.name.endsWith('.md') ||
                           file.name.endsWith('.json');

        if (!isTextFile && file.size > 100000) {
          alert(`File "${file.name}" is too large. Please use .txt, .md, or .json files for attachment. For PDFs and DOCx, use the Files page.`);
          continue;
        }

        const content = await file.text();
        
        // Limit content size for context window
        const maxChars = 50000;
        const truncatedContent = content.length > maxChars 
          ? content.substring(0, maxChars) + '\n\n[... Content truncated for size ...]'
          : content;

        const docId = `doc-${Date.now()}-${i}`;
        
        setAttachedDocs(prev => [...prev, {
          id: docId,
          name: file.name,
          content: truncatedContent,
          size: file.size,
        }]);

        // Also upload the file to the session so it appears in the Files tab
        try {
          if (sessionId) {
            await aiClient.uploadFile(file, sessionId);
          }
        } catch (uploadErr) {
          console.error('Upload failed for', file.name, uploadErr);
        }

        // Add system message about attachment
        const attachmentMsg: Message = {
          id: Date.now().toString() + `-${i}`,
          type: 'system',
          content: `📎 Document attached: **${file.name}** (${(file.size / 1024).toFixed(1)} KB). You can now ask questions about this document.`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, attachmentMsg]);
      }
      
      // Notify parent to update session info
      onSessionUpdate?.();
    } catch (error) {
      alert('Could not read one or more files. Please try different files.');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleRemoveAttachment = (docId: string) => {
    const doc = attachedDocs.find(d => d.id === docId);
    setAttachedDocs(prev => prev.filter(d => d.id !== docId));
    
    if (doc) {
      const removeMsg: Message = {
        id: Date.now().toString(),
        type: 'system',
        content: `📎 Document "${doc.name}" removed from context.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, removeMsg]);
      onSessionUpdate?.();
    }
  };

  const handleRemoveAllAttachments = () => {
    setAttachedDocs([]);
    const removeMsg: Message = {
      id: Date.now().toString(),
      type: 'system',
      content: '📎 Document removed from context.',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, removeMsg]);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input,
      timestamp: new Date(),
      user: {
        name: "You",
      },
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Build message content - include document context if attached
      let userContent = input;
      if (attachedDocs.length > 0) {
        const docsContent = attachedDocs
          .map(doc => `[ATTACHED DOCUMENT: ${doc.name}]

--- DOCUMENT CONTENT START ---
${doc.content}
--- DOCUMENT CONTENT END ---`)
          .join('\n\n');
        
        userContent = `${docsContent}

USER QUESTION: ${input}`;
      }

      // Build previous messages for context
      const prevMessages = messages
        .filter((m) => m.type !== 'system')
        .map((m) => {
          if (!m.content || typeof m.content !== 'string' || !m.content.trim()) {
            return null;
          }
          // Map frontend "ai" type to backend "assistant" role
          const role = m.type === 'ai' ? 'assistant' : m.type;
          return {
            role: role as 'user' | 'assistant',
            content: m.content,
          };
        })
        .filter((msg): msg is { role: 'user' | 'assistant'; content: string } => 
          msg !== null && !!msg.role && !!msg.content
        );

      // Build the final messages array
      const finalMessages = [
        ...prevMessages,
        { role: 'user' as const, content: userContent },
      ];
      
      console.log('[Chat] Sending messages:', finalMessages.length, 'messages');
      console.log('[Chat] Last message content length:', userContent.length);
      console.log('[Chat] All messages being sent:', JSON.stringify(finalMessages, null, 2));

      // Use Trust Chat API for privacy-aware routing
      console.log('[Chat] Sending request...');
      const data = await aiClient.trustChat({
        messages: finalMessages,
        model: selectedModel,
        temperature: 0.7,
        session_id: sessionId,
        document_attached: attachedDocs.length > 0,
      });

      // Debug - log the full response
      console.log('[Chat] Full response:', data);
      console.log('[Chat] Full response JSON:', JSON.stringify(data, null, 2));
      console.log('[Chat] data.message:', data.message);
      console.log('[Chat] data.message?.content:', data.message?.content);
      console.log('[Chat] data.message?.content type:', typeof data.message?.content);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: data.message?.content || 'No response content received.',
        timestamp: new Date(),
        model: data.model,
        trust: data.trust,  // Backend sends "trust", not "trust_info"
      };
      
      // Debug log
      console.log('AI Response data:', { 
        hasMessage: !!data.message, 
        contentLength: data.message?.content?.length || 0,
        trust: data.trust?.trust_badge 
      });
      
      setMessages((prev) => [...prev, aiMessage]);
      
      // Update session cost tracking
      if (data.cost) {
        setSessionCost((prev) => ({
          totalInr: prev.totalInr + (data.cost?.estimated_cost_inr || 0),
          savedInr: prev.savedInr + (data.cost?.saved_vs_cloud_inr || 0),
          queries: prev.queries + 1,
        }));
      }
      
      // Record analytics for cost tracking
      try {
        await fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            messageId: aiMessage.id,
            role: 'assistant',
            model: data.model,
            modelProvider: data.trust?.model_provider || 'unknown',
            isLocal: data.trust?.is_local || false,
            sensitivityLevel: data.trust?.sensitivity_level,
            piiDetected: data.trust?.pii_detected || false,
            inputTokens: 0, // Not returned by API yet
            outputTokens: 0,
            actualCost: data.cost?.estimated_cost_usd || 0,
            cloudCost: (data.cost?.estimated_cost_usd || 0) + (data.cost?.saved_vs_cloud_usd || 0),
            costSaved: data.cost?.saved_vs_cloud_usd || 0,
            latencyMs: data.latency_ms || 0,
            routingTimeMs: data.routing_time_ms || 0,
            auditId: data.trust?.audit_id,
          }),
        });
      } catch (analyticsErr) {
        console.warn('Failed to record analytics:', analyticsErr);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: `⚠️ Error connecting to AI service. Please try again in a moment. If the problem persists, the AI service may be starting up. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        model: selectedModel,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      {/* Chat Header - Responsive */}
      <div className="flex items-center justify-between p-2 md:p-3 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="p-1 md:p-1.5 rounded-md bg-primary-100 dark:bg-primary-900/20">
            <Sparkles className="h-3 w-3 md:h-4 md:w-4 text-primary-600" />
          </div>
          <div>
            <h2 className="font-semibold text-xs md:text-sm">AI Legal Assistant</h2>
            <p className="text-[10px] md:text-xs text-neutral-500 hidden sm:block">
              Privacy-first multi-model AI
            </p>
          </div>
        </div>

        {/* Session Cost Display - Compact on mobile */}
        <div className="flex items-center gap-2 md:gap-3">
          {sessionCost.queries > 0 && (
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <div className="flex flex-col items-end">
                <span className="text-neutral-500">
                  {sessionCost.queries} queries
                </span>
                <div className="flex items-center gap-1">
                  {sessionCost.totalInr === 0 ? (
                    <span className="text-green-600 font-medium">₹0 (FREE)</span>
                  ) : (
                    <span className="text-neutral-600">₹{sessionCost.totalInr.toFixed(4)}</span>
                  )}
                  {sessionCost.savedInr > 0 && (
                    <span className="text-green-600 text-[10px]">
                      (saved ₹{sessionCost.savedInr.toFixed(2)})
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Model Selector with Trust Indicators - Compact on mobile */}
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-[120px] md:w-[200px] h-7 md:h-8 text-[10px] md:text-xs">
              <SelectValue placeholder="Model" />
            </SelectTrigger>
            <SelectContent>
            {/* Auto Mode - Recommended */}
            <div className="px-2 py-1 text-[10px] font-semibold text-purple-600 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> SMART AUTO
            </div>
            {AI_MODELS.filter(m => m.isAuto).map((model) => (
              <SelectItem key={model.id} value={model.id}>
                <div className="flex items-center justify-between w-full gap-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-purple-500" />
                    <span>{model.name}</span>
                  </div>
                  <span className="text-[10px] text-purple-600 font-medium">
                    {model.cost}
                  </span>
                </div>
              </SelectItem>
            ))}
            {/* Local Models Group */}
            <div className="px-2 py-1 text-[10px] font-semibold text-green-600 flex items-center gap-1 mt-1 border-t">
              <Lock className="h-3 w-3" /> SECURE LOCAL
            </div>
            {AI_MODELS.filter(m => m.isLocal === true).map((model) => (
              <SelectItem key={model.id} value={model.id}>
                <div className="flex items-center justify-between w-full gap-2">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3 w-3 text-green-500" />
                    <span>{model.name}</span>
                  </div>
                  <span className="text-[10px] text-green-600 font-medium">
                    {model.cost}
                  </span>
                </div>
              </SelectItem>
            ))}
            {/* Cloud Models Group */}
            <div className="px-2 py-1 text-[10px] font-semibold text-blue-600 flex items-center gap-1 mt-1 border-t">
              <Cloud className="h-3 w-3" /> CLOUD
            </div>
            {AI_MODELS.filter(m => m.isLocal === false).map((model) => (
              <SelectItem key={model.id} value={model.id}>
                <div className="flex items-center justify-between w-full gap-2">
                  <div className="flex items-center gap-1.5">
                    <Cloud className="h-3 w-3 text-blue-500" />
                    <span>{model.name}</span>
                  </div>
                  <span className="text-[10px] text-neutral-500">
                    {model.cost}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        </div>
      </div>

      {/* Messages - Mobile Responsive */}
      <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-3 md:space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-2 md:gap-3 message-enter",
              message.type === "user" && "flex-row-reverse"
            )}
          >
            {/* Avatar - Smaller on mobile */}
            <Avatar className="h-6 w-6 md:h-8 md:w-8 flex-shrink-0">
              {message.type === "ai" ? (
                <AvatarFallback className="bg-primary-100 text-primary-700">
                  <Bot className="h-3 w-3 md:h-4 md:w-4" />
                </AvatarFallback>
              ) : message.type === "system" ? (
                <AvatarFallback className="bg-neutral-100 text-neutral-700">
                  <Sparkles className="h-3 w-3 md:h-4 md:w-4" />
                </AvatarFallback>
              ) : (
                <AvatarFallback className="bg-accent-100 text-accent-700">
                  <User className="h-3 w-3 md:h-4 md:w-4" />
                </AvatarFallback>
              )}
            </Avatar>

            {/* Message Content */}
            <div
              className={cn(
                "flex flex-col max-w-[80%] min-w-0",
                message.type === "user" && "items-end"
              )}
            >
              <div
                className={cn(
                  "rounded-md p-3 overflow-hidden",
                  message.type === "user"
                    ? "bg-primary-600 text-white"
                    : message.type === "system"
                    ? "bg-neutral-100 dark:bg-neutral-800"
                    : "bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
                )}
              >
                {message.type === "ai" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm overflow-x-auto [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_code]:break-words [&_code]:whitespace-pre-wrap">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-xs whitespace-pre-wrap break-words">{message.content}</p>
                )}
              </div>

              {/* Message Meta */}
              <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500">
                <span>
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {message.trust ? (
                  /* Show trust info from API */
                  <>
                    <span className="text-neutral-400">•</span>
                    <span 
                      className={cn(
                        "flex items-center gap-1 font-medium",
                        message.trust.is_local ? "text-green-600" : "text-blue-600"
                      )}
                      title={message.trust.trust_message}
                    >
                      {message.trust.is_local ? (
                        <><ShieldCheck className="h-3 w-3" /> {message.trust.trust_badge}</>
                      ) : (
                        <><Cloud className="h-3 w-3" /> {message.trust.trust_badge}</>
                      )}
                    </span>
                    <span className="text-neutral-400">•</span>
                    <span className="text-primary-600">
                      {message.trust.model_used}
                    </span>
                  </>
                ) : message.model && (
                  /* Fallback to basic model info */
                  <>
                    {AI_MODELS.find((m) => m.id === message.model)?.isLocal ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <ShieldCheck className="h-3 w-3" />
                        <span>Local</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-blue-600">
                        <Cloud className="h-3 w-3" />
                        <span>Cloud</span>
                      </span>
                    )}
                    <span className="text-neutral-400">•</span>
                    <span className="text-primary-600">
                      {AI_MODELS.find((m) => m.id === message.model)?.name}
                    </span>
                  </>
                )}
              </div>

              {/* Trust Details - Show privacy info if detected */}
              {message.trust && message.trust.pii_detected && (
                <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded text-xs">
                  <div className="flex items-center gap-1 text-green-700 dark:text-green-400 font-medium mb-1">
                    <ShieldCheck className="h-3 w-3" />
                    Privacy Protected
                  </div>
                  <div className="text-green-600 dark:text-green-500 text-[11px]">
                    {message.trust.trust_message}
                  </div>
                  {message.trust.trust_details && message.trust.trust_details.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-green-600 dark:text-green-500 text-[10px] list-disc list-inside">
                      {message.trust.trust_details.map((detail, idx) => (
                        <li key={idx}>{detail}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* AI Message Actions */}
              {message.type === "ai" && (
                <div className="flex items-center gap-1 mt-2">
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <ThumbsUp className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <ThumbsDown className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-2 md:gap-3">
            <Avatar className="h-6 w-6 md:h-8 md:w-8">
              <AvatarFallback className="bg-primary-100 text-primary-700">
                <Bot className="h-3 w-3 md:h-4 md:w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-md p-2 md:p-3 border border-neutral-200 dark:border-neutral-700">
              <div className="typing-indicator flex gap-1">
                <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full" />
                <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full" />
                <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Mobile Responsive */}
      <form
        onSubmit={handleSubmit}
        className="p-2 md:p-3 border-t border-neutral-200 dark:border-neutral-800"
      >
        {/* Attached Documents Indicator */}
        {attachedDocs.length > 0 && (
          <div className="mb-2 space-y-1 md:space-y-1.5 p-1.5 md:p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            {attachedDocs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-1.5 md:gap-2">
                <FileText className="h-3 w-3 md:h-4 md:w-4 text-blue-600 flex-shrink-0" />
                <span className="text-xs md:text-sm text-blue-700 dark:text-blue-400 flex-1 truncate">
                  {doc.name} ({(doc.size / 1024).toFixed(1)} KB)
                </span>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5 md:h-6 md:w-6 text-blue-600 hover:text-red-600"
                  onClick={() => handleRemoveAttachment(doc.id)}
                >
                  <X className="h-2.5 w-2.5 md:h-3 md:w-3" />
                </Button>
              </div>
            ))}
            {attachedDocs.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full mt-1 text-[10px] md:text-xs"
                onClick={handleRemoveAllAttachments}
              >
                Remove all
              </Button>
            )}
          </div>
        )}

        <div className="flex gap-1.5 md:gap-2">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.json,text/plain,text/markdown,application/json"
            onChange={handleFileSelect}
            multiple
            className="hidden"
          />
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            className={cn("h-8 w-8 flex-shrink-0", attachedDocs.length > 0 && "text-blue-600")}
            onClick={() => fileInputRef.current?.click()}
            title={`Attach documents (.txt, .md, .json) - ${attachedDocs.length} attached`}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={attachedDocs.length > 0 ? "Ask about document..." : "Ask a legal question..."}
            className="min-h-[36px] max-h-20 md:max-h-24 resize-none text-xs md:text-sm flex-1"
            rows={1}
          />
          <Button type="submit" disabled={!input.trim() || isLoading} className="h-8 px-2 md:px-3 flex-shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[9px] md:text-[10px] text-neutral-500 mt-1 md:mt-1.5 text-center hidden sm:block">
          {attachedDocs.length > 0
            ? `📎 ${attachedDocs.length} Document${attachedDocs.length > 1 ? 's' : ''} attached • Press Enter to send` 
            : "Press Enter to send, Shift + Enter for new line • Click 📎 to attach .txt files"}
        </p>
      </form>
    </div>
  );
}
