import { NextRequest } from 'next/server';

// Gemini analysis can take 15-30s — extend beyond default 10s
export const maxDuration = 60;
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { analyzeAssetCreative, analyzeAssetCreativeWithVision, analyzeYoutubeAssetCreative } from '@/lib/claude/autoTag';

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
    .select('id, name, extracted_text, content_type, metadata, mime_type, file_url')
    .eq('id', id)
    .single();

  if (error || !asset) return Response.json({ error: 'Asset not found' }, { status: 404 });

  const mimeType: string = asset.mime_type ?? '';
  const isYoutube = mimeType === 'video/youtube' || asset.file_url?.includes('youtube.com') || asset.file_url?.includes('youtu.be');
  const isVisual = !isYoutube && (mimeType.startsWith('image/') || mimeType.startsWith('video/'));

  try {
    let analysis;

    if (isYoutube && asset.file_url) {
      // YouTube assets: pass URL directly to Gemini — no download needed
      // Gemini 1.5+ accepts YouTube URLs natively via fileData.fileUri
      analysis = await analyzeYoutubeAssetCreative(asset.file_url, asset.name, asset.content_type);
    } else if (isVisual && asset.file_url) {
      // Image/video assets: download from storage and pass to Gemini vision
      const fileRes = await fetch(asset.file_url);
      if (!fileRes.ok) throw new Error('Failed to fetch asset file for analysis');
      const buffer = await fileRes.arrayBuffer();
      if (buffer.byteLength > 10 * 1024 * 1024) {
        // Fall back to text analysis for large files
        analysis = await analyzeAssetCreative(asset.extracted_text ?? '', asset.name, asset.content_type);
      } else {
        const fileBase64 = Buffer.from(buffer).toString('base64');
        analysis = await analyzeAssetCreativeWithVision(fileBase64, mimeType, asset.name, asset.content_type);
      }
    } else {
      analysis = await analyzeAssetCreative(asset.extracted_text ?? '', asset.name, asset.content_type);
    }

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
