import { NextRequest } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

// Public API — no auth required. Uses service client for read-only link lookup.
function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/share/[code]'>
) {
  const { code } = await ctx.params;
  const supabase = getServiceClient();

  const { data: link, error } = await supabase
    .from('share_links')
    .select('*, asset:asset_id(id, name, description, file_url, file_type, mime_type, content_type, tags)')
    .eq('short_code', code)
    .single();

  if (error || !link) {
    return Response.json({ error: 'Link not found' }, { status: 404 });
  }

  if (!link.is_active) {
    return Response.json({ error: 'This link has been deactivated' }, { status: 410 });
  }

  if (link.expires_at && new Date(link.expires_at as string) < new Date()) {
    return Response.json({ error: 'This link has expired' }, { status: 410 });
  }

  return Response.json({ link });
}
