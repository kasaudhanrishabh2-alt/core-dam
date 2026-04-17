import { getSalesforceAuthUrl } from '@/lib/salesforce/sync';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const authUrl = getSalesforceAuthUrl();
  return Response.redirect(authUrl);
}
