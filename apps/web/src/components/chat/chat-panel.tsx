"use client";

import { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { TrustBadge } from "./trust-badge";

interface ChatPanelProps {
  sessionId: string;
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
  // Local Models (Secure) - Ordered by speed on CPU
  { id: "qwen2.5-3b", name: "Qwen 2.5 3B (Fast)", provider: "Local", cost: "FREE", isLocal: true, available: false },
  { id: "qwen2.5-7b", name: "Qwen 2.5 7B", provider: "Local", cost: "FREE", isLocal: true, available: true },
  { id: "llama3.1-8b", name: "Llama 3.1 8B", provider: "Local", cost: "FREE", isLocal: true, available: true },
  // Cloud Models - Fast and cheap
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

export function ChatPanel({ sessionId }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-flash");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
      // Call AI service API
      const response = await fetch('http://localhost:8000/api/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages.filter(m => m.type !== 'system').map(m => ({
            role: m.type === 'user' ? 'user' : 'assistant',
            content: m.content,
          })), { role: 'user', content: input }],
          model: selectedModel,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: data.message?.content || data.content || "No response received",
        timestamp: new Date(),
        model: selectedModel,
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: `⚠️ Error connecting to AI service. Make sure the AI service is running at http://localhost:8000 and your ${AI_MODELS.find((m) => m.id === selectedModel)?.name} API key is configured.`,
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
      {/* Chat Header */}
      <div className="flex items-center justify-between p-3 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary-100 dark:bg-primary-900/20">
            <Sparkles className="h-4 w-4 text-primary-600" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">AI Legal Assistant</h2>
            <p className="text-xs text-neutral-500">
              Privacy-first multi-model AI
            </p>
          </div>
        </div>

        {/* Model Selector with Trust Indicators */}
        <Select value={selectedModel} onValueChange={setSelectedModel}>
          <SelectTrigger className="w-[200px] h-8 text-xs">
            <SelectValue placeholder="Select Model" />
          </SelectTrigger>
          <SelectContent>
            {/* Local Models Group */}
            <div className="px-2 py-1 text-[10px] font-semibold text-green-600 flex items-center gap-1">
              <Lock className="h-3 w-3" /> SECURE LOCAL
            </div>
            {AI_MODELS.filter(m => m.isLocal).map((model) => (
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
            {AI_MODELS.filter(m => !m.isLocal).map((model) => (
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3 message-enter",
              message.type === "user" && "flex-row-reverse"
            )}
          >
            {/* Avatar */}
            <Avatar className="h-8 w-8 flex-shrink-0">
              {message.type === "ai" ? (
                <AvatarFallback className="bg-primary-100 text-primary-700">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              ) : message.type === "system" ? (
                <AvatarFallback className="bg-neutral-100 text-neutral-700">
                  <Sparkles className="h-4 w-4" />
                </AvatarFallback>
              ) : (
                <AvatarFallback className="bg-accent-100 text-accent-700">
                  <User className="h-4 w-4" />
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
                {message.model && (
                  <>
                    {/* Trust Indicator */}
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
                {/* Show trust info if available */}
                {message.trust && (
                  <span 
                    className={cn(
                      "flex items-center gap-1",
                      message.trust.is_local ? "text-green-600" : "text-blue-600"
                    )}
                    title={message.trust.trust_message}
                  >
                    {message.trust.is_local ? (
                      <><ShieldCheck className="h-3 w-3" /> Secure</>
                    ) : (
                      <><Cloud className="h-3 w-3" /> Cloud</>
                    )}
                  </span>
                )}
              </div>

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
          <div className="flex gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary-100 text-primary-700">
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-md p-3 border border-neutral-200 dark:border-neutral-700">
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

      {/* Input Area */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-neutral-200 dark:border-neutral-800"
      >
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a legal question..."
            className="min-h-[36px] max-h-24 resize-none text-sm"
            rows={1}
          />
          <Button type="submit" disabled={!input.trim() || isLoading} className="h-8">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-neutral-500 mt-1.5 text-center">
          Press Enter to send, Shift + Enter for new line
        </p>
      </form>
    </div>
  );
}
