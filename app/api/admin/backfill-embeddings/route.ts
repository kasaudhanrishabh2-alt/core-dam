/**
 * POST /api/admin/backfill-embeddings
 *
 * Generates Gemini embeddings for all assets that currently have
 * embedding = NULL. Call this once after deploying to fix existing assets.
 *
 * Returns: { processed: N, failed: N, skipped: N }
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { generateEmbedding } from '@/lib/ai/provider';

// Backfilling many assets can take > default 10s Vercel limit
export const maxDuration = 300;

function getService() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const service = getService();

  // Only admins / marketing managers may trigger backfill
  const { data: profile } = await service
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'marketing_manager'].includes(profile.role)) {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  // Fetch all assets without an embedding
  const { data: assets, error } = await service
    .from('assets')
    .select('id, name, description, extracted_text, tags, industry_tags, campaign_name, metadata')
    .is('embedding', null)
    .eq('status', 'active');

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const rows = assets ?? [];
  if (rows.length === 0) {
    return Response.json({ message: 'All assets already have embeddings', processed: 0, failed: 0, skipped: 0 });
  }

  let processed = 0;
  let failed = 0;

  for (const asset of rows) {
    try {
      const tags = (asset.tags ?? {}) as Record<string, unknown>;
      const meta = (asset.metadata ?? {}) as Record<string, unknown>;

      const searchText = [
        asset.name,
        asset.description ?? '',
        ...(tags.key_topics as string[] ?? []),
        ...(tags.product_focus as string[] ?? []),
        ...(asset.industry_tags ?? []),
        meta.project_name as string ?? '',
        meta.launch_name as string ?? '',
        asset.campaign_name ?? '',
        (asset.extracted_text ?? '').slice(0, 4000),
      ].filter(Boolean).join(' ').trim();

      if (!searchText) {
        failed++;
        continue;
      }

      const embedding = await generateEmbedding(searchText);

      const { error: updateErr } = await service
        .from('assets')
        .update({ embedding })
        .eq('id', asset.id);

      if (updateErr) {
        console.error(`Failed to update embedding for ${asset.id}:`, updateErr.message);
        failed++;
      } else {
        processed++;
      }

      // Small delay to avoid Gemini rate limits (1 req/sec on free tier)
      await new Promise(r => setTimeout(r, 250));
    } catch (err) {
      console.error(`Embedding failed for ${asset.id}:`, err);
      failed++;
    }
  }

  return Response.json({
    message: `Backfill complete: ${processed} embedded, ${failed} failed`,
    processed,
    failed,
    total: rows.length,
  });
}
