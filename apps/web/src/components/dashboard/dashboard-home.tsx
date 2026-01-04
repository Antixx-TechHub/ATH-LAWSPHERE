"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  FileText,
  StickyNote,
  Users,
  TrendingUp,
  Clock,
  Plus,
  ArrowRight,
  Bot,
  Loader2,
  IndianRupee,
} from "lucide-react";
import { aiClient } from "@/lib/api/ai-client";

interface DashboardHomeProps {
  user?: {
    id?: string;
    name?: string | null;
    email?: string;
  };
}

interface Session {
  id: string;
  title: string;
  updated_at: string;
  last_message_preview?: string;
}

interface AnalyticsData {
  summary: {
    totalMessages: number;
    totalCost: number;
    totalSaved: number;
    totalCloudCost: number;
    savingsPercent: number;
    totalTokens: number;
    avgLatency: number;
  };
  routing: {
    localMessages: number;
    cloudMessages: number;
    piiDetectedCount: number;
    localPercent: number;
  };
}

const quickActions = [
  {
    title: "New Chat Session",
    description: "Start a new AI-powered legal chat",
    href: "/dashboard/chat",
    icon: MessageSquare,
    color: "bg-primary-600 hover:bg-primary-700",
  },
  {
    title: "Upload Documents",
    description: "Add files for analysis",
    href: "/dashboard/files",
    icon: FileText,
    color: "bg-accent-600 hover:bg-accent-700",
  },
  {
    title: "Create Note",
    description: "Start a collaborative note",
    href: "/dashboard/notes",
    icon: StickyNote,
    color: "bg-amber-600 hover:bg-amber-700",
  },
];

export function DashboardHome({ user }: DashboardHomeProps) {
  const { data: authSession } = useSession();
  const userId = authSession?.user?.id || authSession?.user?.email || user?.id || user?.email;
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalFiles, setTotalFiles] = useState(0);
  const [totalNotes, setTotalNotes] = useState(0);
  const [greeting, setGreeting] = useState("Hello"); // Static default for SSR
  const [mounted, setMounted] = useState(false);

  // Set greeting on client only to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!mounted) return;
      
      try {
        setLoading(true);
        
        // Load sessions
        const sessionList = await aiClient.listSessions(userId);
        setSessions(sessionList.slice(0, 5)); // Show last 5
        
        // Count files and notes across sessions
        let filesCount = 0;
        let notesCount = 0;
        for (const session of sessionList.slice(0, 10)) { // Check first 10 sessions
          try {
            const ctx = await aiClient.getSessionContext(session.id);
            filesCount += ctx.files?.length || 0;
            notesCount += ctx.notes?.length || 0;
          } catch (e) {
            console.warn('Failed to get context for session', session.id);
          }
        }
        setTotalFiles(filesCount);
        setTotalNotes(notesCount);
        
        // Load analytics
        const analyticsRes = await fetch('/api/analytics?range=week');
        if (analyticsRes.ok) {
          const data = await analyticsRes.json();
          setAnalytics(data);
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (mounted && userId) {
      loadDashboardData();
    } else if (mounted) {
      setLoading(false);
    }
  }, [userId, mounted]);
  
  // Build stats from real data
  const stats = [
    {
      title: "Active Sessions",
      value: loading ? "-" : sessions.length.toString(),
      icon: Users,
      color: "text-primary-600",
      bgColor: "bg-primary-100",
    },
    {
      title: "Documents",
      value: loading ? "-" : totalFiles.toString(),
      icon: FileText,
      color: "text-accent-600",
      bgColor: "bg-accent-100",
    },
    {
      title: "AI Interactions",
      value: loading ? "-" : (analytics?.summary.totalMessages || 0).toString(),
      icon: Bot,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Notes",
      value: loading ? "-" : totalNotes.toString(),
      icon: StickyNote,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
    },
  ];

  // Format relative time
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4 md:space-y-5 pb-16 md:pb-0">
      {/* Welcome Section */}
      <div>
        <h1 className="text-lg md:text-xl font-display font-bold text-neutral-900 dark:text-white">
          {greeting}, {user?.name?.split(" ")[0] || "there"}!
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 mt-0.5 text-xs md:text-sm hidden sm:block">
          Here's what's happening with your legal work today.
        </p>
      </div>

      {/* Stats Grid - Mobile Responsive */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-start md:items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] md:text-xs font-medium text-neutral-600 dark:text-neutral-400 truncate">
                    {stat.title}
                  </p>
                  <p className="text-lg md:text-xl font-bold mt-0.5">
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      stat.value
                    )}
                  </p>
                </div>
                <div className={`p-1.5 md:p-2 rounded-md ${stat.bgColor} flex-shrink-0`}>
                  <stat.icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cost Savings Card */}
      {analytics && analytics.summary.totalSaved > 0 && (
        <Card className="bg-gradient-to-r from-accent-50 to-primary-50 dark:from-accent-900/20 dark:to-primary-900/20 border-accent-200 dark:border-accent-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-accent-700 dark:text-accent-300 font-medium">
                  💰 Cost Savings This Week
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-accent-700 dark:text-accent-300 flex items-center">
                    <IndianRupee className="h-5 w-5" />
                    {(analytics.summary.totalSaved * 83).toFixed(2)}
                  </span>
                  <span className="text-sm text-accent-600 dark:text-accent-400">
                    saved vs cloud
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-accent-600">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">{analytics.routing.localPercent}%</span>
                </div>
                <p className="text-xs text-accent-600 dark:text-accent-400">local processing</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-xs md:text-sm font-semibold flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5 md:h-4 md:w-4" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-4 pb-4">
              {quickActions.map((action) => (
                <Link key={action.href} href={action.href}>
                  <div className="flex items-center gap-2 md:gap-3 p-2 rounded-md border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                    <div className={`p-1 md:p-1.5 rounded-md ${action.color}`}>
                      <action.icon className="h-3.5 w-3.5 md:h-4 md:w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs">{action.title}</p>
                      <p className="text-[10px] text-neutral-500 hidden sm:block">
                        {action.description}
                      </p>
                    </div>
                    <ArrowRight className="h-3 w-3 md:h-3.5 md:w-3.5 text-neutral-400 flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recent Sessions - Mobile Responsive */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
              <CardTitle className="text-xs md:text-sm font-semibold flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 md:h-4 md:w-4" />
                Recent Sessions
              </CardTitle>
              <Link href="/dashboard/sessions">
                <Button variant="ghost" size="sm" className="h-7 text-xs px-2">
                  View all
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-8 w-8 mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
                  <p className="text-sm text-neutral-500">No sessions yet</p>
                  <Link href="/dashboard/chat">
                    <Button variant="outline" size="sm" className="mt-2">
                      Start your first chat
                    </Button>
                  </Link>
                </div>
              ) : (
              <div className="space-y-2 md:space-y-3">
                {sessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/dashboard/chat?session=${session.id}`}
                  >
                    <div className="flex items-center justify-between p-2 md:p-3 rounded-md border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                      <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                        <div className="p-1 md:p-1.5 rounded-md bg-primary-100 dark:bg-primary-900/20 flex-shrink-0">
                          <MessageSquare className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-xs md:text-sm truncate">{session.title || "Untitled Session"}</p>
                          {session.last_message_preview && (
                          <p className="text-[10px] md:text-xs text-neutral-500 hidden sm:block truncate">
                            {session.last_message_preview}
                          </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[10px] md:text-xs text-neutral-500">
                          {formatRelativeTime(session.updated_at)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
