/**
 * Case Timeline Component
 * Chronological visualization of case events and milestones
 */

'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Calendar,
  FileText,
  Gavel,
  AlertCircle,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Filter
} from 'lucide-react';

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  type: 'filing' | 'hearing' | 'order' | 'judgment' | 'deadline' | 'milestone' | 'document';
  importance: 'high' | 'medium' | 'low';
  relatedNodes?: string[];
  metadata?: Record<string, any>;
}

interface CaseTimelineProps {
  events: TimelineEvent[];
  caseId: string;
  onEventClick?: (event: TimelineEvent) => void;
  onAddEvent?: () => void;
}

const eventIcons: Record<string, any> = {
  filing: FileText,
  hearing: Calendar,
  order: Gavel,
  judgment: Gavel,
  deadline: AlertCircle,
  milestone: CheckCircle,
  document: FileText
};

const eventColors: Record<string, string> = {
  filing: 'bg-blue-500',
  hearing: 'bg-purple-500',
  order: 'bg-orange-500',
  judgment: 'bg-green-500',
  deadline: 'bg-red-500',
  milestone: 'bg-teal-500',
  document: 'bg-gray-500'
};

const importanceColors: Record<string, string> = {
  high: 'border-l-red-500',
  medium: 'border-l-yellow-500',
  low: 'border-l-gray-300'
};

export function CaseTimeline({
  events,
  caseId,
  onEventClick,
  onAddEvent
}: CaseTimelineProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Sort events by date
  const sortedEvents = useMemo(() => {
    let filtered = [...events];
    
    if (filter) {
      filtered = filtered.filter(e => e.type === filter);
    }
    
    return filtered.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [events, filter]);

  const displayEvents = showAll ? sortedEvents : sortedEvents.slice(0, 5);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const isUpcoming = (dateStr: string) => {
    return new Date(dateStr) > new Date();
  };

  const eventTypes = ['filing', 'hearing', 'order', 'judgment', 'deadline', 'milestone', 'document'];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Case Timeline
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={filter || ''}
                onChange={(e) => setFilter(e.target.value || null)}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="">All Events</option>
                {eventTypes.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            {onAddEvent && (
              <Button size="sm" variant="outline" onClick={onAddEvent}>
                Add Event
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No timeline events yet</p>
            <p className="text-sm">Events will appear here as they are extracted from documents</p>
          </div>
        ) : (
          <>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-border" />
              
              {/* Events */}
              <div className="space-y-4">
                {displayEvents.map((event, index) => {
                  const Icon = eventIcons[event.type] || Clock;
                  const isExpanded = expanded.has(event.id);
                  const upcoming = isUpcoming(event.date);
                  
                  return (
                    <div 
                      key={event.id}
                      className={`
                        relative pl-12 
                        ${index === 0 ? 'pt-0' : ''}
                      `}
                    >
                      {/* Timeline dot */}
                      <div 
                        className={`
                          absolute left-0 w-10 h-10 rounded-full 
                          ${eventColors[event.type]} 
                          flex items-center justify-center
                          ${upcoming ? 'ring-2 ring-offset-2 ring-blue-400 animate-pulse' : ''}
                        `}
                      >
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      
                      {/* Event card */}
                      <div 
                        className={`
                          border-l-4 ${importanceColors[event.importance]}
                          bg-card rounded-lg p-4 shadow-sm
                          hover:shadow-md transition-shadow cursor-pointer
                        `}
                        onClick={() => onEventClick?.(event)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-sm font-medium ${upcoming ? 'text-blue-600' : 'text-muted-foreground'}`}>
                                {formatDate(event.date)}
                                {upcoming && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    Upcoming
                                  </Badge>
                                )}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {event.type}
                              </Badge>
                            </div>
                            <h4 className="font-medium">{event.title}</h4>
                            
                            {isExpanded && (
                              <div className="mt-2 text-sm text-muted-foreground">
                                <p>{event.description}</p>
                                
                                {event.relatedNodes && event.relatedNodes.length > 0 && (
                                  <div className="mt-2 flex items-center gap-1 flex-wrap">
                                    <span className="text-xs">Related:</span>
                                    {event.relatedNodes.map(nodeId => (
                                      <Badge key={nodeId} variant="outline" className="text-xs">
                                        {nodeId}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                                
                                {event.metadata && Object.keys(event.metadata).length > 0 && (
                                  <div className="mt-2 p-2 bg-muted rounded text-xs">
                                    {Object.entries(event.metadata).map(([key, value]) => (
                                      <div key={key} className="flex">
                                        <span className="font-medium w-24">{key}:</span>
                                        <span>{String(value)}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(event.id);
                            }}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {sortedEvents.length > 5 && (
              <div className="mt-4 text-center">
                <Button
                  variant="outline"
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll ? 'Show Less' : `Show All (${sortedEvents.length} events)`}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Export helper for extracting timeline events from graph nodes
export function extractTimelineFromNodes(nodes: any[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  
  for (const node of nodes) {
    if (!node.properties) continue;
    
    // Check for date-related nodes
    if (node.type === 'DATE' || node.type === 'EVENT' || node.properties.date) {
      events.push({
        id: node.id,
        date: node.properties.date || new Date().toISOString(),
        title: node.label || node.properties.name || 'Event',
        description: node.properties.description || '',
        type: mapNodeTypeToEventType(node.type, node.label),
        importance: node.properties.importance || 'medium',
        relatedNodes: node.edges?.map((e: any) => e.target) || [],
        metadata: node.properties
      });
    }
    
    // Check for judgment/order nodes
    if (['JUDGMENT', 'ORDER', 'RULING', 'VERDICT'].includes(node.type)) {
      events.push({
        id: node.id,
        date: node.properties.date || node.properties.decided_on || new Date().toISOString(),
        title: node.label || node.type,
        description: node.properties.summary || node.properties.description || '',
        type: node.type === 'ORDER' ? 'order' : 'judgment',
        importance: 'high',
        relatedNodes: node.edges?.map((e: any) => e.target) || []
      });
    }
  }
  
  return events;
}

function mapNodeTypeToEventType(nodeType: string, label: string): TimelineEvent['type'] {
  const typeMap: Record<string, TimelineEvent['type']> = {
    'FILING': 'filing',
    'HEARING': 'hearing',
    'ORDER': 'order',
    'JUDGMENT': 'judgment',
    'DEADLINE': 'deadline',
    'MILESTONE': 'milestone',
    'DOCUMENT': 'document',
    'DATE': 'milestone'
  };
  
  return typeMap[nodeType] || 'milestone';
}
