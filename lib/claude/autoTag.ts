/**
 * CORE DAM — AI Auto-Tagging & Q&A
 *
 * Uses: Google Gemini 1.5 Flash (free tier)
 * To upgrade: swap generateText/streamText in lib/ai/provider.ts
 */

import { generateText, generateTextWithVision, analyzeYoutubeVideo, streamText } from '@/lib/ai/provider';
import type { AutoTagResult, AssetAnalysis } from '@/types';

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

  const prompt = `You are a marketing content analyst for HOABL (House of Abhinandan Lodha), a premium real estate company in India. HOABL sells branded plotted developments — projects like One Goa, One Nagpur, One Alibaug, One Bengaluru, One Ayodhya. Each project has multiple launch phases. Their marketing assets include brochures, WhatsApp creatives, Meta ads, site visit documents, payment plan PDFs, location maps, videos, and email campaigns.

Analyze this document and return ONLY valid JSON with no markdown, no code fences, no extra text — just the raw JSON object.

Document name: ${fileName}
${contentSection}

Return this exact JSON shape:
{
  "content_type": "one of: case_study|whitepaper|one_pager|presentation|email_template|battlecard|infographic|proposal_template|roi_calculator|competitive_intel|campaign_report|other",
  "title_suggestion": "clean title for this asset (include project name if detectable)",
  "description": "2-3 sentence description of what this asset is, which HOABL project it relates to, and who the target audience is",
  "campaign_name": "HOABL project or campaign name if detectable (e.g. One Goa Phase 2), else null",
  "industry_tags": ["real_estate", "and any other relevant tags like premium_plots|gated_community|holiday_homes"],
  "product_focus": ["project names or product types featured, e.g. One Goa|plotted_development|villa"],
  "deal_stage_relevance": ["one or more of: awareness|consideration|decision|post_sale"],
  "key_topics": ["5-10 key topic tags relevant to real estate marketing"],
  "audience_persona": "who this is targeted at — e.g. HNI investors, NRI buyers, weekend home seekers",
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
  const prompt = `You are a marketing intelligence assistant for HOABL (House of Abhinandan Lodha), India's premium branded land developer. HOABL projects include One Goa, One Nagpur, One Alibaug, One Bengaluru, One Ayodhya, and others.

Answer the user's question using ONLY the content from the library excerpts provided. If the answer is not in the library, say so clearly and suggest what content might be missing.

USER QUESTION: ${query}

LIBRARY EXCERPTS:
${contextChunks.map((chunk, i) => `[Source ${i + 1}]: ${chunk}`).join('\n\n')}

Instructions:
- Answer directly and specifically, using HOABL terminology (project names, launch phases, etc.)
- Cite sources using [Source N] notation
- If no sources are relevant, say "I couldn't find this in your content library" and suggest what HOABL asset should be created
- Keep response under 400 words`;

  return streamText(prompt);
}

/**
 * Performs deep creative analysis on an asset — narrative arc, scores,
 * strengths/weaknesses, proof points, and ideal use case.
 */
export async function analyzeAssetCreative(
  extractedText: string,
  fileName: string,
  contentType: string | null
): Promise<AssetAnalysis> {
  const contentSection = extractedText?.trim()
    ? `CONTENT (first 5000 chars):\n${extractedText.substring(0, 5000)}`
    : `Note: Binary or image file — infer from file name and content type only.`;

  const prompt = `You are an expert marketing creative analyst. Perform a deep analysis of this asset and return ONLY valid JSON — no markdown, no code fences.

Asset Name: ${fileName}
Content Type: ${contentType ?? 'unknown'}
${contentSection}

Return exactly this JSON shape:
{
  "narrative_arc": {
    "hook": "opening hook or attention-grabber (1 sentence, or null)",
    "problem": "pain point addressed (1-2 sentences, or null)",
    "solution": "how product/service solves it (1-2 sentences, or null)",
    "proof": "evidence, stats, social proof used (1-2 sentences, or null)",
    "cta": "call-to-action exact text or description (or null)"
  },
  "key_claims": ["specific claims e.g. '40% cost reduction', 'fastest in class'"],
  "proof_points": ["specific evidence: stats, customer names, awards, certifications"],
  "value_propositions": ["core value props the reader should take away"],
  "scores": {
    "clarity": 7,
    "persuasiveness": 6,
    "specificity": 8,
    "cta_strength": 5
  },
  "strengths": ["2-4 specific strengths of this creative"],
  "weaknesses": ["2-4 specific weaknesses or gaps"],
  "missing_elements": ["elements typical for this content type that are absent"],
  "ideal_use_case": "1-2 sentences on when and how to best deploy this asset",
  "competing_narratives": "alternative angle that could make this stronger, or null"
}

