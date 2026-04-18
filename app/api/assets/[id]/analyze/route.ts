import { NextRequest } from 'next/server';

// Gemini analysis can take 15-30s — extend beyond default 10s
export const maxDuration = 60;
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { analyzeAssetCreative } from '@/lib/claude/autoTag';

function getService() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const service = getService();

  const { data: asset, error } = await service
    .from('assets')
    .select('id, name, extracted_text, content_type, metadata')
    .eq('id', id)
    .single();

  if (error || !asset) return Response.json({ error: 'Asset not found' }, { status: 404 });

  try {
    const analysis = await analyzeAssetCreative(
      asset.extracted_text ?? '',
      asset.name,
      asset.content_type
    );

    const { error: updateError } = await service
      .from('assets')
      .update({ metadata: { ...(asset.metadata ?? {}), ai_analysis: analysis } })
      .eq('id', id);

    if (updateError) return Response.json({ error: updateError.message }, { status: 500 });

    return Response.json({ analysis });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Analysis failed';
    console.error('Creative analysis error:', msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
