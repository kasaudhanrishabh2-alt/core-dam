import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { autoTagAsset } from '@/lib/claude/autoTag';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: { extractedText: string; fileName: string } = await request.json();

  if (!body.extractedText || !body.fileName) {
    return Response.json({ error: 'extractedText and fileName are required' }, { status: 400 });
  }

  try {
    const tags = await autoTagAsset(body.extractedText, body.fileName);
    return Response.json(tags);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Auto-tagging failed';
    console.error('Auto-tag error:', msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
