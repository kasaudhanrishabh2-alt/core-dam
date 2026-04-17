/**
 * CORE DAM — AI Provider Abstraction
 *
 * Currently: Google Gemini 1.5 Flash (free tier)
 * To upgrade to Claude later: set AI_PROVIDER=claude and add ANTHROPIC_API_KEY
 *
 * Free tier limits (Gemini):
 *   - 1,500 requests/day
 *   - 15 requests/minute
 *   - 1M tokens/minute
 */

import {
  GoogleGenerativeAI,
  type GenerateContentResult,
} from '@google/generative-ai';

// ── Gemini client ─────────────────────────────────────────────
function getGeminiClient() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY is not set');
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Generates a text completion (non-streaming).
 * Used for: auto-tagging, campaign summaries, weekly digest.
 */
export async function generateText(prompt: string): Promise<string> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const result: GenerateContentResult = await model.generateContent(prompt);
  return result.response.text();
}

/**
 * Streams a text response back as a Web ReadableStream.
 * Used for: Q&A chat interface.
 */
export async function streamText(prompt: string): Promise<ReadableStream<Uint8Array>> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const result = await model.generateContentStream(prompt);
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) controller.enqueue(encoder.encode(text));
      }
      controller.close();
    },
  });
}

/**
 * Generates a 768-dimensional embedding vector using Gemini.
 * Used for: semantic search via pgvector.
 *
 * Free tier: same as above — 1,500/day.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const genAI = getGeminiClient();
  // text-embedding-004 produces 768-dim vectors, free via Gemini API
  // Use REST directly to pass outputDimensionality: 768 (matching VECTOR(768) schema)
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
