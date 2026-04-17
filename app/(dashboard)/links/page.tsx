'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Link2, Copy, Check, ExternalLink, Activity, MoreVertical, CloudUpload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ContentTypeBadge } from '@/components/shared/ContentTypeBadge';
import { TableRowSkeleton } from '@/components/shared/LoadingSkeleton';
import { formatRelativeDate, formatDuration } from '@/lib/utils/format';
import type { ShareLink, Asset, SalesforceOpportunity } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function LinksPage() {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailLink, setDetailLink] = useState<ShareLink | null>(null);

  // Form state
  const [assetSearch, setAssetSearch] = useState('');
  const [assetResults, setAssetResults] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientCompany, setRecipientCompany] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [requireEmailGate, setRequireEmailGate] = useState(false);
  const [sfSearch, setSfSearch] = useState('');
  const [sfResults, setSfResults] = useState<SalesforceOpportunity[]>([]);
  const [selectedSfOpp, setSelectedSfOpp] = useState<SalesforceOpportunity | null>(null);
  const [creating, setCreating] = useState(false);
  const [newLink, setNewLink] = useState<{ link: ShareLink; shareUrl: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState('');

  const loadLinks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/links');
      const data: { links: ShareLink[] } = await res.json();
      setLinks(data.links);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  // Asset search with debounce
  useEffect(() => {
    if (!assetSearch.trim()) { setAssetResults([]); return; }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/assets?search=${encodeURIComponent(assetSearch)}&status=active`);
      const data: { assets: Asset[] } = await res.json();
      setAssetResults(data.assets.slice(0, 6));
    }, 300);
    return () => clearTimeout(timer);
  }, [assetSearch]);

  // SF opportunity search
  useEffect(() => {
    if (!sfSearch.trim()) { setSfResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/salesforce/opportunities?q=${encodeURIComponent(sfSearch)}`);
        if (res.ok) {
          const data: { opportunities: SalesforceOpportunity[] } = await res.json();
          setSfResults(data.opportunities);
        }
      } catch {
        // SF not connected — silently skip
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [sfSearch]);

  async function createLink() {
    if (!selectedAsset) { toast.error('Please select an asset'); return; }
    setCreating(true);
    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_id: selectedAsset.id,
          recipient_name: recipientName || null,
          recipient_email: recipientEmail || null,
          recipient_company: recipientCompany || null,
          expires_at: expiryDate || null,
          require_email_gate: requireEmailGate,
          salesforce_opportunity_id: selectedSfOpp?.Id ?? null,
          salesforce_opportunity_name: selectedSfOpp?.Name ?? null,
          salesforce_account_id: selectedSfOpp?.Account?.Name ? undefined : null,
          salesforce_account_name: selectedSfOpp?.Account?.Name ?? null,
          sf_deal_stage: selectedSfOpp?.StageName ?? null,
          sf_deal_amount: selectedSfOpp?.Amount ?? null,
        }),
      });
      if (!res.ok) {
        const err: { error: string } = await res.json();
        throw new Error(err.error);
      }
      const data: { link: ShareLink; shareUrl: string } = await res.json();
      setNewLink(data);
      toast.success('Trackable link created!');
      loadLinks();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create link');
    } finally {
      setCreating(false);
    }
  }

  async function copyLink(url: string, code: string) {
    await navigator.clipboard.writeText(url);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2000);
    toast.success('Link copied!');
  }

  async function syncToSF(linkId: string) {
    const res = await fetch(`/api/links/${linkId}/sync-sf`, { method: 'POST' });
    if (res.ok) {
      toast.success('Activity logged in Salesforce');
    } else {
      const err: { error: string } = await res.json();
      toast.error(err.error);
    }
  }

  function engagementColor(score: number) {
    if (score >= 70) return 'text-emerald-600';
    if (score >= 40) return 'text-amber-500';
    return 'text-red-500';
  }

  function resetForm() {
    setAssetSearch(''); setAssetResults([]); setSelectedAsset(null);
    setRecipientName(''); setRecipientEmail(''); setRecipientCompany('');
    setExpiryDate(''); setRequireEmailGate(false);
    setSfSearch(''); setSfResults([]); setSelectedSfOpp(null);
    setNewLink(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Trackable Links</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Share assets with engagement tracking and Salesforce attribution
          </p>
        </div>
        <Button
          onClick={() => { resetForm(); setCreateOpen(true); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Create Link
        </Button>
      </div>

      {/* Links table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Asset</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Salesforce</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-center">Opens</TableHead>
              <TableHead className="text-center">Time Spent</TableHead>
              <TableHead className="text-center">Score</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={9} />)
            ) : links.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-slate-400">
                  <Link2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>No links created yet</p>
                </TableCell>
              </TableRow>
            ) : (
              links.map((link) => {
                const shareUrl = `${process.env.NEXT_PUBLIC_CF_TRACKER_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? ''}/${link.short_code}`;
                return (
                  <TableRow
                    key={link.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => setDetailLink(link)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-900 text-sm line-clamp-1">
                          {link.asset?.name ?? '—'}
                        </p>
                        <ContentTypeBadge contentType={link.asset?.content_type ?? null} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="font-medium text-slate-700">{link.recipient_name ?? '—'}</p>
                        <p className="text-slate-400 text-xs">{link.recipient_company ?? ''}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-slate-600 line-clamp-1">
                        {link.salesforce_opportunity_name ?? '—'}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {formatRelativeDate(link.created_at)}
                    </TableCell>
                    <TableCell className="text-center font-medium text-slate-800">
                      {link.total_opens}
                    </TableCell>
                    <TableCell className="text-center text-sm text-slate-600">
                      {formatDuration(link.total_time_seconds)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn('font-semibold text-sm', engagementColor(link.engagement_score))}>
                        {link.engagement_score}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          link.is_active
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        )}
                      >
                        {link.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="p-1.5 text-slate-400 hover:text-slate-600 rounded">
                          <MoreVertical className="w-4 h-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => copyLink(shareUrl, link.short_code)}>
                            {copiedCode === link.short_code ? <Check className="w-3.5 h-3.5 mr-2" /> : <Copy className="w-3.5 h-3.5 mr-2" />}
                            Copy link
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => window.open(shareUrl, '_blank', 'noopener,noreferrer')}>
                            <ExternalLink className="w-3.5 h-3.5 mr-2" /> Open in new tab
                          </DropdownMenuItem>
                          {link.salesforce_opportunity_id && (
                            <DropdownMenuItem onClick={() => syncToSF(link.id)}>
                              <CloudUpload className="w-3.5 h-3.5 mr-2" /> Sync to Salesforce
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create link dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { if (!o) resetForm(); setCreateOpen(o); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Trackable Link</DialogTitle>
          </DialogHeader>

          {newLink ? (
            <div className="space-y-4 py-2">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <Check className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="font-semibold text-slate-900 mb-1">Link created!</p>
                <p className="text-sm text-slate-500 mb-3">Share this URL with your recipient</p>
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
                  <code className="text-sm text-indigo-600 flex-1 truncate">
                    {newLink.shareUrl}
                  </code>
                  <button
                    onClick={() => copyLink(newLink.shareUrl, newLink.link.short_code)}
                    className="text-slate-400 hover:text-slate-600 flex-shrink-0"
                  >
                    {copiedCode === newLink.link.short_code ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { resetForm(); setCreateOpen(false); }}
              >
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Asset picker */}
              <div className="space-y-1.5">
                <Label>Asset <span className="text-red-500">*</span></Label>
                {selectedAsset ? (
                  <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{selectedAsset.name}</p>
                      <ContentTypeBadge contentType={selectedAsset.content_type} />
                    </div>
                    <button
                      onClick={() => setSelectedAsset(null)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      placeholder="Search assets…"
                      value={assetSearch}
                      onChange={(e) => setAssetSearch(e.target.value)}
                    />
                    {assetResults.length > 0 && (
                      <div className="absolute top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-10 overflow-hidden">
                        {assetResults.map((a) => (
                          <button
                            key={a.id}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm flex items-center gap-2"
                            onClick={() => { setSelectedAsset(a); setAssetSearch(''); setAssetResults([]); }}
                          >
                            <ContentTypeBadge contentType={a.content_type} />
                            <span className="truncate">{a.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Recipient */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Recipient Name</Label>
                  <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Jane Smith" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Recipient Email</Label>
                  <Input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="jane@acme.com" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Recipient Company</Label>
                <Input value={recipientCompany} onChange={(e) => setRecipientCompany(e.target.value)} placeholder="Acme Corp" />
              </div>

              {/* Salesforce */}
              <div className="space-y-1.5">
                <Label className="text-xs">Salesforce Opportunity (optional)</Label>
                {selectedSfOpp ? (
                  <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{selectedSfOpp.Name}</p>
                      <p className="text-xs text-slate-500">{selectedSfOpp.StageName} • {selectedSfOpp.Account?.Name}</p>
                    </div>
                    <button onClick={() => setSelectedSfOpp(null)} className="text-slate-400 hover:text-slate-600">×</button>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      placeholder="Search opportunities…"
                      value={sfSearch}
                      onChange={(e) => setSfSearch(e.target.value)}
                    />
                    {sfResults.length > 0 && (
                      <div className="absolute top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-10 overflow-hidden">
                        {sfResults.map((opp) => (
                          <button
                            key={opp.Id}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm"
                            onClick={() => { setSelectedSfOpp(opp); setSfSearch(''); setSfResults([]); }}
                          >
                            <p className="font-medium">{opp.Name}</p>
                            <p className="text-xs text-slate-500">{opp.StageName} • {opp.Account?.Name}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Settings */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Expiry Date</Label>
                  <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
                </div>
                <div className="flex items-center gap-2 mt-5">
                  <input
                    type="checkbox"
                    id="email-gate"
                    checked={requireEmailGate}
                    onChange={(e) => setRequireEmailGate(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <Label htmlFor="email-gate" className="text-xs cursor-pointer">Require email to view</Label>
                </div>
              </div>

              <Button
                onClick={createLink}
                disabled={creating || !selectedAsset}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {creating ? (
                  <Activity className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Link2 className="w-4 h-4 mr-2" />
                )}
                {creating ? 'Creating…' : 'Generate Link'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Link detail dialog */}
      <Dialog open={!!detailLink} onOpenChange={(o) => { if (!o) setDetailLink(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Link Details</DialogTitle>
          </DialogHeader>
          {detailLink && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: 'Opens', value: detailLink.total_opens },
                  { label: 'Time Spent', value: formatDuration(detailLink.total_time_seconds) },
                  { label: 'Score', value: `${detailLink.engagement_score}/100` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-lg font-semibold text-slate-900">{value}</p>
                    <p className="text-xs text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2 text-sm">
                <p><span className="text-slate-500">Asset:</span> <strong>{detailLink.asset?.name}</strong></p>
                {detailLink.recipient_name && <p><span className="text-slate-500">Recipient:</span> {detailLink.recipient_name} ({detailLink.recipient_email})</p>}
                {detailLink.salesforce_opportunity_name && <p><span className="text-slate-500">Opportunity:</span> {detailLink.salesforce_opportunity_name}</p>}
                <p><span className="text-slate-500">Created:</span> {formatRelativeDate(detailLink.created_at)}</p>
              </div>
              {detailLink.salesforce_opportunity_id && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => syncToSF(detailLink.id)}
                >
                  <CloudUpload className="w-4 h-4 mr-2" /> Sync Activity to Salesforce
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
