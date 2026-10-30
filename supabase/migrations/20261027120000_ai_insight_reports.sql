-- Migration: Create ai_insight_reports table for caching personal weakness diagnosis reports
-- Timestamp: 20261027120000

CREATE TABLE IF NOT EXISTS public.ai_insight_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  input_hash text NOT NULL,
  engine_version text NOT NULL,
  report jsonb NOT NULL,
  narrative text NOT NULL,
  summary text NOT NULL,
  source text NOT NULL CHECK (source IN ('gemini', 'fallback')),
  model text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Unique index to enforce single cached report per user, input hash, and engine version
CREATE UNIQUE INDEX IF NOT EXISTS ai_insight_reports_user_input_engine_idx
  ON public.ai_insight_reports (user_id, input_hash, engine_version);

-- Index for fast user query
CREATE INDEX IF NOT EXISTS ai_insight_reports_user_idx
  ON public.ai_insight_reports (user_id);

-- Enable Row Level Security
ALTER TABLE public.ai_insight_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "ai_insight_reports_select_own_or_admin" ON public.ai_insight_reports;
CREATE POLICY "ai_insight_reports_select_own_or_admin"
  ON public.ai_insight_reports
  FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "ai_insight_reports_insert_own_or_admin" ON public.ai_insight_reports;
CREATE POLICY "ai_insight_reports_insert_own_or_admin"
  ON public.ai_insight_reports
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "ai_insight_reports_update_own_or_admin" ON public.ai_insight_reports;
CREATE POLICY "ai_insight_reports_update_own_or_admin"
  ON public.ai_insight_reports
  FOR UPDATE
  USING (auth.uid() = user_id OR is_admin())
  WITH CHECK (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "ai_insight_reports_delete_own_or_admin" ON public.ai_insight_reports;
CREATE POLICY "ai_insight_reports_delete_own_or_admin"
  ON public.ai_insight_reports
  FOR DELETE
  USING (auth.uid() = user_id OR is_admin());

-- Trigger for updated_at
DROP TRIGGER IF EXISTS set_ai_insight_reports_updated_at ON public.ai_insight_reports;
CREATE TRIGGER set_ai_insight_reports_updated_at
  BEFORE UPDATE ON public.ai_insight_reports
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Grant permissions to authenticated role
REVOKE ALL ON public.ai_insight_reports FROM public, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_insight_reports TO authenticated;
