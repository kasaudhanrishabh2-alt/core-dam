import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: { ids: string[]; status?: string; tags?: Record<string, unknown> } =
    await request.json();

  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return Response.json({ error: 'ids array is required' }, { status: 400 });
  }

  if (body.ids.length > 100) {
    return Response.json({ error: 'Maximum 100 assets per bulk operation' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.status) updates.status = body.status;
  if (body.tags) updates.tags = body.tags;

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: 'No updates provided' }, { status: 400 });
  }

  const { error } = await supabase
    .from('assets')
    .update(updates)
    .in('id', body.ids);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ updated: body.ids.length });
}
