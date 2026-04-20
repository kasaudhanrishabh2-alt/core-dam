import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { searchAssets } from '@/lib/claude/semanticSearch';

function getService() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const query = searchParams.get('q');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 50);
  const content_type = searchParams.get('content_type') ?? undefined;
  const campaign_name = searchParams.get('campaign_name') ?? undefined;

  if (!query) {
    return Response.json({ error: 'q parameter is required' }, { status: 400 });
  }

  const results = await searchAssets(query, limit, {
    ...(content_type ? { content_type } : {}),
    ...(campaign_name ? { campaign_name } : {}),
  });

  if (results.length === 0) {
    return Response.json({ results: [], query });
  }

  // Fetch enriched asset data (metadata, dates, stats, AI analysis)
  const ids = results.map(r => r.id);
  const { data: assets } = await getService()
    .from('assets')
    .select('id, metadata, created_at, view_count, share_count, campaign_name, tags')
    .in('id', ids);

  const assetMap = new Map((assets ?? []).map((a: {
    id: string; metadata: Record<string, unknown>;
    created_at: string; view_count: number; share_count: number;
    campaign_name: string | null; tags: Record<string, unknown>;
  }) => [a.id, a]));

  const enriched = results.map(r => ({
    ...r,
    metadata: assetMap.get(r.id)?.metadata ?? {},
    created_at: assetMap.get(r.id)?.created_at ?? null,
    view_count: assetMap.get(r.id)?.view_count ?? 0,
    share_count: assetMap.get(r.id)?.share_count ?? 0,
    campaign_name: assetMap.get(r.id)?.campaign_name ?? null,
    ai_summary: (assetMap.get(r.id)?.tags as { description?: string })?.description ?? null,
  }));

  return Response.json({ results: enriched, query });
}
