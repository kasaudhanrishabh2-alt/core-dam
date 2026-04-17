'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, Link2, Eye, Clock, DollarSign, AlertTriangle } from 'lucide-react';
import { StatCardSkeleton } from '@/components/shared/LoadingSkeleton';
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

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtext?: string;
}

function StatCard({ label, value, icon, color, subtext }: StatCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-slate-500 font-medium">{label}</span>
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', color)}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
      {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
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

  // Prepare chart data from top assets
  const barChartData = (data?.top_assets ?? [])
    .slice(0, 8)
    .map((item) => ({
      name: item.asset?.name
        ? item.asset.name.length > 20
          ? item.asset.name.slice(0, 20) + '…'
          : item.asset.name
        : 'Unknown',
      opens: item.opens,
      time_min: Math.round((item.time_seconds ?? 0) / 60),
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Analytics Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Content performance, sales activity, and revenue attribution
        </p>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Total Assets"
              value={data?.overview.total_assets ?? 0}
              icon={<TrendingUp className="w-4 h-4 text-indigo-600" />}
              color="bg-indigo-50"
              subtext="Active in library"
            />
            <StatCard
              label="Active Links"
              value={data?.overview.active_links ?? 0}
              icon={<Link2 className="w-4 h-4 text-blue-600" />}
              color="bg-blue-50"
              subtext="Trackable share links"
            />
            <StatCard
              label="Total Opens"
              value={data?.overview.total_opens ?? 0}
              icon={<Eye className="w-4 h-4 text-violet-600" />}
              color="bg-violet-50"
              subtext="Across all links"
            />
            <StatCard
              label="Avg. Engagement"
              value={formatDuration(data?.overview.avg_engagement_seconds ?? 0)}
              icon={<Clock className="w-4 h-4 text-amber-600" />}
              color="bg-amber-50"
              subtext="Time per link"
            />
            <StatCard
              label="Attributed Revenue"
              value={formatCurrency(data?.overview.attributed_revenue ?? 0)}
              icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
              color="bg-emerald-50"
              subtext="From won deals (SF)"
            />
          </>
        )}
      </div>

      {/* Content Performance chart */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-semibold text-slate-900 mb-4">Top Assets by Engagement</h2>
        {barChartData.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-slate-400 text-sm">
            No data yet — share some assets to see analytics
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barChartData} margin={{ top: 5, right: 20, bottom: 40, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                angle={-35}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="opens" name="Opens" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="time_min" name="Avg Time (min)" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Two-column bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset performance table */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Asset Performance</h2>
          <div className="space-y-2">
            {(data?.top_assets ?? []).slice(0, 6).map((item, idx) => (
              <div
                key={item.asset_id}
                className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0"
              >
                <span className="text-xs text-slate-400 w-5 text-center font-medium">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {item.asset?.name ?? 'Unknown'}
                  </p>
                  <ContentTypeBadge contentType={item.asset?.content_type ?? null} />
                </div>
                <div className="text-right text-xs text-slate-500 flex-shrink-0">
                  <p className="font-medium text-slate-800">{item.opens} opens</p>
                  <p>{formatDuration(item.time_seconds ?? 0)}</p>
                </div>
              </div>
            ))}
            {!loading && (data?.top_assets ?? []).length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">
                No engagement data yet
              </p>
            )}
          </div>
        </div>

        {/* Content gap analysis */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="font-semibold text-slate-900">Content Gaps</h2>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Searches with no matching content — create these assets to fill gaps
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(data?.content_gaps ?? []).length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">
                No content gaps detected — great library coverage!
              </p>
            ) : (
              (data?.content_gaps ?? []).map((gap, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 py-2 border-b border-slate-50 last:border-0"
                >
                  <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                  <p className="text-sm text-slate-700 italic">&ldquo;{gap.query_text}&rdquo;</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Deal stage coverage */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-semibold text-slate-900 mb-4">
          Deal Stage Coverage
          <span className="ml-2 text-xs font-normal text-slate-400">
            (requires SF integration for revenue attribution)
          </span>
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { stage: 'Awareness', color: 'bg-blue-100 text-blue-700', count: 0 },
            { stage: 'Consideration', color: 'bg-indigo-100 text-indigo-700', count: 0 },
            { stage: 'Decision', color: 'bg-violet-100 text-violet-700', count: 0 },
            { stage: 'Post Sale', color: 'bg-emerald-100 text-emerald-700', count: 0 },
          ].map(({ stage, color, count }) => (
            <div key={stage} className="rounded-xl border border-slate-200 p-4 text-center">
              <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium mb-2', color)}>
                {stage}
              </span>
              <p className="text-2xl font-semibold text-slate-800">{count}</p>
              <p className="text-xs text-slate-400">assets</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
