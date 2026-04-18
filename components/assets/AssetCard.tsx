'use client';

import { useState } from 'react';
import {
  Eye, Share2, MoreVertical, FileText, Film,
  Image as ImageIcon, FileSpreadsheet, Presentation,
  Sparkles,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ContentTypeBadge } from '@/components/shared/ContentTypeBadge';
import { formatBytes, formatRelativeDate } from '@/lib/utils/format';
import type { Asset, AssetAnalysis } from '@/types';
import { cn } from '@/lib/utils';

/* Per-file-type gradient + icon config */
const FILE_STYLE: Record<string, { gradient: string; icon: typeof FileText; color: string }> = {
  pdf:  { gradient: 'from-red-50 to-orange-50',   icon: FileText,      color: '#ef4444' },
  pptx: { gradient: 'from-orange-50 to-amber-50', icon: Presentation,  color: '#f97316' },
  ppt:  { gradient: 'from-orange-50 to-amber-50', icon: Presentation,  color: '#f97316' },
  xlsx: { gradient: 'from-emerald-50 to-teal-50', icon: FileSpreadsheet,color: '#10b981' },
  xls:  { gradient: 'from-emerald-50 to-teal-50', icon: FileSpreadsheet,color: '#10b981' },
  mp4:  { gradient: 'from-violet-50 to-purple-50',icon: Film,          color: '#8b5cf6' },
  mov:  { gradient: 'from-violet-50 to-purple-50',icon: Film,          color: '#8b5cf6' },
};

function FileThumbnail({ asset }: { asset: Asset }) {
  const isImage = asset.mime_type?.startsWith('image/');
  const isVideo = asset.mime_type?.startsWith('video/');
  const style = FILE_STYLE[asset.file_type.toLowerCase()];
  const Icon = isVideo ? Film : (style?.icon ?? FileText);
  const gradient = style?.gradient ?? 'from-slate-50 to-slate-100';
  const color = style?.color ?? '#94a3b8';

  if (isImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={asset.file_url} alt={asset.name}
           className="w-full h-full object-cover" />
    );
  }

  return (
    <div className={cn('w-full h-full bg-gradient-to-br flex flex-col items-center justify-center gap-2', gradient)}>
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm"
           style={{ background: `${color}18` }}>
        <Icon className="w-5 h-5" style={{ color }} strokeWidth={1.5} />
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: `${color}99` }}>
        {asset.file_type.toUpperCase()}
      </span>
    </div>
  );
}

function EngagementDot({ score }: { score?: number }) {
  if (!score) return null;
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#f87171';
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
          style={{ background: `${color}18`, color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {score}
    </span>
  );
}

interface AssetCardProps {
  asset: Asset;
  selected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  onClick?: () => void;
  onShare?: () => void;
  onArchive?: () => void;
}

export function AssetCard({
  asset, selected = false, onSelect, onClick, onShare, onArchive,
}: AssetCardProps) {
  const [hovered, setHovered] = useState(false);
  const analysis = asset.metadata?.ai_analysis as AssetAnalysis | undefined;
  const avgScore = analysis?.scores
    ? Math.round((analysis.scores.clarity + analysis.scores.persuasiveness + analysis.scores.specificity + analysis.scores.cta_strength) / 4)
    : undefined;

  return (
    <div
      className={cn(
        'group relative bg-card rounded-2xl overflow-hidden cursor-pointer',
        'transition-all duration-200 ease-out',
        selected
          ? 'ring-2 ring-indigo-500 shadow-card-hover -translate-y-0.5'
          : 'shadow-card hover:shadow-card-hover hover:-translate-y-1',
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative h-44 overflow-hidden">
        <FileThumbnail asset={asset} />

        {/* Top-left: checkbox */}
        {onSelect && (
          <div
            className={cn(
              'absolute top-2.5 left-2.5 w-5 h-5 rounded-md border-2 bg-white flex items-center justify-center',
              'transition-all duration-150 shadow-sm',
              selected || hovered ? 'opacity-100 scale-100' : 'opacity-0 scale-90',
            )}
            style={{ borderColor: selected ? '#6366f1' : '#cbd5e1' }}
            onClick={(e) => { e.stopPropagation(); onSelect(asset.id, !selected); }}
          >
            {selected && (
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: '#6366f1' }} />
            )}
          </div>
        )}

        {/* Top-right badges */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
          {analysis && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                  style={{ background: 'rgba(99,102,241,0.9)', color: '#fff' }}>
              <Sparkles className="w-2.5 h-2.5" />
              {avgScore}/10
            </span>
          )}
          {asset.version > 1 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-medium"
                  style={{ background: 'rgba(15,23,42,0.75)', color: '#e2e8f0' }}>
              v{asset.version}
            </span>
          )}
        </div>

        {/* Hover overlay */}
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center gap-2',
            'transition-all duration-150',
            hovered ? 'opacity-100' : 'opacity-0 pointer-events-none',
          )}
          style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(2px)' }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onClick?.(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={{ background: 'rgba(255,255,255,0.95)', color: '#1e293b' }}
          >
            <Eye className="w-3.5 h-3.5" /> View
          </button>
          {onShare && (
            <button
              onClick={(e) => { e.stopPropagation(); onShare(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{ background: '#6366f1', color: '#fff' }}
            >
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="px-3.5 py-3">
        <div className="flex items-start gap-2 mb-2">
          <h3 className="text-[13px] font-semibold line-clamp-2 leading-snug flex-1"
              style={{ color: 'var(--foreground)' }}>
            {asset.name}
          </h3>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="p-1 rounded-md transition-colors flex-shrink-0 mt-0.5"
              style={{ color: 'var(--muted-foreground)' }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClick?.(); }}>
                <Eye className="w-3.5 h-3.5 mr-2" /> View details
              </DropdownMenuItem>
              {onShare && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onShare(); }}>
                  <Share2 className="w-3.5 h-3.5 mr-2" /> Create link
                </DropdownMenuItem>
              )}
              {onArchive && (
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onClick={(e) => { e.stopPropagation(); onArchive(); }}
                >
                  Archive
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Type + campaign */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
          <ContentTypeBadge contentType={asset.content_type} />
          {asset.campaign_name && (
            <span className="text-[11px] truncate max-w-[110px]" style={{ color: 'var(--muted-foreground)' }}>
              {asset.campaign_name}
            </span>
          )}
        </div>

        {/* Footer row */}
        <div className="flex items-center gap-2.5 text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
          {asset.file_size_bytes && (
            <span>{formatBytes(asset.file_size_bytes)}</span>
          )}
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" /> {asset.view_count}
          </span>
          <span className="flex items-center gap-1">
            <Share2 className="w-3 h-3" /> {asset.share_count}
          </span>
          <span className="ml-auto">{formatRelativeDate(asset.created_at)}</span>
        </div>
      </div>

      {/* Selected indicator */}
      {selected && (
        <div className="absolute inset-x-0 bottom-0 h-0.5" style={{ background: '#6366f1' }} />
      )}
    </div>
  );
}