Scores are integers 0-10. Be specific and critical — vague feedback is not useful.`;

  const raw = await generateText(prompt);
  const cleaned = raw.replace(/```(?:json)?\n?/g, '').trim();
  const parsed = JSON.parse(cleaned);
  return { ...parsed, analyzed_at: new Date().toISOString() } as AssetAnalysis;
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

// ─── Vision-based analysis (images & videos) ──────────────────────────────

const VISION_TAG_PROMPT = (fileName: string) =>
  `You are a marketing content analyst for HOABL (House of Abhinandan Lodha), a premium real estate company in India. HOABL sells branded plotted developments — projects like One Goa, One Nagpur, One Alibaug, One Bengaluru, One Ayodhya. Their marketing assets include brochures, WhatsApp creatives, Meta ads, site visit documents, payment plan PDFs, location maps, and videos.

Carefully analyse this image/video and return ONLY valid JSON with no markdown, no code fences.

File name: ${fileName}

Return exactly this JSON shape:
{
  "content_type": "one of: case_study|whitepaper|one_pager|presentation|email_template|battlecard|infographic|proposal_template|roi_calculator|competitive_intel|campaign_report|other",
  "title_suggestion": "descriptive title for this creative (include project name if visible)",
  "description": "2-3 sentence description of what this creative shows, which HOABL project it relates to, and the marketing objective",
  "campaign_name": "HOABL project or campaign name if visible (e.g. One Goa Phase 2), else null",
  "industry_tags": ["real_estate", "and any relevant tags like premium_plots|gated_community|holiday_homes"],
  "product_focus": ["project names or product types visible, e.g. One Goa|plotted_development"],
  "deal_stage_relevance": ["one or more of: awareness|consideration|decision|post_sale"],
  "key_topics": ["5-10 key topic tags based on what you can see"],
  "audience_persona": "who this is targeted at — e.g. HNI investors, NRI buyers, weekend home seekers",
  "tone": "one of: formal|casual|technical|executive|educational",
  "confidence_score": 0.0
}`;

/**
 * Auto-tags an image or video asset using Gemini 1.5 Flash vision.
 * @param fileBase64 - Base64-encoded file contents (no data-URI prefix)
 * @param mimeType   - MIME type, e.g. "image/jpeg"
 * @param fileName   - Original file name for context
 */
export async function autoTagAssetWithVision(
  fileBase64: string,
  mimeType: string,
  fileName: string
): Promise<AutoTagResult> {
  const raw = await generateTextWithVision(VISION_TAG_PROMPT(fileName), fileBase64, mimeType);
  const cleaned = raw.replace(/```(?:json)?\n?/g, '').trim();
  return JSON.parse(cleaned) as AutoTagResult;
}

// ─── YouTube video analysis ──────────────────────────────────────────────────

const YOUTUBE_TAG_PROMPT = (videoTitle: string) =>
  `You are a marketing content analyst for HOABL (House of Abhinandan Lodha), a premium real estate company in India. HOABL sells branded plotted developments — One Goa, One Nagpur, One Alibaug, One Bengaluru, One Ayodhya and more.

Watch this YouTube video and return ONLY valid JSON with no markdown, no code fences.

Video title context: "${videoTitle}"

Return exactly this JSON shape:
{
  "content_type": "one of: case_study|whitepaper|one_pager|presentation|email_template|battlecard|infographic|proposal_template|roi_calculator|competitive_intel|campaign_report|other",
  "title_suggestion": "descriptive title for this video (include project name if visible)",
  "description": "2-3 sentence description of what this video shows, which HOABL project it relates to, and the marketing objective",
  "campaign_name": "HOABL project or campaign name if visible (e.g. One Goa Phase 2), else null",
  "industry_tags": ["real_estate", "and any relevant tags like premium_plots|gated_community|holiday_homes|launch_film"],
  "product_focus": ["project names or product types visible, e.g. One Goa|plotted_development"],
  "deal_stage_relevance": ["one or more of: awareness|consideration|decision|post_sale"],
  "key_topics": ["5-10 key topic tags based on the video content"],
  "audience_persona": "who this is targeted at — e.g. HNI investors, NRI buyers, weekend home seekers",
  "tone": "one of: formal|casual|technical|executive|educational",
  "confidence_score": 0.0
}`;

/**
 * Auto-tags a YouTube video asset using Gemini's native YouTube URL support.
 * Gemini 1.5+ accepts YouTube URLs directly — no download required.
 * Cost: ~₹0.65 per 5-min video at current Gemini Flash pricing.
 */
export async function autoTagYoutubeAsset(
  youtubeUrl: string,
  videoTitle: string
): Promise<AutoTagResult> {
  const raw = await analyzeYoutubeVideo(youtubeUrl, YOUTUBE_TAG_PROMPT(videoTitle));
  const cleaned = raw.replace(/```(?:json)?\n?/g, '').trim();
  return JSON.parse(cleaned) as AutoTagResult;
}

