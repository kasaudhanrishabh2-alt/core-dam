import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getUserRole } from '@/lib/supabase/getRole';
import type { ContentType, AssetStatus } from '@/types';

function getService() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const content_type = searchParams.get('content_type') as ContentType | null;
  const campaign_name = searchParams.get('campaign_name');
  const deal_stage = searchParams.get('deal_stage');
  const status = (searchParams.get('status') ?? 'active') as AssetStatus;
  const search = searchParams.get('search');
  const sort = searchParams.get('sort') ?? 'newest';
  const project_name = searchParams.get('project_name');
  const launch_name = searchParams.get('launch_name');

  const service = getService();
  let query = service
    .from('assets')
    .select('*');

  // Filter by status
  if (status !== 'all' as string) {
    query = query.eq('status', status);
  }

  if (content_type) {
    query = query.eq('content_type', content_type);
  }

  if (campaign_name) {
    query = query.eq('campaign_name', campaign_name);
  }

  if (deal_stage) {
    query = query.contains('deal_stage_relevance', [deal_stage]);
  }

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  if (project_name) {
    query = query.eq("metadata->>project_name" as string, project_name);
  }

  if (launch_name) {
    query = query.eq("metadata->>launch_name" as string, launch_name);
  }

  // Sort
  switch (sort) {
    case 'oldest':
      query = query.order('created_at', { ascending: true });
      break;
    case 'most_shared':
      query = query.order('share_count', { ascending: false });
      break;
    case 'most_viewed':
      query = query.order('view_count', { ascending: false });
      break;
    case 'alphabetical':
      query = query.order('name', { ascending: true });
      break;
    default:
      query = query.order('created_at', { ascending: false });
  }

  const { data: assets, error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Fetch distinct values for filter dropdowns (always against full active set)
  const { data: metaRows } = await service
    .from('assets')
    .select('campaign_name, metadata')
    .eq('status', 'active');

  const campaigns = [...new Set(
    (metaRows ?? []).map((r: { campaign_name: string | null }) => r.campaign_name).filter(Boolean) as string[]
  )];

  const projects = [...new Set(
    (metaRows ?? [])
      .map((r: { metadata: { project_name?: string | null } }) => r.metadata?.project_name)
      .filter(Boolean) as string[]
  )].sort();

  const launches = [...new Set(
    (metaRows ?? [])
      .map((r: { metadata: { launch_name?: string | null } }) => r.metadata?.launch_name)
      .filter(Boolean) as string[]
  )].sort();

  return Response.json({ assets: assets ?? [], campaigns, projects, launches });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify role
  const role = await getUserRole(user.id);
  if (!role || !['admin', 'marketing_manager', 'content_creator'].includes(role)) {
    return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const body: {
    name: string;
    description?: string;
    file_url: string;
    file_type: string;
    file_size_bytes?: number;
    mime_type?: string;
    content_type?: ContentType;
    industry_tags?: string[];
    deal_stage_relevance?: string[];
    campaign_name?: string;
    expires_at?: string;
    tags?: Record<string, unknown>;
    storage_path?: string;
    metadata?: {
      project_name?: string | null;
      launch_name?: string | null;
      creative_type?: string | null;
      comments?: string | null;
      file_hash?: string | null;
    };
  } = await request.json();

  const { data: asset, error } = await getService()
    .from('assets')
    .insert({
      name: body.name,
      description: body.description ?? null,
      file_url: body.file_url,
      file_type: body.file_type,
      file_size_bytes: body.file_size_bytes ?? null,
      mime_type: body.mime_type ?? null,
      content_type: body.content_type ?? null,
      industry_tags: body.industry_tags ?? [],
      deal_stage_relevance: body.deal_stage_relevance ?? [],
      campaign_name: body.campaign_name ?? null,
      expires_at: body.expires_at ?? null,
      tags: body.tags ?? {},
      metadata: body.metadata ?? {},
      status: 'active',
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ asset }, { status: 201 });
}
