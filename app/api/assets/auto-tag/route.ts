import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { autoTagAsset, autoTagAssetWithVision } from '@/lib/claude/autoTag';

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
  } = await request.json();

  if (!body.fileName) {
    return Response.json({ error: 'fileName is required' }, { status: 400 });
  }

  try {
    let tags;
    if (body.fileBase64 && body.mimeType &&
        (body.mimeType.startsWith('image/') || body.mimeType.startsWith('video/'))) {
      // Use Gemini vision for images and videos
      tags = await autoTagAssetWithVision(body.fileBase64, body.mimeType, body.fileName);
    } else {
      // Use Groq text model for documents and PDFs
      tags = await autoTagAsset(body.extractedText, body.fileName);
    }
    return Response.json(tags);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Auto-tagging failed';
    console.error('Auto-tag error:', msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
