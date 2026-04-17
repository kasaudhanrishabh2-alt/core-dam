/**
 * CORE DAM — Supabase Edge Function: process-upload / generate-embedding
 *
 * Dual-purpose function:
 * 1. Called via DB Webhook on INSERT to assets → generates & stores embedding
 * 2. Called directly with { text: string } → returns embedding array
 *
 * Uses: Google Gemini text-embedding-004 (free, 768 dims)
 * Deploy: supabase functions deploy process-upload
 */

const GEMINI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/**
 * Calls Gemini text-embedding-004 REST API.
 * Free tier: 1,500 req/day, 768-dimensional output.
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/text-embedding-004',
      content: { parts: [{ text: text.slice(0, 8000) }] },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini embedding error: ${err}`);
  }

  const data: { embedding: { values: number[] } } = await res.json();
  return data.embedding.values;
}

Deno.serve(async (req: Request) => {
  try {
    const body = await req.json();

    // ── Mode 1: Direct embedding request (from Next.js semantic search) ──
    if (body.text) {
      const embedding = await generateEmbedding(body.text);
      return new Response(JSON.stringify({ embedding }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── Mode 2: DB Webhook — process newly inserted asset ──
    const record = body.record;
    if (!record?.id) {
      return new Response('No asset record in payload', { status: 400 });
    }

    // Build rich text for embedding
    const textToEmbed = [
      record.name,
      record.description ?? '',
      record.extracted_text?.slice(0, 5000) ?? '',
      (record.industry_tags ?? []).join(' '),
      (record.deal_stage_relevance ?? []).join(' '),
      record.campaign_name ?? '',
      JSON.stringify(record.tags ?? {}),
    ]
      .filter(Boolean)
      .join('\n');

    if (!textToEmbed.trim()) {
      return new Response(JSON.stringify({ ok: true, skipped: 'no text' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const embedding = await generateEmbedding(textToEmbed);

    // Update the asset record with the embedding
    const updateRes = await fetch(
      `${SUPABASE_URL}/rest/v1/assets?id=eq.${record.id}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ embedding }),
      }
    );

    if (!updateRes.ok) {
      const err = await updateRes.text();
      throw new Error(`Failed to update asset embedding: ${err}`);
    }

    return new Response(JSON.stringify({ ok: true, assetId: record.id }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('process-upload error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
