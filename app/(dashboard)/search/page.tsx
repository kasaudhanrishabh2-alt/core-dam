'use client';

import { useState, useRef } from 'react';
import { Search, MessageSquare, Send, Loader2, ExternalLink, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContentTypeBadge } from '@/components/shared/ContentTypeBadge';
import type { SearchResult } from '@/types';
import { cn } from '@/lib/utils';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  assetIds?: string[];
  hasGoodMatch?: boolean;
}

export default function SearchPage() {
  // ── Asset Search ─────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);

    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}&limit=12`
      );
      const data: { results: SearchResult[] } = await res.json();
      setSearchResults(data.results);
    } finally {
      setSearching(false);
    }
  }

  // ── Q&A ──────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [qaInput, setQaInput] = useState('');
  const [qaLoading, setQaLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  async function handleQaSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!qaInput.trim() || qaLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: qaInput };
    setMessages((m) => [...m, userMessage]);
    setQaInput('');
    setQaLoading(true);

    // Add placeholder assistant message
    setMessages((m) => [...m, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/search/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: qaInput }),
      });

      const assetIds: string[] = JSON.parse(res.headers.get('X-Asset-Ids') ?? '[]');
      const hasGoodMatch = res.headers.get('X-Had-Good-Match') === 'true';

      // Stream the response text
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += decoder.decode(value, { stream: true });
          setMessages((m) => {
            const updated = [...m];
            updated[updated.length - 1] = {
              role: 'assistant',
              content: fullText,
              assetIds,
              hasGoodMatch,
            };
            return updated;
          });
        }
      }

      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch {
      setMessages((m) => {
        const updated = [...m];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
        };
        return updated;
      });
    } finally {
      setQaLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Search & Q&A</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Find assets with semantic search or ask questions about your content library
        </p>
      </div>

      <Tabs defaultValue="search">
        <TabsList>
          <TabsTrigger value="search" className="flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5" /> Asset Search
          </TabsTrigger>
          <TabsTrigger value="qa" className="flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" /> Ask Your Library
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Semantic Search ── */}
        <TabsContent value="search" className="space-y-4 pt-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Try: 'enterprise fintech case studies' or 'Q3 email templates'"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-base"
              />
            </div>
            <Button
              type="submit"
              disabled={searching}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </Button>
          </form>

          {/* Suggested queries */}
          {searchResults.length === 0 && !searching && (
            <div className="flex flex-wrap gap-2">
              {[
                'case studies for enterprise',
                'ROI calculator templates',
                'competitive battlecards',
                'onboarding email sequences',
                'Q4 campaign reports',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setSearchQuery(q);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm rounded-full transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Results */}
          {searching ? (
            <div className="flex items-center gap-2 text-slate-500 py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching with semantic AI…
            </div>
          ) : (
            <div className="space-y-3">
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <h3 className="font-medium text-slate-900">{result.name}</h3>
                        <ContentTypeBadge contentType={result.content_type} />
                        <span
                          className={cn(
                            'text-xs font-medium px-2 py-0.5 rounded-full',
                            result.similarity > 0.85
                              ? 'bg-emerald-100 text-emerald-700'
                              : result.similarity > 0.7
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          )}
                        >
                          {Math.round(result.similarity * 100)}% match
                        </span>
                      </div>
                      {result.excerpt && (
                        <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed">
                          {result.excerpt}
                        </p>
                      )}
                    </div>
                    <a
                      href={result.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
              {searchResults.length === 0 && searchQuery && !searching && (
                <div className="text-center py-10 text-slate-400">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>No assets found for &quot;{searchQuery}&quot;</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Tab 2: AI Q&A ── */}
        <TabsContent value="qa" className="pt-4">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {/* Chat history */}
            <div className="h-[480px] overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mb-3">
                    <BookOpen className="w-6 h-6 text-indigo-500" />
                  </div>
                  <h3 className="font-medium text-slate-700 mb-1">Ask your content library</h3>
                  <p className="text-sm text-slate-400 max-w-sm">
                    Ask anything about your marketing assets. Try:
                  </p>
                  <div className="mt-3 space-y-1.5">
                    {[
                      'What messaging did we use for mid-market prospects?',
                      'Which case studies cover the fintech vertical?',
                      'What were our key learnings from the Q3 campaign?',
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => setQaInput(q)}
                        className="block w-full text-left px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-sm rounded-lg transition-colors"
                      >
                        &ldquo;{q}&rdquo;
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-xl px-4 py-3 text-sm',
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-50 border border-slate-200 text-slate-800'
                    )}
                  >
                    {msg.content ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    ) : (
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…
                      </span>
                    )}
                    {msg.role === 'assistant' && msg.hasGoodMatch === false && (
                      <p className="mt-2 text-xs text-amber-600 bg-amber-50 rounded px-2 py-1">
                        No matching content found — this may be a content gap worth filling.
                      </p>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-slate-200 p-3">
              <form onSubmit={handleQaSubmit} className="flex gap-2">
                <Input
                  placeholder="Ask anything about your content library…"
                  value={qaInput}
                  onChange={(e) => setQaInput(e.target.value)}
                  disabled={qaLoading}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={!qaInput.trim() || qaLoading}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
