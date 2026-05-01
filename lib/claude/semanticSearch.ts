/**
 * CORE DAM — Semantic Search
 *
 * Generates embeddings via Google Gemini text-embedding-004 (free, 768 dims)
 * then runs cosine similarity search in Supabase pgvector.
 */

import { createClient } from '@/lib/supabase/server';
import { generateEmbedding } from '@/lib/ai/provider';
import type { SearchResult } from '@/types';

/**
 * Searches assets using pgvector cosine similarity.
 */
export async function searchAssets(
  query: string,
  limit = 10,
  filters?: {
    content_type?: string;
    campaign_name?: string;
  }
): Promise<SearchResult[]> {
  const supabase = await createClient();

  let embedding: number[];
  try {
    embedding = await generateEmbedding(query);
  } catch (err) {
    console.error('Embedding generation failed:', err);
    return [];
  }

  const { data, error } = await supabase.rpc('search_assets', {
    query_embedding: embedding,
    match_count: limit,
    filter: filters ?? {},
  });

  if (error) {
    console.error('Search RPC error:', error);
    return [];
  }

  // Filter out low-relevance results — anything below 0.50 is noise,
  // especially image assets whose embeddings are filename-only.
  const MIN_SIMILARITY = 0.50;
  return ((data as SearchResult[]) ?? []).filter(r => r.similarity >= MIN_SIMILARITY);
}

/**
 * Searches insights using pgvector cosine similarity.
 */
export async function searchInsights(
  query: string,
  limit = 5
): Promise<Array<{ id: string; title: string; similarity: number; excerpt: string }>> {
  const supabase = await createClient();

  let embedding: number[];
  try {
    embedding = await generateEmbedding(query);
  } catch (err) {
    console.error('Insight embedding failed:', err);
    return [];
  }

  const { data, error } = await supabase.rpc('search_insights', {
    query_embedding: embedding,
    match_count: limit,
  });

  if (error) {
    console.error('Insights search error:', error);
    return [];
  }

  return data ?? [];
}

/**
 * Retrieves top-k asset chunks for RAG (Q&A interface).
 * For image/video assets with no extracted_text, falls back to the
 * AI-generated description + key_topics so the LLM has real context.
 */
export async function retrieveContextChunks(
  query: string,
  topK = 5
): Promise<{ chunks: string[]; assetIds: string[]; hasGoodMatch: boolean }> {
  const results = await searchAssets(query, topK);

  if (!results.length) {
    return { chunks: [], assetIds: [], hasGoodMatch: false };
  }

  const hasGoodMatch = results[0].similarity > 0.75;

  const chunks = results.map((r) => {
    // Prefer extracted text (PDFs/docs); fall back to AI-generated metadata for images/videos
    const tags = r.tags ?? {};
    const aiDescription = tags.description as string ?? '';
    const keyTopics = (tags.key_topics as string[] ?? []).join(', ');
    const audiencePersona = tags.audience_persona as string ?? '';
    const productFocus = (tags.product_focus as string[] ?? []).join(', ');

    let context = r.excerpt ?? '';
    if (!context && aiDescription) {
      context = aiDescription;
    }
    if (!context) {
      // Last resort — build from structured tags
      const parts = [
        keyTopics && `Topics: ${keyTopics}`,
        productFocus && `Products: ${productFocus}`,
        audiencePersona && `Audience: ${audiencePersona}`,
      ].filter(Boolean);
      context = parts.join(' | ') || '(no preview available)';
    }

    return `Asset: "${r.name}" (${r.content_type ?? 'unknown'}, similarity: ${Math.round(r.similarity * 100)}%)\n${context}`;
  });

  return { chunks, assetIds: results.map((r) => r.id), hasGoodMatch };
}