/**
 * Performs deep creative analysis on a YouTube video using Gemini's native URL support.
 */
export async function analyzeYoutubeAssetCreative(
  youtubeUrl: string,
  videoTitle: string,
  contentType: string | null
): Promise<AssetAnalysis> {
  const prompt = `You are an expert marketing creative analyst specialising in real estate video content. Watch this YouTube video and perform a deep creative analysis. Return ONLY valid JSON — no markdown, no code fences.

Video Title: "${videoTitle}"
Content Type: ${contentType ?? 'video'}

Return exactly this JSON shape:
{
  "narrative_arc": {
    "hook": "opening scene / attention-grabber (1 sentence, or null)",
    "problem": "pain point or desire addressed in the video (1-2 sentences, or null)",
    "solution": "how the HOABL project/product is presented as the solution (1-2 sentences, or null)",
    "proof": "evidence shown — location shots, amenity walkthroughs, testimonials, pricing (1-2 sentences, or null)",
    "cta": "call-to-action shown at end of video, or null"
  },
  "key_claims": ["specific claims visible, e.g. price points, location benefits, RERA numbers, amenities"],
  "proof_points": ["specific evidence: location footage, award badges, testimonials, lifestyle shots"],
  "value_propositions": ["core value props the viewer would take away"],
  "scores": {
    "clarity": 7,
    "persuasiveness": 6,
    "specificity": 8,
    "cta_strength": 5
  },
  "strengths": ["2-4 specific visual/messaging strengths"],
  "weaknesses": ["2-4 specific weaknesses or gaps"],
  "missing_elements": ["elements typical for real estate launch videos that are absent"],
  "ideal_use_case": "1-2 sentences on the best channel (YouTube Ads, WhatsApp, site visit follow-up etc.) and buyer journey stage",
  "competing_narratives": "alternative creative angle that could make this stronger, or null"
}

Scores are integers 0-10. Be specific — describe what you actually see in the video.`;

  const raw = await analyzeYoutubeVideo(youtubeUrl, prompt);
  const cleaned = raw.replace(/```(?:json)?\n?/g, '').trim();
  const parsed = JSON.parse(cleaned);
  return { ...parsed, analyzed_at: new Date().toISOString() } as AssetAnalysis;
}

/**
 * Performs deep creative analysis on an image/video asset using Gemini vision.
 */
export async function analyzeAssetCreativeWithVision(
  fileBase64: string,
  mimeType: string,
  fileName: string,
  contentType: string | null
): Promise<AssetAnalysis> {
  const prompt = `You are an expert marketing creative analyst. Carefully examine this image/video and perform a deep analysis. Return ONLY valid JSON — no markdown, no code fences.

Asset Name: ${fileName}
Content Type: ${contentType ?? 'unknown'}

Return exactly this JSON shape:
{
  "narrative_arc": {
    "hook": "opening hook or main attention-grabber visible in the creative (1 sentence, or null)",
    "problem": "pain point addressed, if any (1-2 sentences, or null)",
    "solution": "how the product/project solves it, if shown (1-2 sentences, or null)",
    "proof": "evidence, stats, social proof, or landmarks visible (1-2 sentences, or null)",
    "cta": "call-to-action text or button visible in the creative, or null"
  },
  "key_claims": ["specific claims visible, e.g. price points, location benefits, amenities"],
  "proof_points": ["specific evidence visible: location, amenity shots, award badges, testimonials"],
  "value_propositions": ["core value props the viewer would take away from this creative"],
  "scores": {
    "clarity": 7,
    "persuasiveness": 6,
    "specificity": 8,
    "cta_strength": 5
  },
  "strengths": ["2-4 specific visual/messaging strengths of this creative"],
  "weaknesses": ["2-4 specific weaknesses or gaps"],
  "missing_elements": ["elements typical for this content type that are absent"],
  "ideal_use_case": "1-2 sentences on the best channel and moment to deploy this creative",
  "competing_narratives": "alternative creative angle that could make this stronger, or null"
}

Scores are integers 0-10. Be specific — describe what you actually see.`;

  const raw = await generateTextWithVision(prompt, fileBase64, mimeType);
  const cleaned = raw.replace(/```(?:json)?\n?/g, '').trim();
  const parsed = JSON.parse(cleaned);
  return { ...parsed, analyzed_at: new Date().toISOString() } as AssetAnalysis;
}
