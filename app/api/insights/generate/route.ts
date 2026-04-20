import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getUserRole } from '@/lib/supabase/getRole';
import { generateText } from '@/lib/ai/provider';

export const maxDuration = 60;

function getService() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/insights/generate
 * Analyses the real asset library and generates AI insights grouped by project.
 * Replaces test data with observations derived from actual uploaded assets.
 */
export async function POST(_request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const role = await getUserRole(user.id);
  if (!role || !['admin', 'marketing_manager'].includes(role)) {
    return Response.json({ error: 'Admin or Marketing Manager access required' }, { status: 403 });
  }

  const service = getService();

  // Fetch all active assets with metadata + analysis
  const { data: assets, error } = await service
    .from('assets')
    .select('id, name, content_type, metadata, tags, campaign_name, created_at, view_count, share_count')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!assets || assets.length === 0) {
    return Response.json({ error: 'No assets found. Upload real assets before generating insights.' }, { status: 400 });
  }

  // Group assets by project
  const byProject = new Map<string, typeof assets>();
  for (const a of assets) {
    const project = (a.metadata as { project_name?: string })?.project_name ?? 'Untagged';
    if (!byProject.has(project)) byProject.set(project, []);
    byProject.get(project)!.push(a);
  }

  // Build a structured summary for the AI prompt
  const projectSummaries = Array.from(byProject.entries()).map(([project, projAssets]) => {
    const formats = projAssets
      .map((a) => (a.metadata as { creative_type?: string })?.creative_type ?? a.content_type ?? 'other')
      .reduce((acc: Record<string, number>, f: string) => { acc[f] = (acc[f] ?? 0) + 1; return acc; }, {});

    const topByViews = [...projAssets].sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0)).slice(0, 3);

    return `Project: ${project}
Assets: ${projAssets.length}
Formats: ${Object.entries(formats).map(([f, c]) => `${f}(${c})`).join(', ')}
Most viewed: ${topByViews.map(a => `"${a.name}" (${a.view_count} views)`).join('; ')}
Recent uploads: ${projAssets.slice(0, 5).map(a => `"${a.name}"`).join(', ')}`;
  }).join('\n\n');

  const prompt = `You are a marketing intelligence analyst for HOABL (House of Abhinandan Lodha), a premium real estate company in India that sells branded plotted development projects like One Goa, One Nagpur, One Alibaug etc. Each project has multiple launch phases.

Analyse the following real marketing asset library data and generate 4–6 actionable insights. Focus on:
1. Content coverage gaps per project (what formats or stages are missing)
2. Observed content strengths (what's well-represented)
3. Recommendations for upcoming launches based on what's available
4. Creative format distribution analysis

Asset Library Data:
${projectSummaries}

Total assets: ${assets.length}
Projects represented: ${Array.from(byProject.keys()).join(', ')}

Generate insights as a JSON array. Each insight must have:
- title: concise heading (max 10 words)
- insight_type: one of campaign_summary | win_story | loss_analysis | competitive_intel | content_learning | market_insight
- content: 2–4 sentences of specific, actionable observations (reference actual project names and asset counts)
- related_campaign: project name if project-specific, or null

Return ONLY valid JSON, no markdown, no explanation.`;

  let rawResponse = '';
  try {
    rawResponse = await generateText(prompt);
  } catch (err) {
    return Response.json({ error: `AI generation failed: ${err instanceof Error ? err.message : 'Unknown error'}` }, { status: 500 });
  }

  // Parse AI response
  let generatedInsights: Array<{ title: string; insight_type: string; content: string; related_campaign: string | null }> = [];
  try {
    const jsonMatch = rawResponse.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      generatedInsights = JSON.parse(jsonMatch[0]);
    }
  } catch {
    return Response.json({ error: 'AI returned invalid JSON. Try again.' }, { status: 500 });
  }

  if (!generatedInsights.length) {
    return Response.json({ error: 'AI generated no insights. Ensure assets are uploaded with project names.' }, { status: 400 });
  }

  // Delete previous AI-generated insights (keep manually created ones)
  await service.from('insights').delete().eq('author_id', user.id);

  // Save new insights
  const toInsert = generatedInsights.slice(0, 8).map(ins => ({
    title: ins.title,
    insight_type: ins.insight_type,
    content: ins.content,
    related_campaign: ins.related_campaign ?? null,
    related_asset_ids: null,
    tags: { ai_generated: true, generated_at: new Date().toISOString() },
    author_id: user.id,
    is_published: true,
  }));

  const { data: saved, error: saveError } = await service
    .from('insights')
    .insert(toInsert)
    .select();

  if (saveError) return Response.json({ error: saveError.message }, { status: 500 });

  return Response.json({ insights: saved, generated_count: saved?.length ?? 0 });
}
