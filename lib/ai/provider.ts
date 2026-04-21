/**
 * CORE DAM — AI Provider
 *
 * generateText / streamText  → Groq (free tier, Llama 3.3 70B)
 * generateEmbedding          → Gemini gemini-embedding-001 (separate quota)
 */

import Groq from 'groq-sdk';

const GROQ_MODEL = 'llama-3.3-70b-versatile';

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set');
  return new Groq({ apiKey });
}

/**
 * Generates a text completion (non-streaming).
 * Used for: auto-tagging, creative analysis, campaign summaries.
 */
export async function generateText(prompt: string): Promise<string> {
  const client = getGroqClient();
  const completion = await client.chat.completions.create({
    model: GROQ_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2048,
    temperature: 0.3,
  });
  return completion.choices[0]?.message?.content ?? '';
}

/**
 * Streams a text response back as a Web ReadableStream.
 * Used for: Q&A chat interface.
 */
export async function streamText(prompt: string): Promise<ReadableStream<Uint8Array>> {
  const client = getGroqClient();
  const encoder = new TextEncoder();

  const stream = await client.chat.completions.create({
    model: GROQ_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1024,
    temperature: 0.4,
    stream: true,
  });

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? '';
        if (text) controller.enqueue(encoder.encode(text));
      }
      controller.close();
    },
  });
}

/**
 * Generates a text completion using Gemini 1.5 Flash with an inline image or video.
 * Used for: auto-tagging and creative analysis of images/videos.
 * Supported mimeTypes: image/jpeg, image/png, image/gif, image/webp, video/mp4, etc.
 */
export async function generateTextWithVision(
  prompt: string,
  fileBase64: string,
  mimeType: string
): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY is not set');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: fileBase64 } },
        ],
      }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
    }),
  });

  if (!res.ok) throw new Error(`Gemini vision error: ${await res.text()}`);
  const data = await res.json() as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
  };
  return data.candidates[0]?.content?.parts[0]?.text ?? '';
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
