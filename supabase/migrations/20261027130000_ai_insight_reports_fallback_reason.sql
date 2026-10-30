-- Migration: Add fallback_reason to ai_insight_reports and restrict cache permissions to service_role
-- Timestamp: 20261027130000

ALTER TABLE public.ai_insight_reports
  ADD COLUMN IF NOT EXISTS fallback_reason text
  CHECK (fallback_reason IS NULL OR fallback_reason IN ('no_key', 'validation_failed', 'gemini_error'));

-- Revoke INSERT, UPDATE, DELETE from authenticated (only service_role may write cache)
REVOKE INSERT, UPDATE, DELETE ON public.ai_insight_reports FROM authenticated;
GRANT SELECT ON public.ai_insight_reports TO authenticated;
GRANT ALL ON public.ai_insight_reports TO service_role;

-- Drop obsolete write policies for authenticated
DROP POLICY IF EXISTS "ai_insight_reports_insert_own_or_admin" ON public.ai_insight_reports;
DROP POLICY IF EXISTS "ai_insight_reports_update_own_or_admin" ON public.ai_insight_reports;
DROP POLICY IF EXISTS "ai_insight_reports_delete_own_or_admin" ON public.ai_insight_reports;
