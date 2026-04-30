'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  TrendingUp, Link2, Eye, Clock, IndianRupee, AlertTriangle,
  ArrowUpRight, Layers, Sparkles,
} from 'lucide-react';
import { ContentTypeBadge } from '@/components/shared/ContentTypeBadge';
import { formatCurrency, formatDuration } from '@/lib/utils/format';
import type { AnalyticsOverview, ContentType } from '@/types';
import { cn } from '@/lib/utils';

interface AnalyticsData {
  overview: AnalyticsOverview;
  top_assets: Array<{
    asset_id: string;
    opens: number;
    time_seconds: number;
    score: number;
    asset: { id: string; name: string; content_type: ContentType | null } | null;
  }>;
  content_gaps: Array<{ query_text: string; created_at: string }>;
}

const STAT_CONFIG = [
  {
    key: 'total_assets',
    label: 'Total Assets',
    icon: Layers,
    format: (v: number) => v.toLocaleString(),
    sub: 'Active in library',
    accent: '#6366f1',
    bg: 'from-indigo-50 to-violet-50',
  },
  {
    key: 'active_links',
    label: 'Active Links',
    icon: Link2,
    format: (v: number) => v.toLocaleString(),
    sub: 'Trackable share links',
    accent: '#3b82f6',
    bg: 'from-blue-50 to-sky-50',
  },
  {
    key: 'total_opens',
    label: 'Total Opens',
    icon: Eye,
    format: (v: number) => v.toLocaleString(),
    sub: 'Across all links',
    accent: '#8b5cf6',
    bg: 'from-violet-50 to-purple-50',
  },
  {
    key: 'avg_engagement_seconds',
    label: 'Avg. Engagement',
    icon: Clock,
    format: (v: number) => formatDuration(v),
    sub: 'Time per link open',
    accent: '#f59e0b',
    bg: 'from-amber-50 to-yellow-50',
  },
  {
    key: 'attributed_revenue',
    label: 'Attributed Revenue',
    icon: IndianRupee,
    format: (v: number) => formatCurrency(v),
    sub: 'Connect Salesforce to track',
    accent: '#10b981',
    bg: 'from-emerald-50 to-teal-50',
  },
] as const;

const DEAL_STAGES = [
  { stage: 'Awareness',     color: '#3b82f6', bg: 'bg-blue-50',    text: 'text-blue-700' },
  { stage: 'Consideration', color: '#6366f1', bg: 'bg-indigo-50',  text: 'text-indigo-700' },
  { stage: 'Decision',      color: '#8b5cf6', bg: 'bg-violet-50',  text: 'text-violet-700' },
  { stage: 'Post Sale',     color: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-700' },
];

function StatCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div className="skeleton h-3.5 w-24 rounded" />
        <div className="skeleton w-9 h-9 rounded-xl" />
      </div>
      <div className="skeleton h-7 w-20 rounded mb-1.5" />
      <div className="skeleton h-3 w-28 rounded" />
    </div>
  );
}

function StatCard({
  label, value, icon: Icon, sub, accent, bg,
}: {
  label: string; value: string; icon: typeof Eye;
  sub: string; accent: string; bg: string;
}) {
  return (
    <div className="bg-card rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all duration-200 group">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[12px] font-medium" style={{ color: 'var(--muted-foreground)' }}>{label}</p>
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br flex-shrink-0', bg)}>
          <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>
      </div>
      <p className="text-2xl font-bold tracking-tight mb-0.5" style={{ color: 'var(--foreground)' }}>
        {value}
      </p>
      <p className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>{sub}</p>
    </div>
  );
}

