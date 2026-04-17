/**
 * CORE DAM — AI Auto-Tagging & Q&A
 *
 * Uses: Google Gemini 1.5 Flash (free tier)
 * To upgrade: swap generateText/streamText in lib/ai/provider.ts
 */

import { generateText, streamText } from '@/lib/ai/provider';
import type { AutoTagResult } from '@/types';

/**
 * Auto-tags an uploaded asset using AI.
 * Returns structured metadata for the asset record.
 */
export async function autoTagAsset(
  extractedText: string,
  fileName: string
): Promise<AutoTagResult> {
  const contentSection = extractedText?.trim()
    ? `Document content (first 3000 chars): ${extractedText.substring(0, 3000)}`
    : `Note: This is an image or binary file with no extractable text. Infer tags from the file name only.`;

  const prompt = `You are a marketing content analyst. Analyze this document and return ONLY valid JSON with no markdown, no code fences, no extra text — just the raw JSON object.

Document name: ${fileName}
${contentSection}

Return this exact JSON shape:
{
  "content_type": "one of: case_study|whitepaper|one_pager|presentation|email_template|battlecard|infographic|proposal_template|roi_calculator|competitive_intel|campaign_report|other",
  "title_suggestion": "clean title for this asset",
  "description": "2-3 sentence description of what this asset is and who it is for",
  "campaign_name": "campaign name if detectable, else null",
  "industry_tags": ["array","of","industry","verticals","mentioned"],
  "product_focus": ["products or services featured"],
  "deal_stage_relevance": ["one or more of: awareness|consideration|decision|post_sale"],
  "key_topics": ["5-10 key topic tags"],
  "audience_persona": "who this is written for",
  "tone": "one of: formal|casual|technical|executive|educational",
  "confidence_score": 0.0
}`;

  const raw = await generateText(prompt);
  // Strip any accidental markdown fences
  const cleaned = raw.replace(/```(?:json)?\n?/g, '').trim();
  return JSON.parse(cleaned) as AutoTagResult;
}

/**
 * Streams an AI answer grounded in the user's content library.
 * Returns a Web ReadableStream of text chunks.
 */
export async function answerFromLibrary(
  query: string,
  contextChunks: string[]
): Promise<ReadableStream<Uint8Array>> {
  const prompt = `You are a marketing intelligence assistant. Answer the user's question using ONLY the content from the library excerpts provided. If the answer is not in the library, say so clearly and suggest what content might be missing.

USER QUESTION: ${query}

LIBRARY EXCERPTS:
${contextChunks.map((chunk, i) => `[Source ${i + 1}]: ${chunk}`).join('\n\n')}

Instructions:
- Answer directly and specifically
- Cite sources using [Source N] notation
- If no sources are relevant, say "I couldn't find this in your content library" and suggest creating that content
- Keep response under 400 words`;

  return streamText(prompt);
}

/**
 * Generates an HTML weekly digest email from analytics data.
 */
export async function generateWeeklyDigest(
  analyticsData: Record<string, unknown>
): Promise<string> {
  const prompt = `You are a marketing analytics expert. Generate a weekly digest email based on this data. Write in a clear, executive-friendly tone.

Analytics Data: ${JSON.stringify(analyticsData, null, 2)}

Generate:
1. KEY WINS THIS WEEK (what performed best)
2. INSIGHTS (patterns you notice in the data)
3. RECOMMENDATIONS (3 specific actions to take)
4. CONTENT GAPS (what is missing based on query logs)

Format as clean HTML email content (no full HTML document, just the body content).`;

  return generateText(prompt);
}

/**
 * Generates an AI campaign summary from related assets and insights.
 */
export async function summarizeCampaign(
  campaignName: string,
  assetSummaries: string[],
  insightContents: string[]
): Promise<string> {
  const prompt = `You are a marketing strategist. Summarize the following campaign based on related assets and insights.

Campaign: ${campaignName}

Assets Used:
${assetSummaries.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Insights Recorded:
${insightContents.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Write a concise executive summary covering:
- Campaign objectives (inferred)
- Key collateral used
- What worked (from win stories and learnings)
- What to improve next time
- Recommended follow-up actions

Keep it under 500 words. Use clear headings.`;

  return generateText(prompt);
}
