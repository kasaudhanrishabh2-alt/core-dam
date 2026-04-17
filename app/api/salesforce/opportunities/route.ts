import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchOpportunities, refreshAccessToken } from '@/lib/salesforce/sync';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const q = request.nextUrl.searchParams.get('q') ?? '';

  const { data: profile } = await supabase
    .from('profiles')
    .select('salesforce_access_token, salesforce_refresh_token, salesforce_instance_url')
    .eq('id', user.id)
    .single();

  if (!profile?.salesforce_access_token || !profile?.salesforce_instance_url) {
    return Response.json({ error: 'Salesforce not connected' }, { status: 400 });
  }

  let accessToken = profile.salesforce_access_token as string;
  const instanceUrl = profile.salesforce_instance_url as string;

  try {
    const opportunities = await searchOpportunities(accessToken, instanceUrl, q);
    return Response.json({ opportunities });
  } catch (err) {
    // Try token refresh on auth error
    if (
      profile.salesforce_refresh_token &&
      err instanceof Error &&
      err.message.includes('401')
    ) {
      try {
        const refreshed = await refreshAccessToken(profile.salesforce_refresh_token as string);
        accessToken = refreshed.access_token;

        await supabase
          .from('profiles')
          .update({ salesforce_access_token: accessToken })
          .eq('id', user.id);

        const opportunities = await searchOpportunities(accessToken, instanceUrl, q);
        return Response.json({ opportunities });
      } catch {
        return Response.json(
          { error: 'Salesforce authentication expired. Please reconnect.' },
          { status: 401 }
        );
      }
    }

    const msg = err instanceof Error ? err.message : 'Salesforce query failed';
    return Response.json({ error: msg }, { status: 500 });
  }
}
