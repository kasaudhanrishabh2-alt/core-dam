import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function getService() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET /api/assets/check-duplicate?hash=<sha256>
 * Returns { duplicate: boolean, asset_name?: string }
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const hash = request.nextUrl.searchParams.get('hash');
  if (!hash) return Response.json({ duplicate: false });

  const { data } = await getService()
    .from('assets')
    .select('id, name')
    .eq("metadata->>'file_hash'", hash)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  return Response.json({ duplicate: !!data, asset_name: data?.name ?? null });
}
