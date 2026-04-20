'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Sparkles, Lightbulb, Search, Calendar, Loader2, RefreshCw,
  TrendingUp, AlertTriangle, Trophy, Swords, BookOpen, BarChart2, Globe,
  Plus, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Insight, InsightType } from '@/types';
import { formatRelativeDate } from '@/lib/utils/format';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const INSIGHT_TYPE_CONFIG: Record<InsightType, { label: string; color: string; icon: typeof Lightbulb }> = {
  campaign_summary:  { label: 'Campaign Summary',  color: 'bg-blue-100 text-blue-700',      icon: BarChart2 },
  win_story:         { label: 'Win Story',          color: 'bg-emerald-100 text-emerald-700', icon: Trophy },
  loss_analysis:     { label: 'Gap Analysis',       color: 'bg-red-100 text-red-700',         icon: AlertTriangle },
  competitive_intel: { label: 'Competitive Intel',  color: 'bg-orange-100 text-orange-700',   icon: Swords },
  content_learning:  { label: 'Content Learning',   color: 'bg-purple-100 text-purple-700',   icon: BookOpen },
  market_insight:    { label: 'Market Insight',     color: 'bg-teal-100 text-teal-700',       icon: Globe },
};

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<InsightType | 'all'>('all');
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  // Add manual insight form
  const [title, setTitle] = useState('');
  const [insightType, setInsightType] = useState<InsightType>('content_learning');
  const [content, setContent] = useState('');
  const [campaign, setCampaign] = useState('');
  const [saving, setSaving] = useState(false);

  const loadInsights = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterType !== 'all') params.set('type', filterType);
    try {
      const res = await fetch(`/api/insights?${params.toString()}`);
      const data: { insights: Insight[] } = await res.json();
      setInsights(data.insights ?? []);
    } finally {
      setLoading(false);
    }
  }, [search, filterType]);

  useEffect(() => { loadInsights(); }, [loadInsights]);

  async function generateInsights() {
    setGenerating(true);
    try {
      const res = await fetch('/api/insights/generate', { method: 'POST' });
      const data: { insights?: Insight[]; generated_count?: number; error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');
      toast.success(`Generated ${data.generated_count} insights from your asset library`);
      loadInsights();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate insights');
    } finally {
      setGenerating(false);
    }
  }

  async function addManualInsight(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) { toast.error('Title and content are required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, insight_type: insightType, content, related_campaign: campaign || null }),
      });
      if (!res.ok) { const e: { error: string } = await res.json(); throw new Error(e.error); }
      toast.success('Insight added');
      setAddOpen(false);
      setTitle(''); setContent(''); setCampaign('');
      loadInsights();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const filtered = filterType !== 'all'
    ? insights.filter(i => i.insight_type === filterType)
    : insights;

  const aiGenerated = insights.filter(i => (i.tags as { ai_generated?: boolean })?.ai_generated);
  const manual = insights.filter(i => !(i.tags as { ai_generated?: boolean })?.ai_generated);

  return (
    <div className="space-y-6">
      {/* Actions row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search insights…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-56"
            />
          </div>
          <Select value={filterType} onValueChange={(v) => setFilterType(v as InsightType | 'all')}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {Object.entries(INSIGHT_TYPE_CONFIG).map(([v, { label }]) => (
                <SelectItem key={v} value={v}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Manual
          </Button>
          <Button
            onClick={generateInsights}
            disabled={generating}
            style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
          >
            {generating
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analysing library…</>
              : <><Sparkles className="w-4 h-4 mr-2" /> Generate AI Insights</>
            }
          </Button>
        </div>
      </div>

      {/* Generate prompt — shown when no insights exist */}
      {!loading && insights.length === 0 && (
        <div className="rounded-2xl p-10 text-center"
             style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
               style={{ background: 'oklch(0.455 0.215 268 / 0.1)' }}>
            <Sparkles className="w-7 h-7" style={{ color: 'var(--primary)' }} />
          </div>
          <h3 className="font-semibold text-lg mb-2" style={{ color: 'var(--foreground)' }}>
            No insights yet
          </h3>
          <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: 'var(--muted-foreground)' }}>
            Upload your real marketing assets (brochures, creatives, videos) for HOABL projects, then click <strong>Generate AI Insights</strong> to get data-driven analysis of your content library — coverage gaps, top performers, creative mix by project.
          </p>
          <Button
            onClick={generateInsights}
            disabled={generating}
            style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
          >
            {generating
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analysing library…</>
              : <><Sparkles className="w-4 h-4 mr-2" /> Generate AI Insights</>
            }
          </Button>
        </div>
      )}

      {/* AI-generated insights section */}
      {aiGenerated.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: 'var(--primary)' }} />
              <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                AI-Generated Insights
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                {aiGenerated.length}
              </span>
            </div>
            <button
              onClick={generateInsights}
              disabled={generating}
              className="flex items-center gap-1.5 text-xs transition-colors"
              style={{ color: 'var(--muted-foreground)' }}
            >
              <RefreshCw className={cn('w-3.5 h-3.5', generating && 'animate-spin')} />
              Regenerate
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(filterType !== 'all' ? aiGenerated.filter(i => i.insight_type === filterType) : aiGenerated).map((insight) => (
              <InsightCard key={insight.id} insight={insight} onClick={() => setSelectedInsight(insight)} />
            ))}
          </div>
        </div>
      )}

      {/* Manual insights section */}
      {manual.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Team Insights</h2>
            <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
              {manual.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(filterType !== 'all' ? manual.filter(i => i.insight_type === filterType) : manual).map((insight) => (
              <InsightCard key={insight.id} insight={insight} onClick={() => setSelectedInsight(insight)} />
            ))}
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl p-4 space-y-3 animate-pulse"
                 style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="h-4 rounded w-1/3" style={{ background: 'var(--muted)' }} />
              <div className="h-5 rounded w-3/4" style={{ background: 'var(--muted)' }} />
              <div className="space-y-1.5">
                <div className="h-3 rounded" style={{ background: 'var(--muted)' }} />
                <div className="h-3 rounded w-5/6" style={{ background: 'var(--muted)' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selectedInsight} onOpenChange={(o) => { if (!o) setSelectedInsight(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="pr-8">{selectedInsight?.title}</DialogTitle>
          </DialogHeader>
          {selectedInsight && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 items-center">
                <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                  INSIGHT_TYPE_CONFIG[selectedInsight.insight_type]?.color)}>
                  {INSIGHT_TYPE_CONFIG[selectedInsight.insight_type]?.label}
                </span>
                {selectedInsight.related_campaign && (
                  <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'oklch(0.455 0.215 268 / 0.1)', color: 'var(--primary)' }}>
                    📍 {selectedInsight.related_campaign}
                  </span>
                )}
                {(selectedInsight.tags as { ai_generated?: boolean })?.ai_generated && (
                  <span className="text-xs flex items-center gap-1 px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                    <Sparkles className="w-3 h-3" /> AI Generated
                  </span>
                )}
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--foreground)' }}>
                {selectedInsight.content}
              </p>
              <div className="flex items-center gap-2 pt-3 border-t text-xs" style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
                <Avatar className="w-5 h-5">
                  <AvatarFallback className="text-xs" style={{ background: 'oklch(0.455 0.215 268 / 0.1)', color: 'var(--primary)' }}>
                    {selectedInsight.author?.full_name?.[0] ?? 'AI'}
                  </AvatarFallback>
                </Avatar>
                <span>{selectedInsight.author?.full_name ?? 'AI'}</span>
                <span className="ml-auto">{formatRelativeDate(selectedInsight.created_at)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add manual insight dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Team Insight</DialogTitle>
          </DialogHeader>
          <form onSubmit={addManualInsight} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title <span className="text-red-500">*</span></Label>
              <Input placeholder="e.g. Goa Phase 2 brochure outperforms Phase 1" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={insightType} onValueChange={(v) => setInsightType(v as InsightType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(INSIGHT_TYPE_CONFIG).map(([v, { label }]) => (
                      <SelectItem key={v} value={v}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Project (optional)</Label>
                <Input placeholder="One Goa, One Nagpur…" value={campaign} onChange={(e) => setCampaign(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Content <span className="text-red-500">*</span></Label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 min-h-[120px]"
                style={{ borderColor: 'var(--border)' }}
                placeholder="What happened, what worked, key metrics, learnings from real campaigns…"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={saving} className="w-full"
                    style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {saving ? 'Saving…' : 'Save Insight'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InsightCard({ insight, onClick }: { insight: Insight; onClick: () => void }) {
  const config = INSIGHT_TYPE_CONFIG[insight.insight_type] ?? INSIGHT_TYPE_CONFIG.content_learning;
  const Icon = config.icon;
  const isAI = (insight.tags as { ai_generated?: boolean })?.ai_generated;

  return (
    <div
      className="rounded-xl p-4 cursor-pointer transition-all hover:-translate-y-0.5"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', config.color)}>
          <Icon className="w-3 h-3" />
          {config.label}
        </span>
        {isAI && <Sparkles className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--primary)' }} />}
      </div>

      <h3 className="font-semibold text-[13px] mb-1.5 leading-snug line-clamp-2"
          style={{ color: 'var(--foreground)' }}>
        {insight.title}
      </h3>

      <p className="text-xs line-clamp-3 leading-relaxed mb-3"
         style={{ color: 'var(--muted-foreground)' }}>
        {insight.content}
      </p>

      <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
        {insight.related_campaign && (
          <span className="truncate max-w-[100px]">📍 {insight.related_campaign}</span>
        )}
        <span className="ml-auto flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formatRelativeDate(insight.created_at)}
        </span>
      </div>
    </div>
  );
}