const BAR_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#818cf8', '#4f46e5', '#4338ca'];

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card rounded-xl shadow-raised px-4 py-3 text-xs border" style={{ borderColor: 'var(--border)' }}>
      <p className="font-semibold mb-2" style={{ color: 'var(--foreground)' }}>{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span style={{ color: 'var(--muted-foreground)' }}>{p.name}:</span>
          <span className="font-medium" style={{ color: 'var(--foreground)' }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/overview')
      .then((r) => r.json())
      .then((d: AnalyticsData) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  const barChartData = (data?.top_assets ?? []).slice(0, 8).map((item) => ({
    name: (item.asset?.name ?? 'Unknown').slice(0, 22) + ((item.asset?.name?.length ?? 0) > 22 ? '…' : ''),
    Opens: item.opens,
    'Time (min)': Math.round((item.time_seconds ?? 0) / 60),
  }));

  const overview = data?.overview;

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
          : STAT_CONFIG.map(({ key, label, icon, format, sub, accent, bg }) => (
              <StatCard
                key={key}
                label={label}
                value={format(overview?.[key as keyof AnalyticsOverview] as number ?? 0)}
                icon={icon}
                sub={sub}
                accent={accent}
                bg={bg}
              />
            ))
        }
      </div>

      {/* Chart */}
      <div className="bg-card rounded-2xl shadow-card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[14px] font-semibold" style={{ color: 'var(--foreground)' }}>Top Assets by Engagement</h2>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Opens and time spent across share links</p>
          </div>
        </div>
        {barChartData.length === 0 ? (
          <div className="h-52 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <BarChart className="w-5 h-5 text-indigo-400" />
            </div>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>No data yet — share some assets to see analytics</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barChartData} margin={{ top: 4, right: 8, bottom: 48, left: 0 }} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.888 0.010 78)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: 'oklch(0.52 0.012 268)' }}
                angle={-30}
                textAnchor="end"
                height={56}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 11, fill: 'oklch(0.52 0.012 268)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'oklch(0.455 0.215 268 / 0.05)', radius: 8 }} />
              <Bar dataKey="Opens" radius={[6, 6, 0, 0]} maxBarSize={40}>
                {barChartData.map((_, i) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Two-col section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Asset performance */}
        <div className="bg-card rounded-2xl shadow-card p-5">
          <h2 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Asset Performance</h2>
          <div className="space-y-1">
            {(data?.top_assets ?? []).slice(0, 6).map((item, idx) => (
              <div key={item.asset_id}
                   className="flex items-center gap-3 py-2.5 rounded-xl px-2 transition-colors hover:bg-muted/50">
                <span className="text-[11px] font-bold w-5 text-center flex-shrink-0"
                      style={{ color: idx === 0 ? '#6366f1' : 'var(--muted-foreground)' }}>
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate" style={{ color: 'var(--foreground)' }}>
                    {item.asset?.name ?? 'Unknown'}
                  </p>
                  <ContentTypeBadge contentType={item.asset?.content_type ?? null} />
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[13px] font-semibold" style={{ color: 'var(--foreground)' }}>{item.opens} opens</p>
                  <p className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>{formatDuration(item.time_seconds ?? 0)}</p>
                </div>
              </div>
            ))}
            {!loading && (data?.top_assets ?? []).length === 0 && (
              <div className="py-10 text-center">
                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>No engagement data yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Content gaps */}
        <div className="bg-card rounded-2xl shadow-card p-5">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="text-[14px] font-semibold" style={{ color: 'var(--foreground)' }}>Content Gaps</h2>
          </div>
          <p className="text-[12px] mb-4" style={{ color: 'var(--muted-foreground)' }}>
            Queries with no matching content — create these assets
          </p>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {(data?.content_gaps ?? []).length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-2">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Great coverage — no gaps detected</p>
              </div>
            ) : (
              (data?.content_gaps ?? []).map((gap, i) => (
                <div key={i}
                     className="flex items-start gap-2.5 py-2 px-3 rounded-xl transition-colors hover:bg-amber-50/60">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                  <p className="text-[13px] italic" style={{ color: 'var(--foreground)' }}>
                    &ldquo;{gap.query_text}&rdquo;
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Deal stage coverage */}
      <div className="bg-card rounded-2xl shadow-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[14px] font-semibold" style={{ color: 'var(--foreground)' }}>Deal Stage Coverage</h2>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              Asset distribution across buyer journey stages
            </p>
          </div>
          <span className="text-[11px] px-2 py-1 rounded-lg font-medium"
                style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
            Salesforce Required
          </span>
        </div>
        <div className="rounded-xl border-2 border-dashed py-10 flex flex-col items-center gap-3 text-center"
             style={{ borderColor: 'var(--border)' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center"
               style={{ background: 'color-mix(in oklch, var(--primary) 10%, transparent)' }}>
            <TrendingUp className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Connect Salesforce to unlock</p>
            <p className="text-xs mt-0.5 max-w-xs" style={{ color: 'var(--muted-foreground)' }}>
              See which assets are used at each stage of the buyer journey and attribute revenue to marketing collateral
            </p>
          </div>
          <a href="/settings" className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
             style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}>
            Go to Settings → Integrations
          </a>
        </div>
      </div>
    </div>
  );
}
