'use client';

import { useState } from 'react';
import {
  X,
  Share2,
  Download,
  ExternalLink,
  Clock,
  Eye,
  Tag,
  Calendar,
  User,
  Archive,
  FileText,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContentTypeBadge } from '@/components/shared/ContentTypeBadge';
import { formatBytes, formatDate, formatRelativeDate } from '@/lib/utils/format';
import type { Asset } from '@/types';
import { cn } from '@/lib/utils';

interface AssetDrawerProps {
  asset: Asset | null;
  onClose: () => void;
  onShare?: () => void;
  onArchive?: () => void;
}

export function AssetDrawer({ asset, onClose, onShare, onArchive }: AssetDrawerProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (!asset) return null;

  const tags = [
    ...(asset.tags.key_topics ?? []),
    ...(asset.industry_tags ?? []),
    ...(asset.tags.product_focus ?? []),
  ];

  async function copyUrl() {
    await navigator.clipboard.writeText(asset!.file_url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={cn(
          'fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50',
          'flex flex-col border-l border-slate-200',
          'transform transition-transform duration-200'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900 text-sm">Asset Details</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Preview area */}
          <div className="h-52 bg-slate-50 flex items-center justify-center border-b border-slate-100">
            {asset.mime_type?.startsWith('image/') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={asset.file_url}
                alt={asset.name}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">
                  {asset.file_type}
                </p>
              </div>
            )}
          </div>

          <div className="p-5 space-y-5">
            {/* Name + type */}
            <div>
              <h3 className="font-semibold text-slate-900 text-base leading-snug mb-2">
                {asset.name}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                <ContentTypeBadge contentType={asset.content_type} />
                {asset.version > 1 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                    v{asset.version}
                  </span>
                )}
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                    asset.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700'
                      : asset.status === 'archived'
                      ? 'bg-slate-100 text-slate-600'
                      : 'bg-amber-100 text-amber-700'
                  )}
                >
                  {asset.status}
                </span>
              </div>
            </div>

            {/* Description */}
            {asset.description && (
              <p className="text-sm text-slate-600 leading-relaxed">
                {asset.description}
              </p>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <Eye className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                <p className="text-lg font-semibold text-slate-900">{asset.view_count}</p>
                <p className="text-xs text-slate-500">Views</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <Share2 className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                <p className="text-lg font-semibold text-slate-900">{asset.share_count}</p>
                <p className="text-xs text-slate-500">Shares</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <FileText className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                <p className="text-lg font-semibold text-slate-900">
                  {asset.file_size_bytes ? formatBytes(asset.file_size_bytes) : '—'}
                </p>
                <p className="text-xs text-slate-500">Size</p>
              </div>
            </div>

            {/* Metadata list */}
            <div className="space-y-2.5">
              {asset.campaign_name && (
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-500">Campaign:</span>
                  <span className="text-slate-900 font-medium">{asset.campaign_name}</span>
                </div>
              )}
              {asset.deal_stage_relevance && asset.deal_stage_relevance.length > 0 && (
                <div className="flex items-start gap-2 text-sm">
                  <Clock className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-500 flex-shrink-0">Stages:</span>
                  <span className="text-slate-900">{asset.deal_stage_relevance.join(', ')}</span>
                </div>
              )}
              {asset.tags.audience_persona && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-500">Audience:</span>
                  <span className="text-slate-900">{String(asset.tags.audience_persona)}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="text-slate-500">Uploaded:</span>
                <span className="text-slate-900">{formatDate(asset.created_at)}</span>
              </div>
              {asset.expires_at && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span className="text-slate-500">Expires:</span>
                  <span className="text-amber-600 font-medium">
                    {formatRelativeDate(asset.expires_at)}
                  </span>
                </div>
              )}
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                  Tags
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Extracted text preview */}
            {asset.extracted_text && (
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                  Content Preview
                </p>
                <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3 leading-relaxed line-clamp-6">
                  {asset.extracted_text.slice(0, 400)}…
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="border-t border-slate-200 p-4 space-y-2">
          <div className="flex gap-2">
            {onShare && (
              <Button
                onClick={onShare}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                size="sm"
              >
                <Share2 className="w-3.5 h-3.5 mr-1.5" /> Create Link
              </Button>
            )}
            <a
              href={asset.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button variant="outline" size="sm" className="w-full">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Open
              </Button>
            </a>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copyUrl}
              className="flex-1 text-slate-600"
            >
              {copiedUrl ? (
                <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 mr-1.5" />
              )}
              {copiedUrl ? 'Copied!' : 'Copy URL'}
            </Button>
            {onArchive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onArchive}
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <Archive className="w-3.5 h-3.5 mr-1.5" /> Archive
              </Button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
