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
  Sparkles,
  Loader2,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContentTypeBadge } from '@/components/shared/ContentTypeBadge';
import { formatBytes, formatDate, formatRelativeDate } from '@/lib/utils/format';
import type { Asset, AssetAnalysis } from '@/types';
import { cn } from '@/lib/utils';

interface AssetDrawerProps {
  asset: Asset | null;
  onClose: () => void;
  onShare?: () => void;
  onArchive?: () => void;
}

type Tab = 'details' | 'analysis';

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color =
    score >= 7 ? 'bg-emerald-500' : score >= 4 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-slate-600">{label}</span>
        <span className="text-xs font-semibold text-slate-800">{score}/10</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${score * 10}%` }} />
      </div>
    </div>
  );
}

function NarrativeStep({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2.5">
      <div className="flex flex-col items-center">
        <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
        <div className="w-px flex-1 bg-slate-200 mt-1" />
      </div>
      <div className="pb-3 min-w-0">
        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-xs text-slate-600 leading-relaxed">{value}</p>
      </div>
    </div>
  );
}

function TagList({ items, color }: { items: string[]; color: string }) {
  if (!items?.length) return <p className="text-xs text-slate-400 italic">None identified</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span key={i} className={cn('px-2 py-0.5 rounded-full text-xs', color)}>
          {item}
        </span>
      ))}
    </div>
  );
}

function AnalysisPanel({ analysis }: { analysis: AssetAnalysis }) {
  const arc = analysis.narrative_arc;
  const hasArc = arc.hook || arc.problem || arc.solution || arc.proof || arc.cta;

  return (
    <div className="p-5 space-y-5">
      {/* Scores */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Creative Scores</p>
        <div className="space-y-2.5">
          <ScoreBar label="Clarity" score={analysis.scores.clarity} />
          <ScoreBar label="Persuasiveness" score={analysis.scores.persuasiveness} />
          <ScoreBar label="Specificity" score={analysis.scores.specificity} />
          <ScoreBar label="CTA Strength" score={analysis.scores.cta_strength} />
        </div>
      </div>

      {/* Narrative Arc */}
      {hasArc && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Narrative Arc</p>
          <div>
            <NarrativeStep label="Hook" value={arc.hook} />
            <NarrativeStep label="Problem" value={arc.problem} />
            <NarrativeStep label="Solution" value={arc.solution} />
            <NarrativeStep label="Proof" value={arc.proof} />
            <NarrativeStep label="CTA" value={arc.cta} />
          </div>
        </div>
      )}

      {/* Strengths / Weaknesses / Missing */}
      <div className="space-y-3">
        {analysis.strengths?.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Strengths</p>
            </div>
            <ul className="space-y-1">
              {analysis.strengths.map((s, i) => (
                <li key={i} className="text-xs text-slate-600 flex gap-1.5">
                  <span className="text-emerald-400 flex-shrink-0">•</span>{s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {analysis.weaknesses?.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Weaknesses</p>
            </div>
            <ul className="space-y-1">
              {analysis.weaknesses.map((w, i) => (
                <li key={i} className="text-xs text-slate-600 flex gap-1.5">
                  <span className="text-amber-400 flex-shrink-0">•</span>{w}
                </li>
              ))}
            </ul>
          </div>
        )}
        {analysis.missing_elements?.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <XCircle className="w-3.5 h-3.5 text-red-400" />
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Missing Elements</p>
            </div>
            <ul className="space-y-1">
              {analysis.missing_elements.map((m, i) => (
                <li key={i} className="text-xs text-slate-600 flex gap-1.5">
                  <span className="text-red-300 flex-shrink-0">•</span>{m}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Key Claims */}
      {analysis.key_claims?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Key Claims</p>
          <TagList items={analysis.key_claims} color="bg-indigo-50 text-indigo-700" />
        </div>
      )}

      {/* Proof Points */}
      {analysis.proof_points?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Proof Points</p>
          <TagList items={analysis.proof_points} color="bg-emerald-50 text-emerald-700" />
        </div>
      )}

      {/* Value Props */}
      {analysis.value_propositions?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Value Propositions</p>
          <TagList items={analysis.value_propositions} color="bg-violet-50 text-violet-700" />
        </div>
      )}

      {/* Ideal Use Case */}
      {analysis.ideal_use_case && (
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Ideal Use Case</p>
          <p className="text-xs text-slate-600 leading-relaxed">{analysis.ideal_use_case}</p>
        </div>
      )}

      {/* Alternative Narrative */}
      {analysis.competing_narratives && (
        <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1.5">Stronger Alternative</p>
          <p className="text-xs text-amber-800 leading-relaxed">{analysis.competing_narratives}</p>
        </div>
      )}

      <p className="text-xs text-slate-400 text-right">
        Analyzed {formatDate(analysis.analyzed_at)}
      </p>
    </div>
  );
}

export function AssetDrawer({ asset, onClose, onShare, onArchive }: AssetDrawerProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [tab, setTab] = useState<Tab>('details');
  const [analysing, setAnalysing] = useState(false);
  const [analyseError, setAnalyseError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AssetAnalysis | null>(
    (asset?.metadata?.ai_analysis as AssetAnalysis) ?? null
  );

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

  async function runAnalysis() {
    setAnalysing(true);
    setAnalyseError(null);
    try {
      const res = await fetch(`/api/assets/${asset!.id}/analyze`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        setAnalyseError(json.error ?? `Server error ${res.status}`);
      } else if (json.analysis) {
        setAnalysis(json.analysis);
      } else {
        setAnalyseError('No analysis returned — try again');
      }
    } catch (err) {
      setAnalyseError(err instanceof Error ? err.message : 'Network error — check connection');
    } finally {
      setAnalysing(false);
    }
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

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-5 pt-2">
          <button
            onClick={() => setTab('details')}
            className={cn(
              'pb-2 mr-5 text-sm font-medium border-b-2 transition-colors',
              tab === 'details'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            Details
          </button>
          <button
            onClick={() => setTab('analysis')}
            className={cn(
              'pb-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5',
              tab === 'analysis'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Analysis
            {analysis && (
              <span className="ml-1 w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            )}
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'details' ? (
            <>
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
            </>
          ) : (
            /* Analysis tab */
            analysis ? (
              <>
                <AnalysisPanel analysis={analysis} />
                <div className="px-5 pb-5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={runAnalysis}
                    disabled={analysing}
                    className="w-full text-slate-500"
                  >
                    {analysing ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    {analysing ? 'Re-analysing…' : 'Re-run Analysis'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 px-8 text-center">
                {analysing ? (
                  <>
                    <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
                      <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                    </div>
                    <p className="text-sm font-medium text-slate-800 mb-1">Analysing creative…</p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      AI is reading the content. This takes 15–30 seconds.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
                      <Sparkles className="w-6 h-6 text-indigo-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-800 mb-1">No analysis yet</p>
                    <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                      AI will break down narrative arc, creative scores, key claims, strengths, and improvement areas.
                    </p>
                    {analyseError && (
                      <div className="mb-4 px-3 py-2 bg-red-50 border border-red-100 rounded-lg w-full text-left">
                        <p className="text-xs text-red-600 font-medium">Analysis failed</p>
                        <p className="text-xs text-red-500 mt-0.5">{analyseError}</p>
                      </div>
                    )}
                    <Button
                      onClick={runAnalysis}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      size="sm"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      {analyseError ? 'Retry Analysis' : 'Run AI Analysis'}
                    </Button>
                  </>
                )}
              </div>
            )
          )}
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
