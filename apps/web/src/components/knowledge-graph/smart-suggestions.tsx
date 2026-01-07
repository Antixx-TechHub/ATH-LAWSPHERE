/**
 * Smart Suggestions Component
 * AI-powered legal suggestions panel
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Lightbulb, 
  ChevronRight, 
  Check, 
  X, 
  AlertTriangle, 
  FileText, 
  Scale, 
  Clock,
  Copy,
  ExternalLink,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface Suggestion {
  id: string;
  type: string;
  title: string;
  description: string;
  relevance: number;
  action?: {
    type: 'link' | 'copy' | 'apply' | 'navigate';
    payload: string;
  };
  source?: string;
  metadata?: Record<string, any>;
}

interface SmartSuggestionsProps {
  graphId?: string;
  context: string;
  onApplySuggestion?: (suggestion: Suggestion) => void;
  className?: string;
}

const typeIcons: Record<string, any> = {
  SECTION_REFERENCE: Scale,
  CASE_PRECEDENT: FileText,
  TEMPLATE: FileText,
  NEXT_STEP: ChevronRight,
  DEADLINE: Clock,
  RISK_ALERT: AlertTriangle,
  ARGUMENT_POINT: Lightbulb
};

const typeColors: Record<string, string> = {
  SECTION_REFERENCE: 'bg-blue-100 text-blue-800',
  CASE_PRECEDENT: 'bg-purple-100 text-purple-800',
  TEMPLATE: 'bg-green-100 text-green-800',
  NEXT_STEP: 'bg-gray-100 text-gray-800',
  DEADLINE: 'bg-orange-100 text-orange-800',
  RISK_ALERT: 'bg-red-100 text-red-800',
  ARGUMENT_POINT: 'bg-yellow-100 text-yellow-800'
};

export function SmartSuggestions({
  graphId,
  context,
  onApplySuggestion,
  className
}: SmartSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const fetchSuggestions = async () => {
    if (!context || context.length < 10) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        context: context.slice(0, 2000) // Limit context size
      });
      if (graphId) params.set('graphId', graphId);
      
      const response = await fetch(`/api/suggestions?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
        setDomains(data.domains || []);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchSuggestions();
    }, 1000); // Debounce 1 second
    
    return () => clearTimeout(debounce);
  }, [context, graphId]);

  const handleAccept = async (suggestion: Suggestion) => {
    try {
      await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'accept',
          graphId,
          title: suggestion.title,
          content: suggestion.description,
          relevance: suggestion.relevance,
          source: suggestion.source
        })
      });
      
      onApplySuggestion?.(suggestion);
      setDismissed(prev => new Set([...prev, suggestion.id]));
      toast.success(`Applied: ${suggestion.title}`);
    } catch (error) {
      toast.error('Failed to apply suggestion');
    }
  };

  const handleDismiss = async (suggestion: Suggestion, reason?: string) => {
    try {
      await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dismiss',
          graphId,
          title: suggestion.title,
          content: suggestion.description,
          relevance: suggestion.relevance,
          feedback: reason
        })
      });
      
      setDismissed(prev => new Set([...prev, suggestion.id]));
    } catch (error) {
      console.error('Failed to dismiss:', error);
    }
  };

  const handleAction = (suggestion: Suggestion) => {
    if (!suggestion.action) return;
    
    switch (suggestion.action.type) {
      case 'copy':
        navigator.clipboard.writeText(suggestion.action.payload);
        toast.success('Copied to clipboard');
        break;
      case 'link':
        window.open(suggestion.action.payload, '_blank');
        break;
      case 'navigate':
        window.location.href = suggestion.action.payload;
        break;
      case 'apply':
        handleAccept(suggestion);
        break;
    }
  };

  const visibleSuggestions = suggestions.filter(s => !dismissed.has(s.id));

  if (visibleSuggestions.length === 0 && !loading) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Smart Suggestions
          </CardTitle>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={fetchSuggestions}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        {domains.length > 0 && (
          <div className="flex gap-1 mt-1">
            {domains.map(domain => (
              <Badge key={domain} variant="outline" className="text-xs capitalize">
                {domain}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-pulse flex space-x-2">
              <div className="h-2 w-2 bg-primary rounded-full"></div>
              <div className="h-2 w-2 bg-primary rounded-full"></div>
              <div className="h-2 w-2 bg-primary rounded-full"></div>
            </div>
          </div>
        ) : (
          visibleSuggestions.map(suggestion => {
            const Icon = typeIcons[suggestion.type] || Lightbulb;
            const colorClass = typeColors[suggestion.type] || 'bg-gray-100 text-gray-800';
            
            return (
              <div 
                key={suggestion.id}
                className="group p-3 rounded-lg border hover:border-primary/50 hover:bg-muted/30 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {suggestion.title}
                      </span>
                      <Badge 
                        variant="secondary" 
                        className="text-xs shrink-0"
                      >
                        {suggestion.relevance}% match
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {suggestion.description}
                    </p>
                    {suggestion.source && (
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        Source: {suggestion.source}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {suggestion.action && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => handleAction(suggestion)}
                        title={suggestion.action.type === 'copy' ? 'Copy' : 
                               suggestion.action.type === 'apply' ? 'Apply' :
                               suggestion.action.type === 'link' ? 'Open Link' : 'Go'}
                      >
                        {suggestion.action.type === 'copy' ? (
                          <Copy className="h-3.5 w-3.5" />
                        ) : suggestion.action.type === 'link' ? (
                          <ExternalLink className="h-3.5 w-3.5" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-100"
                      onClick={() => handleAccept(suggestion)}
                      title="Accept"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
                      onClick={() => handleDismiss(suggestion)}
                      title="Dismiss"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        {!loading && visibleSuggestions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No suggestions available. Add more content to get AI-powered recommendations.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
