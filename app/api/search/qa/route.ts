import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { retrieveContextChunks } from '@/lib/claude/semanticSearch';
import { answerFromLibrary } from '@/lib/claude/autoTag';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: { query: string } = await request.json();
  if (!body.query?.trim()) {
    return Response.json({ error: 'query is required' }, { status: 400 });
  }

  const { chunks, assetIds, hasGoodMatch } = await retrieveContextChunks(body.query);

  // Log the query for gap analysis
  await supabase.from('ai_queries').insert({
    query_text: body.query,
    matched_asset_ids: assetIds,
    had_good_match: hasGoodMatch,
    user_id: user.id,
  });

  if (chunks.length === 0) {
    // Return a streaming-compatible response for "no match" case
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const msg =
          "I couldn't find this in your content library. Consider creating content covering this topic.";
        controller.enqueue(encoder.encode(msg));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'X-Asset-Ids': JSON.stringify([]),
        'X-Had-Good-Match': 'false',
      },
    });
  }

  const stream = await answerFromLibrary(body.query, chunks);

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'X-Asset-Ids': JSON.stringify(assetIds),
      'X-Had-Good-Match': String(hasGoodMatch),
    },
  });
}
