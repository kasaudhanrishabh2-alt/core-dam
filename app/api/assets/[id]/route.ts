import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserRole } from '@/lib/supabase/getRole';

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/assets/[id]'>
) {
  const { id } = await ctx.params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: asset, error } = await supabase
    .from('assets')
    .select('*, uploader:uploaded_by(id, full_name, avatar_url)')
    .eq('id', id)
    .single();

  if (error || !asset) {
    return Response.json({ error: 'Asset not found' }, { status: 404 });
  }

  // Increment view count
  await supabase
    .from('assets')
    .update({ view_count: asset.view_count + 1 })
    .eq('id', id);

  return Response.json({ asset });
}

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<'/api/assets/[id]'>
) {
  const { id } = await ctx.params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body: Record<string, unknown> = await request.json();

  // Whitelist updatable fields
  const allowed = [
    'name', 'description', 'content_type', 'campaign_name',
    'industry_tags', 'deal_stage_relevance', 'tags', 'status',
    'expires_at', 'approved_by',
  ];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  const { data: asset, error } = await supabase
    .from('assets')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ asset });
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<'/api/assets/[id]'>
) {
  const { id } = await ctx.params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const role = await getUserRole(user.id);
  if (!role || !['admin', 'marketing_manager'].includes(role)) {
    return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { error } = await supabase.from('assets').delete().eq('id', id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return new Response(null, { status: 204 });
}
