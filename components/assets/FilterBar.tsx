'use client';

import { Search, X, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CONTENT_TYPE_LABELS } from '@/lib/utils/fileHelpers';
import type { ContentType, AssetStatus } from '@/types';

export interface AssetFilters {
  search: string;
  content_type: ContentType | 'all';
  campaign_name: string;
  deal_stage: string;
  status: AssetStatus | 'all';
  sort: 'newest' | 'oldest' | 'most_shared' | 'most_viewed' | 'alphabetical';
}

interface FilterBarProps {
  filters: AssetFilters;
  onChange: (filters: AssetFilters) => void;
  campaigns: string[];
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'most_shared', label: 'Most shared' },
  { value: 'most_viewed', label: 'Most viewed' },
  { value: 'alphabetical', label: 'A → Z' },
] as const;

const DEAL_STAGES = [
  { value: 'awareness', label: 'Awareness' },
  { value: 'consideration', label: 'Consideration' },
  { value: 'decision', label: 'Decision' },
  { value: 'post_sale', label: 'Post Sale' },
];

export function FilterBar({ filters, onChange, campaigns }: FilterBarProps) {
  const hasActiveFilters =
    filters.content_type !== 'all' ||
    filters.campaign_name !== '' ||
    filters.deal_stage !== '' ||
    filters.status !== 'active' ||
    filters.search !== '';

  function update(patch: Partial<AssetFilters>) {
    onChange({ ...filters, ...patch });
  }

  function clearAll() {
    onChange({
      search: '',
      content_type: 'all',
      campaign_name: '',
      deal_stage: '',
      status: 'active',
      sort: 'newest',
    });
  }

  return (
    <div className="space-y-3">
      {/* Search + sort row */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search assets…"
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            className="pl-9"
          />
        </div>
        <Select
          value={filters.sort}
          onValueChange={(v) => update({ sort: v as AssetFilters['sort'] })}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filter chips row */}
      <div className="flex gap-2 flex-wrap items-center">
        <SlidersHorizontal className="w-4 h-4 text-slate-400 flex-shrink-0" />

        {/* Content type */}
        <Select
          value={filters.content_type}
          onValueChange={(v) => update({ content_type: v as ContentType | 'all' })}
        >
          <SelectTrigger className="h-8 text-xs w-40">
            <SelectValue placeholder="Content type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(CONTENT_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Campaign */}
        {campaigns.length > 0 && (
          <Select
            value={filters.campaign_name || 'all'}
            onValueChange={(v) => update({ campaign_name: (v === 'all' || v === null) ? '' : v })}
          >
            <SelectTrigger className="h-8 text-xs w-44">
              <SelectValue placeholder="Campaign" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All campaigns</SelectItem>
              {campaigns.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Deal stage */}
        <Select
          value={filters.deal_stage || 'all'}
          onValueChange={(v) => update({ deal_stage: (v === 'all' || v === null) ? '' : v })}
        >
          <SelectTrigger className="h-8 text-xs w-40">
            <SelectValue placeholder="Deal stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {DEAL_STAGES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status */}
        <Select
          value={filters.status}
          onValueChange={(v) => update({ status: v as AssetStatus | 'all' })}
        >
          <SelectTrigger className="h-8 text-xs w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
            <SelectItem value="all">All status</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-8 text-xs text-slate-500 hover:text-slate-700"
          >
            <X className="w-3.5 h-3.5 mr-1" /> Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
