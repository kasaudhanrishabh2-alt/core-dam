'use client';

import { useState } from 'react';
import {
  Eye,
  Share2,
  MoreVertical,
  FileText,
  Film,
  Image as ImageIcon,
  FileSpreadsheet,
  Presentation,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ContentTypeBadge } from '@/components/shared/ContentTypeBadge';
import { formatBytes, formatRelativeDate } from '@/lib/utils/format';
import { FILE_TYPE_ICONS } from '@/lib/utils/fileHelpers';
import type { Asset } from '@/types';
import { cn } from '@/lib/utils';

interface AssetCardProps {
  asset: Asset;
  selected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  onClick?: () => void;
  onShare?: () => void;
  onArchive?: () => void;
}

function FileTypeIcon({ mimeType, fileType }: { mimeType: string | null; fileType: string }) {
  const ext = fileType.toLowerCase();
  if (mimeType?.startsWith('image/')) return <ImageIcon className="w-10 h-10 text-indigo-400" />;
  if (mimeType?.startsWith('video/')) return <Film className="w-10 h-10 text-red-400" />;
  if (ext === 'pdf') return <FileText className="w-10 h-10 text-red-500" />;
  if (ext === 'pptx') return <Presentation className="w-10 h-10 text-orange-400" />;
  if (ext === 'xlsx') return <FileSpreadsheet className="w-10 h-10 text-green-500" />;
  return <FileText className="w-10 h-10 text-slate-400" />;
}

export function AssetCard({
  asset,
  selected = false,
  onSelect,
  onClick,
  onShare,
  onArchive,
}: AssetCardProps) {
  const [hovered, setHovered] = useState(false);
  const isImage = asset.mime_type?.startsWith('image/');

  return (
    <div
      className={cn(
        'group bg-white rounded-xl border overflow-hidden cursor-pointer transition-all duration-150',
        selected
          ? 'border-indigo-400 ring-2 ring-indigo-200 shadow-md'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5'
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative h-44 bg-slate-50 flex items-center justify-center overflow-hidden">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.file_url}
            alt={asset.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-center px-4">
            <FileTypeIcon mimeType={asset.mime_type} fileType={asset.file_type} />
            <span className="text-xs text-slate-400 uppercase font-medium tracking-wide">
              {FILE_TYPE_ICONS[asset.file_type] ?? ''} {asset.file_type.toUpperCase()}
            </span>
          </div>
        )}

        {/* Version badge */}
        {asset.version > 1 && (
          <span className="absolute top-2 right-2 bg-slate-900/80 text-white text-xs px-1.5 py-0.5 rounded font-mono">
            v{asset.version}
          </span>
        )}

        {/* Select checkbox */}
        {onSelect && (
          <div
            className={cn(
              'absolute top-2 left-2 w-5 h-5 rounded border-2 bg-white flex items-center justify-center transition-opacity',
              selected || hovered ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(asset.id, !selected);
            }}
          >
            {selected && (
              <div className="w-3 h-3 bg-indigo-600 rounded-sm" />
            )}
          </div>
        )}

        {/* Hover actions */}
        <div
          className={cn(
            'absolute inset-0 bg-slate-900/40 flex items-center justify-center gap-2 transition-opacity',
            hovered ? 'opacity-100' : 'opacity-0'
          )}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onClick?.(); }}
            className="bg-white text-slate-800 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:bg-slate-50"
          >
            <Eye className="w-3.5 h-3.5" /> View
          </button>
          {onShare && (
            <button
              onClick={(e) => { e.stopPropagation(); onShare(); }}
              className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:bg-indigo-700"
            >
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium text-slate-900 line-clamp-2 leading-snug flex-1">
            {asset.name}
          </h3>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors flex-shrink-0"
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

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <ContentTypeBadge contentType={asset.content_type} />
          {asset.campaign_name && (
            <span className="text-xs text-slate-500 truncate max-w-[100px]">
              {asset.campaign_name}
            </span>
          )}
        </div>

        {/* Metadata row */}
        <div className="mt-2.5 flex items-center gap-3 text-xs text-slate-400">
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
    </div>
  );
}
