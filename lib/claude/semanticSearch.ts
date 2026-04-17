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

  return (data as SearchResult[]) ?? [];
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

  const chunks = results.map(
    (r) =>
      `Asset: "${r.name}" (${r.content_type ?? 'unknown'})\n${r.excerpt ?? '(no preview)'}`
  );

  return { chunks, assetIds: results.map((r) => r.id), hasGoodMatch };
}
