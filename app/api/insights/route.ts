import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { InsightType } from '@/types';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const insight_type = searchParams.get('type') as InsightType | null;
  const search = searchParams.get('search');
  const campaign = searchParams.get('campaign');

  let query = supabase
    .from('insights')
    .select('*, author:author_id(id, full_name, avatar_url)')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (insight_type) query = query.eq('insight_type', insight_type);
  if (campaign) query = query.eq('related_campaign', campaign);
  if (search) query = query.ilike('title', `%${search}%`);

  const { data, error } = await query;

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ insights: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'marketing_manager', 'content_creator'].includes(profile.role)) {
    return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const body: {
    title: string;
    insight_type: InsightType;
    content: string;
    related_asset_ids?: string[];
    related_campaign?: string;
    tags?: Record<string, unknown>;
  } = await request.json();

  if (!body.title || !body.insight_type || !body.content) {
    return Response.json(
      { error: 'title, insight_type, and content are required' },
      { status: 400 }
    );
  }

  const { data: insight, error } = await supabase
    .from('insights')
    .insert({
      title: body.title,
      insight_type: body.insight_type,
      content: body.content,
      related_asset_ids: body.related_asset_ids ?? null,
      related_campaign: body.related_campaign ?? null,
      tags: body.tags ?? {},
      author_id: user.id,
      is_published: true,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ insight }, { status: 201 });
}
