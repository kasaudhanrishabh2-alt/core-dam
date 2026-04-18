// ============================================================
// CORE DAM — Shared TypeScript Types
// ============================================================

export type UserRole =
  | 'admin'
  | 'marketing_manager'
  | 'content_creator'
  | 'sales_rep'
  | 'viewer';

export type ContentType =
  | 'case_study'
  | 'whitepaper'
  | 'one_pager'
  | 'presentation'
  | 'video'
  | 'email_template'
  | 'battlecard'
  | 'infographic'
  | 'proposal_template'
  | 'roi_calculator'
  | 'competitive_intel'
  | 'campaign_report'
  | 'other';

export type CreativeType =
  | 'whatsapp_message'
  | 'meta_ad'
  | 'google_ad'
  | 'brochure'
  | 'email_newsletter'
  | 'social_post'
  | 'banner_ad'
  | 'video_ad'
  | 'landing_page'
  | 'print_ad'
  | 'outdoor_ad'
  | 'other';

export const CREATIVE_TYPE_LABELS: Record<CreativeType, string> = {
  whatsapp_message: 'WhatsApp Message',
  meta_ad: 'Meta Ad',
  google_ad: 'Google Ad',
  brochure: 'Brochure',
  email_newsletter: 'Email Newsletter',
  social_post: 'Social Media Post',
  banner_ad: 'Banner Ad',
  video_ad: 'Video Ad',
  landing_page: 'Landing Page',
  print_ad: 'Print Ad',
  outdoor_ad: 'Outdoor / OOH Ad',
  other: 'Other',
};

export type AssetStatus = 'draft' | 'active' | 'archived' | 'expired';

export type DealStage =
  | 'awareness'
  | 'consideration'
  | 'decision'
  | 'post_sale';

export type InsightType =
  | 'campaign_summary'
  | 'win_story'
  | 'loss_analysis'
  | 'competitive_intel'
  | 'content_learning'
  | 'market_insight';

export type EventType =
  | 'opened'
  | 'page_viewed'
  | 'downloaded'
  | 'forwarded'
  | 'email_gated';

export type DealOutcome = 'open' | 'won' | 'lost' | 'unknown';

// ── Profile ─────────────────────────────────────────────────
export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  avatar_url: string | null;
  salesforce_access_token: string | null;
  salesforce_refresh_token: string | null;
  salesforce_instance_url: string | null;
  created_at: string;
}

// ── Asset ────────────────────────────────────────────────────
export interface Asset {
  id: string;
  name: string;
  description: string | null;
  file_url: string;
  file_type: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  extracted_text: string | null;
  tags: AssetTags;
  metadata: AssetMetadata;
  content_type: ContentType | null;
  deal_stage_relevance: DealStage[] | null;
  industry_tags: string[] | null;
  campaign_name: string | null;
  version: number;
  parent_asset_id: string | null;
  is_latest_version: boolean;
  uploaded_by: string | null;
  approved_by: string | null;
  status: AssetStatus;
  expires_at: string | null;
  view_count: number;
  share_count: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  uploader?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>;
}

export interface AssetMetadata {
  project_name?: string | null;
  launch_name?: string | null;
  creative_type?: CreativeType | null;
  comments?: string | null;
  [key: string]: unknown;
}

export interface AssetTags {
  key_topics?: string[];
  product_focus?: string[];
  audience_persona?: string;
  tone?: string;
  confidence_score?: number;
  title_suggestion?: string;
  [key: string]: unknown;
}

// ── AI Creative Analysis ─────────────────────────────────────
export interface AssetAnalysis {
  narrative_arc: {
    hook: string | null;
    problem: string | null;
    solution: string | null;
    proof: string | null;
    cta: string | null;
  };
  key_claims: string[];
  proof_points: string[];
  value_propositions: string[];
  scores: {
    clarity: number;
    persuasiveness: number;
    specificity: number;
    cta_strength: number;
  };
  strengths: string[];
  weaknesses: string[];
  missing_elements: string[];
  ideal_use_case: string;
  competing_narratives: string | null;
  analyzed_at: string;
}

