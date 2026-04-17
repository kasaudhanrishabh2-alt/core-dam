-- ============================================================
-- CORE DAM — Supabase Database Schema
-- Run this in Supabase SQL Editor in order
-- ============================================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ── Profiles ─────────────────────────────────────────────────
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('admin','marketing_manager','content_creator','sales_rep','viewer')),
  avatar_url TEXT,
  salesforce_access_token TEXT,
  salesforce_refresh_token TEXT,
  salesforce_instance_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on user sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── Assets ───────────────────────────────────────────────────
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type TEXT,
  extracted_text TEXT,
  embedding VECTOR(768),
  tags JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  content_type TEXT CHECK (content_type IN (
    'case_study','whitepaper','one_pager','presentation','video',
    'email_template','battlecard','infographic','proposal_template',
    'roi_calculator','competitive_intel','campaign_report','other'
  )),
  deal_stage_relevance TEXT[],
  industry_tags TEXT[],
  campaign_name TEXT,
  version INTEGER DEFAULT 1,
  parent_asset_id UUID REFERENCES assets(id),
  is_latest_version BOOLEAN DEFAULT TRUE,
  uploaded_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('draft','active','archived','expired')),
  expires_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- IVFFlat index for cosine similarity search
CREATE INDEX ON assets USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- ── Share Links ──────────────────────────────────────────────
CREATE TABLE share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code TEXT UNIQUE NOT NULL,
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),
  salesforce_opportunity_id TEXT,
  salesforce_opportunity_name TEXT,
  salesforce_account_id TEXT,
  salesforce_account_name TEXT,
  sf_deal_stage TEXT,
  sf_deal_amount DECIMAL,
  recipient_email TEXT,
  recipient_name TEXT,
  recipient_company TEXT,
  expires_at TIMESTAMPTZ,
  password_hash TEXT,
  require_email_gate BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  total_opens INTEGER DEFAULT 0,
  total_time_seconds INTEGER DEFAULT 0,
  engagement_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Link Events ──────────────────────────────────────────────
CREATE TABLE link_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID REFERENCES share_links(id) ON DELETE CASCADE,
  event_type TEXT CHECK (event_type IN ('opened','page_viewed','downloaded','forwarded','email_gated')),
  page_number INTEGER,
  session_id TEXT,
  duration_seconds INTEGER,
  ip_country TEXT,
  ip_city TEXT,
  device_type TEXT,
  browser TEXT,
  referer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Insights ─────────────────────────────────────────────────
CREATE TABLE insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  insight_type TEXT CHECK (insight_type IN (
    'campaign_summary','win_story','loss_analysis',
    'competitive_intel','content_learning','market_insight'
  )),
  content TEXT NOT NULL,
  embedding VECTOR(768),
  tags JSONB DEFAULT '{}',
  related_asset_ids UUID[],
  related_campaign TEXT,
  author_id UUID REFERENCES profiles(id),
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON insights USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

CREATE TRIGGER insights_updated_at
  BEFORE UPDATE ON insights
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- ── SF Attribution ───────────────────────────────────────────
CREATE TABLE sf_attribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES assets(id),
  link_id UUID REFERENCES share_links(id),
  sf_opportunity_id TEXT NOT NULL,
  sf_opportunity_name TEXT,
  sf_account_id TEXT,
  sf_account_name TEXT,
  sf_industry TEXT,
  sf_stage_at_share TEXT,
  sf_amount DECIMAL,
  deal_outcome TEXT CHECK (deal_outcome IN ('open','won','lost','unknown')) DEFAULT 'unknown',
  engagement_score INTEGER DEFAULT 0,
  times_opened INTEGER DEFAULT 0,
  total_time_seconds INTEGER DEFAULT 0,
  sf_activity_id TEXT,
  synced_to_sf BOOLEAN DEFAULT FALSE,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── AI Queries ───────────────────────────────────────────────
CREATE TABLE ai_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_text TEXT NOT NULL,
  query_embedding VECTOR(768),
  response_text TEXT,
  matched_asset_ids UUID[],
  had_good_match BOOLEAN,
  user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Row Level Security ───────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE sf_attribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_queries ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own profile; admins can read all
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Assets: all authenticated users can read active assets
CREATE POLICY "Read active assets" ON assets
  FOR SELECT USING (auth.uid() IS NOT NULL AND status = 'active');

CREATE POLICY "Read own draft assets" ON assets
  FOR SELECT USING (auth.uid() = uploaded_by);

CREATE POLICY "Upload assets" ON assets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin','marketing_manager','content_creator')
    )
  );

CREATE POLICY "Update own assets" ON assets
  FOR UPDATE USING (
    auth.uid() = uploaded_by OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','marketing_manager'))
  );

CREATE POLICY "Delete assets" ON assets
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin','marketing_manager')
    )
  );

-- Share links
CREATE POLICY "View own share links" ON share_links
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Create share links" ON share_links
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Update own share links" ON share_links
  FOR UPDATE USING (auth.uid() = created_by);

-- Link events: public writes (for tracking), authenticated reads
CREATE POLICY "Insert link events" ON link_events
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Read link events" ON link_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM share_links
      WHERE share_links.id = link_events.link_id
      AND share_links.created_by = auth.uid()
    )
  );

-- Insights
CREATE POLICY "Read published insights" ON insights
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_published = TRUE);

CREATE POLICY "Create insights" ON insights
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin','marketing_manager','content_creator')
    )
  );

CREATE POLICY "Update own insights" ON insights
  FOR UPDATE USING (auth.uid() = author_id);

-- Attribution
CREATE POLICY "View attribution" ON sf_attribution
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Create attribution" ON sf_attribution
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- AI Queries
CREATE POLICY "Log AI queries" ON ai_queries
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "View own AI queries" ON ai_queries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin view all AI queries" ON ai_queries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','marketing_manager'))
  );

-- ── pgvector Search Functions ────────────────────────────────

CREATE OR REPLACE FUNCTION search_assets(
  query_embedding VECTOR(768),
  match_count INT DEFAULT 10,
  filter JSONB DEFAULT '{}'
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  content_type TEXT,
  similarity FLOAT,
  excerpt TEXT,
  tags JSONB,
  file_url TEXT,
  file_type TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.name,
    a.content_type,
    1 - (a.embedding <=> query_embedding) AS similarity,
    LEFT(a.extracted_text, 300) AS excerpt,
    a.tags,
    a.file_url,
    a.file_type
  FROM assets a
  WHERE
    a.status = 'active'
    AND a.embedding IS NOT NULL
    AND (filter->>'content_type' IS NULL OR a.content_type = filter->>'content_type')
    AND (filter->>'campaign_name' IS NULL OR a.campaign_name = filter->>'campaign_name')
  ORDER BY a.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION search_insights(
  query_embedding VECTOR(768),
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  similarity FLOAT,
  excerpt TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.title,
    1 - (i.embedding <=> query_embedding) AS similarity,
    LEFT(i.content, 300) AS excerpt
  FROM insights i
  WHERE i.is_published = TRUE
    AND i.embedding IS NOT NULL
  ORDER BY i.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
