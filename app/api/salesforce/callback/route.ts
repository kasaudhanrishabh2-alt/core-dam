import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForTokens } from '@/lib/salesforce/sync';
import { redirect } from 'next/navigation';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const code = request.nextUrl.searchParams.get('code');
  if (!code) {
    return Response.json({ error: 'No authorization code received' }, { status: 400 });
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    // Store tokens in the user's profile
    // NOTE: In production, encrypt tokens at rest
    await supabase
      .from('profiles')
      .update({
        salesforce_access_token: tokens.access_token,
        salesforce_refresh_token: tokens.refresh_token,
        salesforce_instance_url: tokens.instance_url,
      })
      .eq('id', user.id);

    redirect('/settings?sf=connected');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'OAuth exchange failed';
    redirect(`/settings?sf=error&message=${encodeURIComponent(msg)}`);
  }
}
