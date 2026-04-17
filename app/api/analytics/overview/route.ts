import { createClient } from '@/lib/supabase/server';
import type { AnalyticsOverview } from '@/types';

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Run aggregation queries in parallel
  const [
    assetsResult,
    linksResult,
    eventsResult,
    attributionResult,
    topAssetsResult,
    contentGapsResult,
  ] = await Promise.all([
    // Total active assets
    supabase
      .from('assets')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),

    // Active share links
    supabase
      .from('share_links')
      .select('id, asset_id, total_opens, total_time_seconds, engagement_score', { count: 'exact' })
      .eq('is_active', true),

    // Total opens (from events table)
    supabase
      .from('link_events')
      .select('id', { count: 'exact', head: true })
      .eq('event_type', 'opened'),

    // Revenue attributed (won deals)
    supabase
      .from('sf_attribution')
      .select('sf_amount')
      .eq('deal_outcome', 'won'),

    // Top 10 assets by engagement
    supabase
      .from('share_links')
      .select('asset_id, total_opens, total_time_seconds, asset:asset_id(id, name, content_type, share_count)')
      .eq('is_active', true)
      .order('total_opens', { ascending: false })
      .limit(10),

    // Content gaps (queries with no good match)
    supabase
      .from('ai_queries')
      .select('query_text, created_at')
      .eq('had_good_match', false)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  // Calculate total opens and avg engagement time from links
  const links = linksResult.data ?? [];
  const totalOpens = (eventsResult.count ?? 0);
  const totalTimeSeconds = links.reduce(
    (sum, l) => sum + ((l.total_time_seconds as number) ?? 0),
    0
  );
  const avgEngagementSeconds =
    links.length > 0 ? Math.round(totalTimeSeconds / links.length) : 0;

  // Revenue: sum of sf_amount from won deals with attribution
  const attributedRevenue = (attributionResult.data ?? []).reduce(
    (sum, r) => sum + ((r.sf_amount as number) ?? 0),
    0
  );

  const overview: AnalyticsOverview = {
    total_assets: assetsResult.count ?? 0,
    active_links: linksResult.count ?? 0,
    total_opens: totalOpens,
    avg_engagement_seconds: avgEngagementSeconds,
    attributed_revenue: attributedRevenue,
  };

  return Response.json({
    overview,
    top_assets: topAssetsResult.data ?? [],
    content_gaps: contentGapsResult.data ?? [],
    links_data: links.map((l) => ({
      asset_id: l.asset_id,
      opens: l.total_opens,
      time_seconds: l.total_time_seconds,
      score: l.engagement_score,
    })),
  });
}
