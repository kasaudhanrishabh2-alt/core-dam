'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Lightbulb, Search, Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Insight, InsightType } from '@/types';
import { formatRelativeDate } from '@/lib/utils/format';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const INSIGHT_TYPE_COLORS: Record<InsightType, string> = {
  campaign_summary: 'bg-blue-100 text-blue-700',
  win_story: 'bg-emerald-100 text-emerald-700',
  loss_analysis: 'bg-red-100 text-red-700',
  competitive_intel: 'bg-orange-100 text-orange-700',
  content_learning: 'bg-purple-100 text-purple-700',
  market_insight: 'bg-teal-100 text-teal-700',
};

const INSIGHT_TYPE_LABELS: Record<InsightType, string> = {
  campaign_summary: 'Campaign Summary',
  win_story: 'Win Story',
  loss_analysis: 'Loss Analysis',
  competitive_intel: 'Competitive Intel',
  content_learning: 'Content Learning',
  market_insight: 'Market Insight',
};

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<InsightType | 'all'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);

  // Create form
  const [title, setTitle] = useState('');
  const [insightType, setInsightType] = useState<InsightType>('campaign_summary');
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
      setInsights(data.insights);
    } finally {
      setLoading(false);
    }
  }, [search, filterType]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  async function createInsight(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          insight_type: insightType,
          content,
          related_campaign: campaign || null,
        }),
      });
      if (!res.ok) {
        const err: { error: string } = await res.json();
        throw new Error(err.error);
      }
      toast.success('Insight created');
      setCreateOpen(false);
      setTitle(''); setContent(''); setCampaign('');
      loadInsights();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create insight');
    } finally {
      setSaving(false);
    }
  }

  const filteredInsights =
    filterType !== 'all'
      ? insights.filter((i) => i.insight_type === filterType)
      : insights;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Campaign Insights</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Win stories, learnings, competitive intel, and campaign summaries
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <Plus className="w-4 h-4 mr-1.5" /> New Insight
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search insights…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={filterType}
          onValueChange={(v) => setFilterType(v as InsightType | 'all')}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(INSIGHT_TYPE_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Type filter pills */}
      <div className="flex flex-wrap gap-2">
        {(['all', ...Object.keys(INSIGHT_TYPE_LABELS)] as (InsightType | 'all')[]).map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors',
              filterType === type
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            {type === 'all' ? 'All' : INSIGHT_TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-5 bg-slate-200 rounded w-3/4" />
              <div className="space-y-1.5">
                <div className="h-3 bg-slate-100 rounded" />
                <div className="h-3 bg-slate-100 rounded w-5/6" />
                <div className="h-3 bg-slate-100 rounded w-4/6" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredInsights.length === 0 ? (
        <div className="text-center py-16">
          <Lightbulb className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-600">No insights yet</h3>
          <p className="text-slate-400 text-sm mt-1">
            Document win stories, campaign learnings, and competitive intel
          </p>
          <Button
            onClick={() => setCreateOpen(true)}
            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Create first insight
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInsights.map((insight) => (
            <div
              key={insight.id}
              className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer"
              onClick={() => setSelectedInsight(insight)}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span
                  className={cn(
                    'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                    INSIGHT_TYPE_COLORS[insight.insight_type]
                  )}
                >
                  {INSIGHT_TYPE_LABELS[insight.insight_type]}
                </span>
                {insight.related_campaign && (
                  <span className="text-xs text-slate-400 truncate max-w-[120px]">
                    {insight.related_campaign}
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-slate-900 mb-2 leading-snug line-clamp-2">
                {insight.title}
              </h3>
              <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed">
                {insight.content}
              </p>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={insight.author?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">
                    {insight.author?.full_name?.[0] ?? 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-slate-500">
                  {insight.author?.full_name ?? 'Unknown'}
                </span>
                <span className="ml-auto text-xs text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatRelativeDate(insight.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>New Insight</DialogTitle>
          </DialogHeader>
          <form onSubmit={createInsight} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title <span className="text-red-500">*</span></Label>
              <Input
                placeholder="e.g. How we won Acme Corp — Q3 case"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type <span className="text-red-500">*</span></Label>
                <Select value={insightType} onValueChange={(v) => setInsightType(v as InsightType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(INSIGHT_TYPE_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Campaign (optional)</Label>
                <Input
                  placeholder="Campaign name"
                  value={campaign}
                  onChange={(e) => setCampaign(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Content <span className="text-red-500">*</span></Label>
              <textarea
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 min-h-[140px]"
                placeholder="Share what happened, what worked, key metrics, and learnings…"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={saving}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {saving ? 'Saving…' : 'Create Insight'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* View detail dialog */}
      <Dialog open={!!selectedInsight} onOpenChange={(o) => { if (!o) setSelectedInsight(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="pr-8">{selectedInsight?.title}</DialogTitle>
          </DialogHeader>
          {selectedInsight && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 items-center">
                <span
                  className={cn(
                    'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                    INSIGHT_TYPE_COLORS[selectedInsight.insight_type]
                  )}
                >
                  {INSIGHT_TYPE_LABELS[selectedInsight.insight_type]}
                </span>
                {selectedInsight.related_campaign && (
                  <span className="text-xs text-slate-500">{selectedInsight.related_campaign}</span>
                )}
              </div>
              <div className="prose prose-sm prose-slate max-w-none">
                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {selectedInsight.content}
                </p>
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100 text-xs text-slate-400">
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">
                    {selectedInsight.author?.full_name?.[0] ?? 'U'}
                  </AvatarFallback>
                </Avatar>
                <span>{selectedInsight.author?.full_name ?? 'Unknown'}</span>
                <span className="ml-auto">{formatRelativeDate(selectedInsight.created_at)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
