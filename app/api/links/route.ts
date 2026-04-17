import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateShortCode } from '@/lib/utils/format';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user: authUser } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // Admins and managers see all links; others see their own
  let query = supabase
    .from('share_links')
    .select('*, asset:asset_id(id, name, content_type, file_url, file_type)')
    .order('created_at', { ascending: false });

  if (!profile || !['admin', 'marketing_manager'].includes(profile.role)) {
    query = query.eq('created_by', authUser!.id);
  }

  const { data: links, error } = await query;

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ links: links ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body: {
    asset_id: string;
    recipient_name?: string;
    recipient_email?: string;
    recipient_company?: string;
    salesforce_opportunity_id?: string;
    salesforce_opportunity_name?: string;
    salesforce_account_id?: string;
    salesforce_account_name?: string;
    sf_deal_stage?: string;
    sf_deal_amount?: number;
    expires_at?: string;
    require_email_gate?: boolean;
  } = await request.json();

  if (!body.asset_id) {
    return Response.json({ error: 'asset_id is required' }, { status: 400 });
  }

  // Generate a unique short code
  let shortCode = generateShortCode(8);
  let attempts = 0;
  while (attempts < 5) {
    const { data: existing } = await supabase
      .from('share_links')
      .select('id')
      .eq('short_code', shortCode)
      .single();
    if (!existing) break;
    shortCode = generateShortCode(8);
    attempts++;
  }

  const { data: link, error } = await supabase
    .from('share_links')
    .insert({
      short_code: shortCode,
      asset_id: body.asset_id,
      created_by: user.id,
      recipient_name: body.recipient_name ?? null,
      recipient_email: body.recipient_email ?? null,
      recipient_company: body.recipient_company ?? null,
      salesforce_opportunity_id: body.salesforce_opportunity_id ?? null,
      salesforce_opportunity_name: body.salesforce_opportunity_name ?? null,
      salesforce_account_id: body.salesforce_account_id ?? null,
      salesforce_account_name: body.salesforce_account_name ?? null,
      sf_deal_stage: body.sf_deal_stage ?? null,
      sf_deal_amount: body.sf_deal_amount ?? null,
      expires_at: body.expires_at ?? null,
      require_email_gate: body.require_email_gate ?? false,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Increment asset share_count
  await supabase.rpc('increment', { table: 'assets', id: body.asset_id, column: 'share_count' }).maybeSingle();

  // If linked to Salesforce opportunity, create attribution record
  if (body.salesforce_opportunity_id) {
    await supabase.from('sf_attribution').insert({
      asset_id: body.asset_id,
      link_id: link.id,
      sf_opportunity_id: body.salesforce_opportunity_id,
      sf_opportunity_name: body.salesforce_opportunity_name ?? null,
      sf_account_id: body.salesforce_account_id ?? null,
      sf_account_name: body.salesforce_account_name ?? null,
      sf_stage_at_share: body.sf_deal_stage ?? null,
      sf_amount: body.sf_deal_amount ?? null,
    });
  }

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/share/${shortCode}`;
  return Response.json({ link, shareUrl }, { status: 201 });
}
