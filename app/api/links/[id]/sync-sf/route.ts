import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeCollateralActivity } from '@/lib/salesforce/sync';

export async function POST(
  _req: NextRequest,
  ctx: RouteContext<'/api/links/[id]/sync-sf'>
) {
  const { id } = await ctx.params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Load link + asset
  const { data: link, error: linkError } = await supabase
    .from('share_links')
    .select('*, asset:asset_id(id, name, content_type)')
    .eq('id', id)
    .single();

  if (linkError || !link) {
    return Response.json({ error: 'Link not found' }, { status: 404 });
  }

  if (!link.salesforce_opportunity_id) {
    return Response.json({ error: 'Link is not connected to a Salesforce opportunity' }, { status: 400 });
  }

  // Get user's SF tokens
  const { data: profile } = await supabase
    .from('profiles')
    .select('salesforce_access_token, salesforce_instance_url')
    .eq('id', user.id)
    .single();

  if (!profile?.salesforce_access_token || !profile?.salesforce_instance_url) {
    return Response.json({ error: 'Salesforce not connected. Please connect in Settings.' }, { status: 400 });
  }

  const asset = link.asset as { id: string; name: string; content_type: string | null } | null;

  try {
    const activityId = await writeCollateralActivity(
      profile.salesforce_access_token as string,
      profile.salesforce_instance_url as string,
      {
        salesforce_opportunity_id: link.salesforce_opportunity_id as string,
        recipient_name: link.recipient_name as string | null,
        recipient_email: link.recipient_email as string | null,
        recipient_company: link.recipient_company as string | null,
      },
      {
        assetName: asset?.name ?? 'Unknown Asset',
        contentType: asset?.content_type ?? 'other',
        timesOpened: link.total_opens as number,
        totalSeconds: link.total_time_seconds as number,
        score: link.engagement_score as number,
      }
    );

    // Mark as synced in attribution table
    await supabase
      .from('sf_attribution')
      .update({
        sf_activity_id: activityId,
        synced_to_sf: true,
        synced_at: new Date().toISOString(),
        times_opened: link.total_opens,
        total_time_seconds: link.total_time_seconds,
        engagement_score: link.engagement_score,
      })
      .eq('link_id', id);

    return Response.json({ ok: true, activityId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Salesforce sync failed';
    return Response.json({ error: msg }, { status: 500 });
  }
}
