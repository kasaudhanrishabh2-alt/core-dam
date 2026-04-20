import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getUserRole } from '@/lib/supabase/getRole';

function getService() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * DELETE /api/admin/clear-test-data
 * Admin-only: removes all assets, insights, share_links, and ai_queries.
 * Use before going live with real data.
 */
export async function DELETE(_request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const role = await getUserRole(user.id);
  if (role !== 'admin') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  const service = getService();

  // Delete in dependency order
  await service.from('link_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await service.from('sf_attribution').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await service.from('share_links').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await service.from('ai_queries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await service.from('insights').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const { error } = await service.from('assets').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true, message: 'All test data cleared. Ready for real assets.' });
}
