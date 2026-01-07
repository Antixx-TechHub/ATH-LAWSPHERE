/**
 * Knowledge Map Page
 * View and generate knowledge graphs for chat sessions
 */

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { DashboardLayout } from '../../../components/layout/dashboard-layout';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { 
  Loader2, MessageSquare, RefreshCw, ChevronRight, 
  Network, Calendar, FileText, StickyNote, ArrowLeft
} from 'lucide-react';

// Dynamically import KnowledgeGraph to avoid SSR issues with ReactFlow
const KnowledgeGraphWrapper = dynamic(
  () => import('../../../components/knowledge-graph').then(mod => mod.KnowledgeGraphWrapper),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[500px] bg-muted/30 rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
);

interface SessionItem {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    messages: number;
    notes: number;
    files: number;
  };
  hasGraph?: boolean;
}

export default function KnowledgeMapPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<SessionItem | null>(null);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sessions');
      if (response.ok) {
        const data = await response.json();
        // API returns array directly with snake_case fields, transform to expected format
        const rawSessions = Array.isArray(data) ? data : (data.sessions || []);
        const transformedSessions: SessionItem[] = rawSessions.map((s: Record<string, unknown>) => ({
          id: s.id as string,
          name: (s.name || s.title || 'Untitled Session') as string,
          createdAt: (s.createdAt || s.created_at || new Date().toISOString()) as string,
          updatedAt: (s.updatedAt || s.updated_at || new Date().toISOString()) as string,
          _count: s._count as SessionItem['_count'] || {
            messages: (s.message_count as number) || 0,
            notes: 0,
            files: (s.file_count as number) || 0
          },
          hasGraph: s.hasGraph as boolean
        }));
        setSessions(transformedSessions);

        // If sessionId is in URL, select that session
        if (sessionId) {
          const session = transformedSessions.find((s: SessionItem) => s.id === sessionId);
          if (session) {
            setSelectedSession(session);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [sessionId]);

  const handleSessionSelect = (session: SessionItem) => {
    setSelectedSession(session);
    router.push(`/dashboard/knowledge-map?session=${session.id}`);
  };

  const handleBack = () => {
    setSelectedSession(null);
    router.push('/dashboard/knowledge-map');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6 pb-16 md:pb-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {selectedSession && (
              <Button variant="ghost" size="sm" onClick={handleBack} className="h-8 w-8 p-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <h1 className="text-xl md:text-3xl font-serif font-bold tracking-tight flex items-center gap-2">
                <Network className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                Knowledge Map
              </h1>
              <p className="text-sm text-muted-foreground hidden sm:block">
                {selectedSession 
                  ? `Viewing: ${selectedSession.name}`
                  : 'Visualize entities and relationships from your chat sessions'
                }
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchSessions} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Main Content */}
        {selectedSession ? (
          /* Knowledge Graph View */
          <div className="space-y-4">
            {/* Session Info Card */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-semibold">{selectedSession.name}</h2>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(selectedSession.updatedAt)}
                        </span>
                        {selectedSession._count && (
                          <>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {selectedSession._count.messages} messages
                            </span>
                            <span className="flex items-center gap-1">
                              <StickyNote className="h-3 w-3" />
                              {selectedSession._count.notes} notes
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {selectedSession._count.files} files
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/chat?session=${selectedSession.id}`)}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Open Chat
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Knowledge Graph */}
            <KnowledgeGraphWrapper 
              sessionId={selectedSession.id} 
              sessionName={selectedSession.name}
            />
          </div>
        ) : (
          /* Session List View */
          <>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : sessions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Network className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">No Chat Sessions</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Start a chat session to generate knowledge maps
                  </p>
                  <Button className="mt-4" onClick={() => router.push('/dashboard/chat')}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Start New Chat
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {sessions.map((session) => (
                  <Card 
                    key={session.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleSessionSelect(session)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <MessageSquare className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-medium text-sm truncate">{session.name}</h3>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(session.updatedAt)}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                      
                      {session._count && (
                        <div className="mt-3 pt-3 border-t flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {session._count.messages}
                          </span>
                          <span className="flex items-center gap-1">
                            <StickyNote className="h-3 w-3" />
                            {session._count.notes}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {session._count.files}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
