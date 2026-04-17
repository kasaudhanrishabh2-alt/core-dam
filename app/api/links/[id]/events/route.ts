import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { EventType } from '@/types';

// Public endpoint — no auth required (for tracking)
export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/links/[id]/events'>
) {
  const { id } = await ctx.params;
  const supabase = await createClient();

  const body: {
    event_type: EventType;
    page_number?: number;
    session_id?: string;
    duration_seconds?: number;
    device_type?: string;
    browser?: string;
    referer?: string;
  } = await request.json();

  // Verify link exists and is active
  const { data: link } = await supabase
    .from('share_links')
    .select('id, is_active, expires_at, total_opens, total_time_seconds')
    .eq('id', id)
    .single();

  if (!link || !link.is_active) {
    return Response.json({ error: 'Link not found or inactive' }, { status: 404 });
  }

  if (link.expires_at && new Date(link.expires_at as string) < new Date()) {
    return Response.json({ error: 'Link has expired' }, { status: 410 });
  }

  // Insert event
  await supabase.from('link_events').insert({
    link_id: id,
    event_type: body.event_type,
    page_number: body.page_number ?? null,
    session_id: body.session_id ?? null,
    duration_seconds: body.duration_seconds ?? null,
    device_type: body.device_type ?? null,
    browser: body.browser ?? null,
    referer: body.referer ?? null,
    ip_country: request.headers.get('cf-ipcountry') ?? null,
    ip_city: null, // Would come from Cloudflare Worker
  });

  // Update aggregates
  if (body.event_type === 'opened') {
    await supabase
      .from('share_links')
      .update({ total_opens: (link.total_opens as number) + 1 })
      .eq('id', id);
  }

  if (body.duration_seconds && body.duration_seconds > 0) {
    await supabase
      .from('share_links')
      .update({
        total_time_seconds: (link.total_time_seconds as number) + body.duration_seconds,
      })
      .eq('id', id);
  }

  return Response.json({ ok: true });
}

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/links/[id]/events'>
) {
  const { id } = await ctx.params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: events, error } = await supabase
    .from('link_events')
    .select('*')
    .eq('link_id', id)
    .order('created_at', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ events: events ?? [] });
}
