import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/links/[id]'>
) {
  const { id } = await ctx.params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: link, error } = await supabase
    .from('share_links')
    .select('*, asset:asset_id(id, name, content_type, file_url, file_type, description)')
    .eq('id', id)
    .single();

  if (error || !link) return Response.json({ error: 'Link not found' }, { status: 404 });

  return Response.json({ link });
}

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<'/api/links/[id]'>
) {
  const { id } = await ctx.params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body: { is_active?: boolean; expires_at?: string } = await request.json();

  const { data: link, error } = await supabase
    .from('share_links')
    .update(body)
    .eq('id', id)
    .eq('created_by', user.id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ link });
}
