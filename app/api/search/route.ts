import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchAssets } from '@/lib/claude/semanticSearch';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const query = searchParams.get('q');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 50);
  const content_type = searchParams.get('content_type') ?? undefined;
  const campaign_name = searchParams.get('campaign_name') ?? undefined;

  if (!query) {
    return Response.json({ error: 'q parameter is required' }, { status: 400 });
  }

  const results = await searchAssets(query, limit, {
    ...(content_type ? { content_type } : {}),
    ...(campaign_name ? { campaign_name } : {}),
  });

  return Response.json({ results, query });
}
