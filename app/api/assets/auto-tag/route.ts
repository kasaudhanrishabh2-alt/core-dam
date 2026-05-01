import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { autoTagAsset, autoTagAssetWithVision, autoTagYoutubeAsset } from '@/lib/claude/autoTag';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: {
    extractedText: string;
    fileName: string;
    fileBase64?: string | null;
    mimeType?: string | null;
    youtubeUrl?: string | null;
  } = await request.json();

  if (!body.fileName) {
    return Response.json({ error: 'fileName is required' }, { status: 400 });
  }

  try {
    let tags;
    if (body.youtubeUrl && body.mimeType === 'video/youtube') {
      // YouTube: pass URL directly to Gemini — no download needed
      tags = await autoTagYoutubeAsset(body.youtubeUrl, body.fileName);
    } else if (body.fileBase64 && body.mimeType &&
        (body.mimeType.startsWith('image/') || body.mimeType.startsWith('video/'))) {
      // Image/video files: use Gemini vision with base64
      tags = await autoTagAssetWithVision(body.fileBase64, body.mimeType, body.fileName);
    } else {
      // Documents and PDFs: use Groq text model
      tags = await autoTagAsset(body.extractedText, body.fileName);
    }
    return Response.json(tags);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Auto-tagging failed';
    console.error('Auto-tag error:', msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
