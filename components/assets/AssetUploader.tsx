'use client';

import { useState, useCallback, useRef } from 'react';
import {
  Upload, X, Loader2, Check, AlertCircle, Tag,
  PlayCircle, FolderOpen, File, AlertTriangle,
} from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
type UploadMode = 'file' | 'youtube' | 'folder';

// Known HOABL projects — will be extended by user input
const HOABL_PROJECTS = [
  'One Goa',
  'One Nagpur',
  'One Alibaug',
  'One Bengaluru',
  'One Ayodhya',
  'One Dapoli',
];

function parseYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

async function computeSHA256(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

interface FileWithMeta {
  file: File;
  hash?: string;
  duplicate?: boolean;
}

export function AssetUploader({ onComplete, onClose }: AssetUploaderProps) {
  const [mode, setMode] = useState<UploadMode>('file');
  const [step, setStep] = useState<UploadStep>('select');
  const [files, setFiles] = useState<FileWithMeta[]>([]);
  const [currentFileIdx, setCurrentFileIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [tags, setTags] = useState<AutoTagResult | null>(null);
  const [storagePath, setStoragePath] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [editedTags, setEditedTags] = useState<Partial<AutoTagResult>>({});
  const [expiryDate, setExpiryDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [fileHash, setFileHash] = useState<string | null>(null);

  // YouTube
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeTitle, setYoutubeTitle] = useState('');

  // Fields collected BEFORE upload (per user request)
  const [projectName, setProjectName] = useState('');
  const [launchName, setLaunchName] = useState('');
  const [creativeType, setCreativeType] = useState<CreativeType | ''>('');
  const [assetComments, setAssetComments] = useState('');
  const [campaignOverride, setCampaignOverride] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const mergedTags: Partial<AutoTagResult> = { ...tags, ...editedTags };

  function handleFileChange(selectedFiles: FileList | File[]) {
    const arr = Array.from(selectedFiles);
    const valid = arr.filter(f => {
      const v = validateFile(f);
      if (!v.valid) { setError(v.error ?? 'Invalid file'); return false; }
      return true;
    });
    if (valid.length === 0) return;
    setError(null);
    setFiles(valid.map(f => ({ file: f })));
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFileChange(e.dataTransfer.files);
  }

  async function checkDuplicate(buffer: ArrayBuffer, fileName: string): Promise<{ isDuplicate: boolean; hash: string; existingName?: string }> {
    try {
      const hash = await computeSHA256(buffer);
      const res = await fetch(`/api/assets/check-duplicate?hash=${hash}`);
      if (res.ok) {
        const data: { duplicate: boolean; asset_name?: string } = await res.json();
        return { isDuplicate: data.duplicate, hash, existingName: data.asset_name };
      }
      return { isDuplicate: false, hash };
    } catch {
      return { isDuplicate: false, hash: '' };
    }
  }

  async function uploadFile(fileWithMeta: FileWithMeta) {
    const { file } = fileWithMeta;
    setStep('uploading');
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + 10, 85));
    }, 200);

    try {
      // Compute hash + duplicate check before uploading
      const buffer = await file.arrayBuffer();
      const { isDuplicate, hash, existingName } = await checkDuplicate(buffer, file.name);

      if (isDuplicate) {
        setDuplicateWarning(`A file matching "${existingName ?? file.name}" already exists in your library.`);
      }
      if (hash) setFileHash(hash);

      const formData = new FormData();
      formData.append('file', file);
      if (hash) formData.append('fileHash', hash);

      const res = await fetch('/api/assets/upload', { method: 'POST', body: formData });
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
        // non-blocking
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

  async function handleUploadClick() {
    if (!projectName.trim()) {
      setError('Project Name is required before uploading');
      return;
    }
    if (mode === 'youtube') {
      await saveYoutubeAsset();
      return;
    }
    if (files.length === 0) return;
    await uploadFile(files[currentFileIdx]);
  }

  async function saveYoutubeAsset() {
    if (!youtubeUrl.trim()) { setError('Please enter a YouTube URL'); return; }
    if (!projectName.trim()) { setError('Project Name is required'); return; }

    const videoId = parseYoutubeId(youtubeUrl);
    if (!videoId) { setError('Invalid YouTube URL. Please use a youtube.com/watch or youtu.be link.'); return; }

    setStep('saving');
    try {
      const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      const payload = {
        name: youtubeTitle.trim() || `YouTube: ${videoId}`,
        file_url: `https://www.youtube.com/watch?v=${videoId}`,
        file_type: 'youtube',
        mime_type: 'video/youtube',
        content_type: 'video' as ContentType,
        campaign_name: campaignOverride || null,
        metadata: {
          project_name: projectName || null,
          launch_name: launchName || null,
          creative_type: creativeType || null,
          comments: assetComments || null,
          youtube_id: videoId,
          thumbnail_url: thumbnail,
        },
      };

      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err: { error: string } = await res.json();
        throw new Error(err.error ?? 'Failed to save YouTube asset');
      }

      setStep('done');
      toast.success('YouTube video added to library!');
      setTimeout(() => onComplete?.(), 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      setError(msg);
      setStep('select');
      toast.error(msg);
    }
  }

  async function saveAsset() {
    if (!files[currentFileIdx]?.file && !fileUrl) return;
    setStep('saving');

    try {
      const file = files[currentFileIdx]?.file;
      const payload = {
        name: mergedTags.title_suggestion || file?.name || 'Untitled',
        description: mergedTags.description || null,
        file_url: fileUrl,
        file_type: file?.name.split('.').pop()?.toLowerCase() ?? 'unknown',
        file_size_bytes: file?.size ?? null,
        mime_type: file?.type ?? null,
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
          file_hash: fileHash || null,
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

      // If folder upload with more files, continue
      const nextIdx = currentFileIdx + 1;
      if (mode === 'folder' && nextIdx < files.length) {
        setCurrentFileIdx(nextIdx);
        setTags(null);
        setEditedTags({});
        setDuplicateWarning(null);
        setError(null);
        toast.success(`Saved ${currentFileIdx + 1}/${files.length}: ${file?.name}`);
        await uploadFile(files[nextIdx]);
      } else {
        setStep('done');
        toast.success(mode === 'folder' ? `${files.length} assets added to library!` : 'Asset added to library!');
        setTimeout(() => onComplete?.(), 1500);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      setError(msg);
      setStep('review');
      toast.error(msg);
    }
  }

  function resetAll() {
    setStep('select'); setFiles([]); setTags(null); setEditedTags({});
    setError(null); setDuplicateWarning(null); setStoragePath(''); setFileUrl('');
    setCurrentFileIdx(0); setYoutubeUrl(''); setYoutubeTitle('');
  }

  const isPreUploadComplete = projectName.trim().length > 0;

  return (
    <div className="max-w-xl w-full mx-auto">

      {/* ── Select step ─────────────────────────────── */}
      {step === 'select' && (
        <div className="space-y-5">
          {/* Step 1: Mandatory metadata */}
          <div className="rounded-xl p-4 space-y-3"
               style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
              Step 1 — Project Details <span className="text-red-500">*</span>
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Project Name <span className="text-red-500">*</span></Label>
                <Input
                  list="hoabl-projects"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. One Goa, One Nagpur"
                  className={cn(!projectName && error ? 'border-red-300' : '')}
                />
                <datalist id="hoabl-projects">
                  {HOABL_PROJECTS.map(p => <option key={p} value={p} />)}
                </datalist>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Launch Name</Label>
                <Input
                  value={launchName}
                  onChange={(e) => setLaunchName(e.target.value)}
                  placeholder="e.g. Phase 1, Phase 2"
                  disabled={!projectName.trim()}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Creative Format</Label>
                <Select value={creativeType || 'none'} onValueChange={(v) => setCreativeType(v === 'none' ? '' : v as CreativeType)}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Select format" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {Object.entries(CREATIVE_TYPE_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Campaign / Phase</Label>
                <Input
                  value={campaignOverride}
                  onChange={(e) => setCampaignOverride(e.target.value)}
                  placeholder="e.g. Festive 2025"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Notes (optional)</Label>
              <textarea
                className="w-full text-xs border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
                style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
                rows={2}
                value={assetComments}
                onChange={(e) => setAssetComments(e.target.value)}
                placeholder="Usage notes, approval status, target audience…"
              />
            </div>
          </div>

          {/* Step 2: File source */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
              Step 2 — Add Asset
            </p>

            <Tabs value={mode} onValueChange={(v) => { setMode(v as UploadMode); setError(null); setFiles([]); }}>
              <TabsList className="w-full">
                <TabsTrigger value="file" className="flex-1 text-xs gap-1.5">
                  <File className="w-3.5 h-3.5" /> Single File
                </TabsTrigger>
                <TabsTrigger value="folder" className="flex-1 text-xs gap-1.5">
                  <FolderOpen className="w-3.5 h-3.5" /> Folder
                </TabsTrigger>
                <TabsTrigger value="youtube" className="flex-1 text-xs gap-1.5">
                  <PlayCircle className="w-3.5 h-3.5" /> YouTube
                </TabsTrigger>
              </TabsList>

              {/* Single file */}
              <TabsContent value="file" className="mt-3">
                <div
                  className={cn(
                    'border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer',
                    !isPreUploadComplete ? 'opacity-50 pointer-events-none' : '',
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
                    accept=".pdf,.pptx,.ppt,.docx,.xlsx,.mp4,.mov,.png,.jpg,.jpeg,.gif,.svg,.webp"
                    onChange={(e) => { if (e.target.files) handleFileChange(e.target.files); }}
                  />
                  <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
                    {files[0] ? files[0].file.name : 'Drop a file here or click to browse'}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                    PDF, PPTX, DOCX, XLSX, MP4, MOV, images — max 100 MB
                  </p>
                  {files[0] && (
                    <p className="text-xs text-indigo-600 mt-1.5 font-medium">{formatBytes(files[0].file.size)}</p>
                  )}
                </div>
                {!isPreUploadComplete && (
                  <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Fill in Project Name above to enable upload
                  </p>
                )}
              </TabsContent>

              {/* Folder upload */}
              <TabsContent value="folder" className="mt-3">
                <div
                  className={cn(
                    'border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer',
                    !isPreUploadComplete ? 'opacity-50 pointer-events-none' : '',
                    'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  )}
                  onClick={() => folderInputRef.current?.click()}
                >
                  <input
                    ref={folderInputRef}
                    type="file"
                    className="hidden"
                    // @ts-expect-error webkitdirectory is non-standard but widely supported
                    webkitdirectory=""
                    multiple
                    onChange={(e) => { if (e.target.files) handleFileChange(e.target.files); }}
                  />
                  <FolderOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
                    {files.length > 0 ? `${files.length} files selected` : 'Click to select a folder'}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                    Upload an entire launch collateral folder — all files share the same Project & Launch
                  </p>
                </div>
                {files.length > 0 && (
                  <div className="mt-2 max-h-28 overflow-y-auto space-y-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    {files.slice(0, 10).map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded" style={{ background: 'var(--muted)' }}>
                        <File className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate flex-1">{f.file.name}</span>
                        <span>{formatBytes(f.file.size)}</span>
                      </div>
                    ))}
                    {files.length > 10 && (
                      <p className="text-center py-1">+ {files.length - 10} more files</p>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* YouTube */}
              <TabsContent value="youtube" className="mt-3 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">YouTube URL <span className="text-red-500">*</span></Label>
                  <Input
                    value={youtubeUrl}
                    onChange={(e) => { setYoutubeUrl(e.target.value); setError(null); }}
                    placeholder="https://youtube.com/watch?v=... or youtu.be/..."
                    disabled={!isPreUploadComplete}
                  />
                  {youtubeUrl && parseYoutubeId(youtubeUrl) && (
                    <p className="text-xs text-emerald-600 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Valid YouTube URL detected
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Video Title (optional — auto-fills from URL)</Label>
                  <Input
                    value={youtubeTitle}
                    onChange={(e) => setYoutubeTitle(e.target.value)}
                    placeholder="e.g. One Goa Phase 2 — Launch Film"
                    disabled={!isPreUploadComplete}
                  />
                </div>
                {youtubeUrl && parseYoutubeId(youtubeUrl) && (
                  <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                    <img
                      src={`https://img.youtube.com/vi/${parseYoutubeId(youtubeUrl)}/hqdefault.jpg`}
                      alt="YouTube thumbnail"
                      className="w-full h-36 object-cover"
                    />
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}

          <div className="flex gap-2">
            {onClose && (
              <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            )}
            <Button
              onClick={handleUploadClick}
              disabled={
                !isPreUploadComplete ||
                (mode === 'file' && files.length === 0) ||
                (mode === 'folder' && files.length === 0) ||
                (mode === 'youtube' && !youtubeUrl.trim())
              }
              className="flex-1"
              style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
            >
              {mode === 'youtube'
                ? <><PlayCircle className="w-4 h-4 mr-2" /> Add to Library</>
                : mode === 'folder'
                ? <><FolderOpen className="w-4 h-4 mr-2" /> Upload {files.length} File{files.length !== 1 ? 's' : ''}</>
                : <><Upload className="w-4 h-4 mr-2" /> Upload & Analyze</>
              }
            </Button>
          </div>
        </div>
      )}

      {/* ── Uploading / Tagging ─────────────────────── */}
      {(step === 'uploading' || step === 'tagging') && (
        <div className="py-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
               style={{ background: 'oklch(0.455 0.215 268 / 0.1)' }}>
            {step === 'tagging'
              ? <Tag className="w-7 h-7 text-indigo-600 animate-pulse" />
              : <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />}
          </div>
          {mode === 'folder' && files.length > 1 && (
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              File {currentFileIdx + 1} of {files.length}
            </p>
          )}
          <div>
            <p className="font-semibold" style={{ color: 'var(--foreground)' }}>
              {step === 'uploading' ? 'Uploading…' : 'AI is analysing your asset…'}
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
              {step === 'uploading' ? 'Securely transferring your file' : 'Extracting text and generating tags'}
            </p>
          </div>
          {step === 'uploading' && (
            <div className="w-full rounded-full h-2 max-w-xs mx-auto" style={{ background: 'var(--muted)' }}>
              <div className="h-2 rounded-full transition-all duration-300"
                   style={{ width: `${progress}%`, background: 'var(--primary)' }} />
            </div>
          )}
        </div>
      )}

      {/* ── Review ──────────────────────────────────── */}
      {step === 'review' && (
        <div className="space-y-4">
          {duplicateWarning && (
            <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm bg-amber-50 text-amber-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Possible duplicate</p>
                <p className="text-xs mt-0.5">{duplicateWarning} You can still save as a new version.</p>
              </div>
            </div>
          )}

          {/* Context summary (read-only, already set) */}
          <div className="flex flex-wrap gap-2 text-xs">
            {projectName && (
              <span className="px-2 py-1 rounded-full font-medium"
                    style={{ background: 'oklch(0.455 0.215 268 / 0.1)', color: 'var(--primary)' }}>
                📍 {projectName}{launchName ? ` · ${launchName}` : ''}
              </span>
            )}
            {creativeType && (
              <span className="px-2 py-1 rounded-full"
                    style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                {CREATIVE_TYPE_LABELS[creativeType as CreativeType]}
              </span>
            )}
          </div>

          {/* AI tag status */}
          <div className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
            tags ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          )}>
            {tags
              ? <><Check className="w-4 h-4 flex-shrink-0" /> AI tagging complete — confidence {Math.round((tags.confidence_score ?? 0) * 100)}%</>
              : <><AlertCircle className="w-4 h-4 flex-shrink-0" /> AI tagging unavailable — fill in details manually</>
            }
          </div>

          <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
            <div className="space-y-1">
              <Label className="text-xs">Asset Name <span className="text-red-500">*</span></Label>
              <Input
                value={String(mergedTags.title_suggestion ?? files[currentFileIdx]?.file?.name ?? '')}
                onChange={(e) => setEditedTags(t => ({ ...t, title_suggestion: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <textarea
                className="w-full text-sm border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
                style={{ borderColor: 'var(--border)' }}
                rows={2}
                value={String(mergedTags.description ?? '')}
                onChange={(e) => setEditedTags(t => ({ ...t, description: e.target.value }))}
              />
            </div>

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
                <Label className="text-xs">Expiry Date</Label>
                <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
              </div>
            </div>

            {mergedTags.key_topics && mergedTags.key_topics.length > 0 && (
              <div>
                <Label className="text-xs mb-1.5 block">AI-detected Topics</Label>
                <div className="flex flex-wrap gap-1.5">
                  {mergedTags.key_topics.map((t) => (
                    <span key={t} className="px-2 py-0.5 rounded-full text-xs"
                          style={{ background: 'oklch(0.455 0.215 268 / 0.1)', color: 'var(--primary)' }}>{t}</span>
                  ))}
                </div>
              </div>
            )}

            {mergedTags.audience_persona && (
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                <span className="font-medium" style={{ color: 'var(--foreground)' }}>Audience:</span> {mergedTags.audience_persona}
              </p>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={resetAll} className="flex-1">
              <X className="w-4 h-4 mr-1.5" /> Start over
            </Button>
            <Button onClick={saveAsset}
                    className="flex-1"
                    style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}>
              <Check className="w-4 h-4 mr-1.5" />
              {mode === 'folder' && files.length > 1
                ? `Save (${currentFileIdx + 1}/${files.length})`
                : 'Save to Library'
              }
            </Button>
          </div>
        </div>
      )}

      {/* ── Saving ──────────────────────────────────── */}
      {step === 'saving' && (
        <div className="py-8 text-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="font-medium" style={{ color: 'var(--foreground)' }}>Saving to library…</p>
        </div>
      )}

      {/* ── Done ────────────────────────────────────── */}
      {step === 'done' && (
        <div className="py-8 text-center space-y-3">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <p className="font-semibold" style={{ color: 'var(--foreground)' }}>
            {mode === 'folder' ? `${files.length} assets added!` : 'Asset added to library!'}
          </p>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Now searchable and ready to share.
            {projectName && ` Indexed under ${projectName}${launchName ? ` · ${launchName}` : ''}.`}
          </p>
        </div>
      )}
    </div>
  );
}
