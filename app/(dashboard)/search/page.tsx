'use client';

import { useState, useRef } from 'react';
import { Search, MessageSquare, Send, Loader2, ExternalLink, BookOpen, Calendar, Eye, Share2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContentTypeBadge } from '@/components/shared/ContentTypeBadge';
import type { SearchResult, AssetMetadata } from '@/types';
import { formatRelativeDate } from '@/lib/utils/format';
import { cn } from '@/lib/utils';

interface EnrichedSearchResult extends SearchResult {
  metadata?: AssetMetadata;
  created_at?: string | null;
  view_count?: number;
  share_count?: number;
  campaign_name?: string | null;
  ai_summary?: string | null;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  assetIds?: string[];
  hasGoodMatch?: boolean;
}

export default function SearchPage() {
  // ── Asset Search ─────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<EnrichedSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);

    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}&limit=12`
      );
      const data: { results: EnrichedSearchResult[] } = await res.json();
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
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--foreground)' }}>Search & Q&A</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
          Find assets with semantic search or ask questions grounded in your content library
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
                placeholder="Try: 'One Goa brochure' or 'NRI investor payment plan'"
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
                'One Goa brochures',
                'WhatsApp creatives Nagpur',
                'Meta ads festive campaign',
                'payment plan documents',
                'site visit presentations',
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
                  className="rounded-xl p-4 transition-all hover:-translate-y-px"
                  style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <h3 className="font-semibold text-[14px]" style={{ color: 'var(--foreground)' }}>{result.name}</h3>
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

                      {/* Project / Launch */}
                      {(result.metadata?.project_name || result.campaign_name) && (
                        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                          {result.metadata?.project_name && (
                            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                                  style={{ background: 'oklch(0.455 0.215 268 / 0.1)', color: 'var(--primary)' }}>
                              <MapPin className="w-3 h-3" />
                              {result.metadata.project_name}{result.metadata.launch_name ? ` · ${result.metadata.launch_name}` : ''}
                            </span>
                          )}
                          {result.campaign_name && (
                            <span className="text-xs px-2 py-0.5 rounded-full"
                                  style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                              {result.campaign_name}
                            </span>
                          )}
                        </div>
                      )}

                      {(result.ai_summary || result.excerpt) && (
                        <p className="text-sm line-clamp-2 leading-relaxed mb-2"
                           style={{ color: 'var(--muted-foreground)' }}>
                          {result.ai_summary || result.excerpt}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        {result.created_at && (
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatRelativeDate(result.created_at)}</span>
                        )}
                        {(result.view_count ?? 0) > 0 && (
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{result.view_count}</span>
                        )}
                        {(result.share_count ?? 0) > 0 && (
                          <span className="flex items-center gap-1"><Share2 className="w-3 h-3" />{result.share_count}</span>
                        )}
                      </div>
                    </div>

                    <a
                      href={result.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 p-2 rounded-lg transition-colors"
                      style={{ color: 'var(--muted-foreground)' }}
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
                      'What are the key selling points for One Goa?',
                      'Which assets are best for NRI investors?',
                      'What payment plan options do we offer?',
                      'Summarise our awareness-stage collateral',
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