// ── Auto-tag result from Claude ──────────────────────────────
export interface AutoTagResult {
  content_type: ContentType;
  title_suggestion: string;
  description: string;
  campaign_name: string | null;
  industry_tags: string[];
  product_focus: string[];
  deal_stage_relevance: DealStage[];
  key_topics: string[];
  audience_persona: string;
  tone: string;
  confidence_score: number;
}

// ── Share Link ───────────────────────────────────────────────
export interface ShareLink {
  id: string;
  short_code: string;
  asset_id: string;
  created_by: string | null;
  salesforce_opportunity_id: string | null;
  salesforce_opportunity_name: string | null;
  salesforce_account_id: string | null;
  salesforce_account_name: string | null;
  sf_deal_stage: string | null;
  sf_deal_amount: number | null;
  recipient_email: string | null;
  recipient_name: string | null;
  recipient_company: string | null;
  expires_at: string | null;
  password_hash: string | null;
  require_email_gate: boolean;
  is_active: boolean;
  total_opens: number;
  total_time_seconds: number;
  engagement_score: number;
  created_at: string;
  // Joined
  asset?: Pick<Asset, 'id' | 'name' | 'content_type' | 'file_url' | 'file_type'>;
}

// ── Link Event ───────────────────────────────────────────────
export interface LinkEvent {
  id: string;
  link_id: string;
  event_type: EventType;
  page_number: number | null;
  session_id: string | null;
  duration_seconds: number | null;
  ip_country: string | null;
  ip_city: string | null;
  device_type: string | null;
  browser: string | null;
  referer: string | null;
  created_at: string;
}

// ── Insight ──────────────────────────────────────────────────
export interface Insight {
  id: string;
  title: string;
  insight_type: InsightType;
  content: string;
  tags: Record<string, unknown>;
  related_asset_ids: string[] | null;
  related_campaign: string | null;
  author_id: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  author?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>;
}

// ── Salesforce Attribution ───────────────────────────────────
export interface SfAttribution {
  id: string;
  asset_id: string | null;
  link_id: string | null;
  sf_opportunity_id: string;
  sf_opportunity_name: string | null;
  sf_account_id: string | null;
  sf_account_name: string | null;
  sf_industry: string | null;
  sf_stage_at_share: string | null;
  sf_amount: number | null;
  deal_outcome: DealOutcome;
  engagement_score: number;
  times_opened: number;
  total_time_seconds: number;
  sf_activity_id: string | null;
  synced_to_sf: boolean;
  synced_at: string | null;
  created_at: string;
}

// ── AI Query Log ─────────────────────────────────────────────
export interface AiQuery {
  id: string;
  query_text: string;
  response_text: string | null;
  matched_asset_ids: string[] | null;
  had_good_match: boolean | null;
  user_id: string | null;
  created_at: string;
}

// ── Salesforce API types ─────────────────────────────────────
export interface SalesforceOpportunity {
  Id: string;
  Name: string;
  StageName: string;
  Amount: number | null;
  CloseDate: string;
  Account: { Name: string } | null;
}

export interface SalesforceQueryResult<T> {
  totalSize: number;
  done: boolean;
  records: T[];
}

// ── Search result from pgvector ──────────────────────────────
export interface SearchResult {
  id: string;
  name: string;
  content_type: ContentType | null;
  similarity: number;
  excerpt: string | null;
  tags: AssetTags;
  file_url: string;
  file_type: string;
}

// ── Analytics ────────────────────────────────────────────────
export interface AnalyticsOverview {
  total_assets: number;
  active_links: number;
  total_opens: number;
  avg_engagement_seconds: number;
  attributed_revenue: number;
}

export interface AssetPerformance {
  asset_id: string;
  asset_name: string;
  content_type: ContentType | null;
  opens: number;
  avg_time_seconds: number;
  share_count: number;
}

export interface ContentGap {
  query_text: string;
  count: number;
  created_at: string;
}

// ── API Response wrapper ─────────────────────────────────────
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

// ── Upload ───────────────────────────────────────────────────
export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  url: string;
  storagePath: string;
}
