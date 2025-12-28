/**
 * Search Page with Semantic Search
 */

'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { aiClient } from '@/lib/api/ai-client';

interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata: {
    fileName?: string;
    fileType?: string;
    pageNumber?: number;
  };
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchType, setSearchType] = useState<'semantic' | 'hybrid'>('hybrid');

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const response = searchType === 'semantic'
        ? await aiClient.search({ query, limit: 20 })
        : await aiClient.hybridSearch({ query, limit: 20 });
      
      setResults(response.results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const highlightMatch = (text: string, searchQuery: string) => {
    if (!searchQuery.trim()) return text;
    
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight">Search</h1>
          <p className="text-muted-foreground">
            Search across all your documents using AI-powered semantic search
          </p>
        </div>

        {/* Search Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search for legal precedents, clauses, or concepts..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="h-12 text-lg"
                />
              </div>
              <div className="flex gap-2">
                <select
                  className="px-3 py-2 border rounded-md bg-background"
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value as 'semantic' | 'hybrid')}
                >
                  <option value="hybrid">Hybrid Search</option>
                  <option value="semantic">Semantic Only</option>
                </select>
                <Button 
                  onClick={handleSearch} 
                  disabled={isSearching}
                  className="h-12 px-8"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Found {results.length} results
            </p>
            
            {results.map((result) => (
              <Card key={result.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      {result.metadata?.fileName || 'Document'}
                    </CardTitle>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      {Math.round(result.score * 100)}% match
                    </span>
                  </div>
                  {result.metadata?.pageNumber && (
                    <CardDescription>Page {result.metadata.pageNumber}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {highlightMatch(result.content, query)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {query && results.length === 0 && !isSearching && (
          <Card>
            <CardContent className="py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium">No results found</h3>
              <p className="mt-2 text-muted-foreground">
                Try adjusting your search query or uploading more documents.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Initial State */}
        {!query && results.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium">Search your documents</h3>
              <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                Use natural language to find relevant legal precedents, contract clauses, 
                or any information across your uploaded documents.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setQuery('force majeure clause')}
                >
                  Force majeure clause
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setQuery('indemnification provisions')}
                >
                  Indemnification provisions
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setQuery('confidentiality obligations')}
                >
                  Confidentiality obligations
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
