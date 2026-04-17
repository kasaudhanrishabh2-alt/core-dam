'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Archive, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AssetCard } from '@/components/assets/AssetCard';
import { AssetDrawer } from '@/components/assets/AssetDrawer';
import { AssetUploader } from '@/components/assets/AssetUploader';
import { FilterBar, type AssetFilters } from '@/components/assets/FilterBar';
import { AssetCardSkeleton } from '@/components/shared/LoadingSkeleton';
import type { Asset } from '@/types';
import { toast } from 'sonner';

const DEFAULT_FILTERS: AssetFilters = {
  search: '',
  content_type: 'all',
  campaign_name: '',
  deal_stage: '',
  status: 'active',
  sort: 'newest',
};

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AssetFilters>(DEFAULT_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerAsset, setDrawerAsset] = useState<Asset | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<string[]>([]);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.content_type !== 'all') params.set('content_type', filters.content_type);
    if (filters.campaign_name) params.set('campaign_name', filters.campaign_name);
    if (filters.deal_stage) params.set('deal_stage', filters.deal_stage);
    if (filters.status !== 'all') params.set('status', filters.status);
    if (filters.search) params.set('search', filters.search);
    params.set('sort', filters.sort);

    try {
      const res = await fetch(`/api/assets?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load assets');
      const data: { assets: Asset[]; campaigns: string[] } = await res.json();
      setAssets(data.assets);
      if (data.campaigns.length > 0) setCampaigns(data.campaigns);
    } catch {
      toast.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  function toggleSelect(id: string, selected: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function bulkArchive() {
    if (selectedIds.size === 0) return;
    try {
      await fetch('/api/assets/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selectedIds], status: 'archived' }),
      });
      toast.success(`${selectedIds.size} asset(s) archived`);
      setSelectedIds(new Set());
      loadAssets();
    } catch {
      toast.error('Failed to archive assets');
    }
  }

  async function archiveAsset(id: string) {
    try {
      await fetch(`/api/assets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' }),
      });
      toast.success('Asset archived');
      setDrawerAsset(null);
      loadAssets();
    } catch {
      toast.error('Failed to archive asset');
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Asset Library</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {loading ? 'Loading…' : `${assets.length} asset${assets.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={bulkArchive}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <Archive className="w-4 h-4 mr-1.5" />
              Archive {selectedIds.size}
            </Button>
          )}
          <Button
            onClick={() => setUploadOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Upload Asset
          </Button>
        </div>
      </div>

      {/* Filters */}
      <FilterBar filters={filters} onChange={setFilters} campaigns={campaigns} />

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <AssetCardSkeleton key={i} />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-20">
          <Upload className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-600 mb-1">No assets found</h3>
          <p className="text-slate-400 text-sm mb-4">
            {filters.search || filters.content_type !== 'all'
              ? 'Try adjusting your filters'
              : 'Upload your first asset to get started'}
          </p>
          {!filters.search && filters.content_type === 'all' && (
            <Button
              onClick={() => setUploadOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Upload Asset
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {assets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              selected={selectedIds.has(asset.id)}
              onSelect={toggleSelect}
              onClick={() => setDrawerAsset(asset)}
              onShare={() => {
                // Navigate to create link with this asset pre-selected
                window.location.href = `/links?asset=${asset.id}`;
              }}
              onArchive={() => archiveAsset(asset.id)}
            />
          ))}
        </div>
      )}

      {/* Asset drawer */}
      {drawerAsset && (
        <AssetDrawer
          asset={drawerAsset}
          onClose={() => setDrawerAsset(null)}
          onShare={() => {
            window.location.href = `/links?asset=${drawerAsset.id}`;
          }}
          onArchive={() => archiveAsset(drawerAsset.id)}
        />
      )}

      {/* Upload dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Upload New Asset</DialogTitle>
          </DialogHeader>
          <AssetUploader
            onComplete={() => {
              setUploadOpen(false);
              loadAssets();
            }}
            onClose={() => setUploadOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
