'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, X, Loader2, Check, AlertCircle, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CONTENT_TYPE_LABELS, validateFile } from '@/lib/utils/fileHelpers';
import { formatBytes } from '@/lib/utils/format';
import { ContentTypeBadge } from '@/components/shared/ContentTypeBadge';
import type { AutoTagResult, ContentType, CreativeType } from '@/types';
import { CREATIVE_TYPE_LABELS } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AssetUploaderProps {
  onComplete?: () => void;
  onClose?: () => void;
}

type UploadStep = 'select' | 'uploading' | 'tagging' | 'review' | 'saving' | 'done';

export function AssetUploader({ onComplete, onClose }: AssetUploaderProps) {
  const [step, setStep] = useState<UploadStep>('select');
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [tags, setTags] = useState<AutoTagResult | null>(null);
  const [storagePath, setStoragePath] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [editedTags, setEditedTags] = useState<Partial<AutoTagResult>>({});
  const [campaignOverride, setCampaignOverride] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  // New fields
  const [projectName, setProjectName] = useState('');
  const [launchName, setLaunchName] = useState('');
  const [creativeType, setCreativeType] = useState<CreativeType | ''>('');
  const [assetComments, setAssetComments] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const mergedTags: Partial<AutoTagResult> = { ...tags, ...editedTags };

  function handleFileChange(selectedFile: File) {
    const validation = validateFile(selectedFile);
    if (!validation.valid) {
      setError(validation.error ?? 'Invalid file');
      return;
    }
    setError(null);
    setFile(selectedFile);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileChange(dropped);
  }

  async function uploadFile() {
    if (!file) return;
    setStep('uploading');
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + 10, 85));
    }, 200);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/assets/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!res.ok) {
        const err: { error: string } = await res.json();
        throw new Error(err.error ?? 'Upload failed');
      }

      const data: { storagePath: string; fileUrl: string; extractedText: string } = await res.json();

      setStoragePath(data.storagePath);
      setFileUrl(data.fileUrl);
      setProgress(100);
      setStep('tagging');

      // Auto-tag — failure is non-blocking
      try {
        const tagRes = await fetch('/api/assets/auto-tag', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ extractedText: data.extractedText, fileName: file.name }),
        });
        if (tagRes.ok) {
          const tagData: AutoTagResult = await tagRes.json();
          setTags(tagData);
        }
      } catch {
        // AI tagging failed — proceed to review without suggestions
      }

      setStep('review');
    } catch (err) {
      clearInterval(progressInterval);
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(msg);
      setStep('select');
      toast.error(msg);
    }
  }

  async function saveAsset() {
    if (!file || !fileUrl) return;
    setStep('saving');

    try {
      const payload = {
        name: mergedTags.title_suggestion || file.name,
        description: mergedTags.description || null,
        file_url: fileUrl,
        file_type: file.name.split('.').pop()?.toLowerCase() ?? 'unknown',
        file_size_bytes: file.size,
        mime_type: file.type,
        storage_path: storagePath,
        content_type: mergedTags.content_type || null,
        industry_tags: mergedTags.industry_tags || [],
        deal_stage_relevance: mergedTags.deal_stage_relevance || [],
        campaign_name: campaignOverride || mergedTags.campaign_name || null,
        expires_at: expiryDate || null,
        tags: {
          key_topics: mergedTags.key_topics || [],
          product_focus: mergedTags.product_focus || [],
          audience_persona: mergedTags.audience_persona || null,
          tone: mergedTags.tone || null,
          confidence_score: mergedTags.confidence_score || null,
          title_suggestion: mergedTags.title_suggestion || null,
        },
        metadata: {
          project_name: projectName || null,
          launch_name: launchName || null,
          creative_type: creativeType || null,
          comments: assetComments || null,
        },
      };

      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err: { error: string } = await res.json();
        throw new Error(err.error ?? 'Failed to save asset');
      }

      setStep('done');
      toast.success('Asset uploaded successfully');
      setTimeout(() => { onComplete?.(); }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      setError(msg);
      setStep('review');
      toast.error(msg);
    }
  }

  return (
    <div className="max-w-xl w-full mx-auto">

      {/* Step: File select */}
      {step === 'select' && (
        <div className="space-y-4">
          <div
            className={cn(
              'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
              dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.pptx,.docx,.xlsx,.mp4,.png,.jpg,.jpeg,.gif,.svg"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChange(f); }}
            />
            <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-medium text-slate-700 mb-1">
              {file ? file.name : 'Drop a file here or click to browse'}
            </p>
            <p className="text-sm text-slate-400">PDF, PPTX, DOCX, XLSX, MP4, PNG, JPG, GIF, SVG — max 100 MB</p>
            {file && (
              <p className="text-xs text-indigo-600 mt-2 font-medium">{formatBytes(file.size)} selected</p>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-2">
            {onClose && (
              <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            )}
            <Button
              onClick={uploadFile}
              disabled={!file}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Upload className="w-4 h-4 mr-2" /> Upload & Analyze
            </Button>
          </div>
        </div>
      )}

      {/* Step: Uploading / Tagging */}
      {(step === 'uploading' || step === 'tagging') && (
        <div className="py-8 text-center space-y-4">
          <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto">
            {step === 'tagging'
              ? <Tag className="w-7 h-7 text-indigo-600 animate-pulse" />
              : <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />}
          </div>
          <div>
            <p className="font-semibold text-slate-900">
              {step === 'uploading' ? 'Uploading…' : 'AI is analyzing your asset…'}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {step === 'uploading' ? 'Securely transferring your file' : 'Extracting text and generating tags'}
            </p>
          </div>
          {step === 'uploading' && (
            <div className="w-full bg-slate-100 rounded-full h-2 max-w-xs mx-auto">
              <div className="bg-indigo-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      )}

      {/* Step: Review — always renders after upload, with or without AI tags */}
      {step === 'review' && (
        <div className="space-y-4">
          {/* AI tag status banner */}
          <div className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
            tags
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-amber-50 text-amber-700'
          )}>
            {tags
              ? <><Check className="w-4 h-4 flex-shrink-0" /> AI tagging complete — confidence {Math.round((tags.confidence_score ?? 0) * 100)}%</>
              : <><AlertCircle className="w-4 h-4 flex-shrink-0" /> AI tagging unavailable — fill in details manually</>
            }
          </div>

          <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">

            {/* Asset Name */}
            <div className="space-y-1">
              <Label className="text-xs">Asset Name <span className="text-red-500">*</span></Label>
              <Input
                value={String(mergedTags.title_suggestion ?? file?.name ?? '')}
                onChange={(e) => setEditedTags(t => ({ ...t, title_suggestion: e.target.value }))}
                placeholder="Enter asset name"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <textarea
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
                rows={2}
                value={String(mergedTags.description ?? '')}
                onChange={(e) => setEditedTags(t => ({ ...t, description: e.target.value }))}
                placeholder="Brief description of this asset"
              />
            </div>

            {/* Content Type + Creative Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Content Type</Label>
                <Select
                  value={mergedTags.content_type ?? 'other'}
                  onValueChange={(v) => setEditedTags(t => ({ ...t, content_type: v as ContentType }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONTENT_TYPE_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Creative Format</Label>
                <Select
                  value={creativeType || 'none'}
                  onValueChange={(v) => setCreativeType(v === 'none' ? '' : v as CreativeType)}
                >
                  <SelectTrigger><SelectValue placeholder="Select format" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {Object.entries(CREATIVE_TYPE_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Project + Launch (SFDC hierarchy) */}
            <div className="space-y-1">
              <Label className="text-xs text-slate-500 uppercase tracking-wide">Salesforce</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Project Name</Label>
                  <Input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g. Q2 India Launch"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Launch Name</Label>
                  <Input
                    value={launchName}
                    onChange={(e) => setLaunchName(e.target.value)}
                    placeholder="e.g. April WhatsApp Blast"
                    disabled={!projectName}
                  />
                </div>
              </div>
              {!projectName && (
                <p className="text-xs text-slate-400">Set a Project Name to enable Launch Name</p>
              )}
            </div>

            {/* Campaign */}
            <div className="space-y-1">
              <Label className="text-xs">Campaign Name</Label>
              <Input
                placeholder={mergedTags.campaign_name ?? 'Optional'}
                value={campaignOverride}
                onChange={(e) => setCampaignOverride(e.target.value)}
              />
            </div>

            {/* Expiry */}
            <div className="space-y-1">
              <Label className="text-xs">Expiry Date (optional)</Label>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>

            {/* Comments */}
            <div className="space-y-1">
              <Label className="text-xs">Comments / Notes</Label>
              <textarea
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
                rows={2}
                value={assetComments}
                onChange={(e) => setAssetComments(e.target.value)}
                placeholder="Any context, usage notes, or approval status…"
              />
            </div>

            {/* AI-detected topics (read-only preview) */}
            {mergedTags.key_topics && mergedTags.key_topics.length > 0 && (
              <div>
                <Label className="text-xs mb-1.5 block">AI-detected Topics</Label>
                <div className="flex flex-wrap gap-1.5">
                  {mergedTags.key_topics.map((t) => (
                    <span key={t} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Industries */}
            {mergedTags.industry_tags && mergedTags.industry_tags.length > 0 && (
              <div>
                <Label className="text-xs mb-1.5 block">Industries</Label>
                <div className="flex flex-wrap gap-1.5">
                  {mergedTags.industry_tags.map((t) => (
                    <span key={t} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {mergedTags.audience_persona && (
              <p className="text-xs text-slate-500">
                <span className="font-medium text-slate-700">Audience:</span> {mergedTags.audience_persona}
              </p>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              onClick={() => { setStep('select'); setFile(null); setTags(null); setError(null); }}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-1.5" /> Start over
            </Button>
            <Button onClick={saveAsset} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white">
              <Check className="w-4 h-4 mr-1.5" /> Save to Library
            </Button>
          </div>
        </div>
      )}

      {/* Step: Saving */}
      {step === 'saving' && (
        <div className="py-8 text-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="font-medium text-slate-900">Saving to library…</p>
        </div>
      )}

      {/* Step: Done */}
      {step === 'done' && (
        <div className="py-8 text-center space-y-3">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <p className="font-semibold text-slate-900">Asset added to library!</p>
          <p className="text-sm text-slate-500">It&apos;s now searchable and ready to share.</p>
        </div>
      )}
    </div>
  );
}
