/**
 * CORE DAM — AI Provider
 *
 * generateText / streamText  → Claude claude-haiku-4-5-20251001 (fast, cheap, excellent at structured output)
 * generateEmbedding          → Gemini gemini-embedding-001 (stays on Gemini — embeddings API has separate quota)
 */

import Anthropic from '@anthropic-ai/sdk';

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
  return new Anthropic({ apiKey });
}

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';

/**
 * Generates a text completion (non-streaming).
 * Used for: auto-tagging, creative analysis, campaign summaries, weekly digest.
 */
export async function generateText(prompt: string): Promise<string> {
  const client = getAnthropicClient();
  const message = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });
  const block = message.content[0];
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude');
  return block.text;
}

/**
 * Streams a text response back as a Web ReadableStream.
 * Used for: Q&A chat interface.
 */
export async function streamText(prompt: string): Promise<ReadableStream<Uint8Array>> {
  const client = getAnthropicClient();
  const encoder = new TextEncoder();

  const stream = await client.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
    cancel() {
      stream.controller.abort();
    },
  });
}

/**
 * Generates a 768-dimensional embedding vector.
 * Stays on Gemini — embeddings have a separate quota from generation.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY is not set');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/gemini-embedding-001',
      content: { parts: [{ text: text.slice(0, 8000) }] },
      outputDimensionality: 768,
    }),
  });
  if (!res.ok) throw new Error(`Embedding error: ${await res.text()}`);
  const data: { embedding: { values: number[] } } = await res.json();
  return data.embedding.values;
}
