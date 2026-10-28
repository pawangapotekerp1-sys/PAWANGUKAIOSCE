-- Migration: Mirror production privilege hardening for SECURITY DEFINER functions (Tahap 1 & Tahap 2)
-- Timestamp: 20261028000002 (after 20261028000001)

-- 1. Golongan (b): Revoke execute from public and anon; keep authenticated and service_role
revoke all on function public.delete_question(uuid) from public, anon;
grant execute on function public.delete_question(uuid) to authenticated, service_role;

revoke all on function public.delete_questions(uuid[]) from public, anon;
grant execute on function public.delete_questions(uuid[]) to authenticated, service_role;

revoke all on function public.get_leaderboard(text) from public, anon;
grant execute on function public.get_leaderboard(text) to authenticated, service_role;

revoke all on function public.get_scheduled_event_leaderboard(uuid, integer) from public, anon;
grant execute on function public.get_scheduled_event_leaderboard(uuid, integer) to authenticated, service_role;

revoke all on function public.list_tryout_catalog_entries() from public, anon;
grant execute on function public.list_tryout_catalog_entries() to authenticated, service_role;

revoke all on function public.list_scheduled_tryout_catalog_entries() from public, anon;
grant execute on function public.list_scheduled_tryout_catalog_entries() to authenticated, service_role;

-- 2. Golongan (c): Revoke execute from public, anon, and authenticated; grant to service_role only
revoke all on function public.deliver_generated_item_to_question_bank(uuid, uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.deliver_generated_item_to_question_bank(uuid, uuid, uuid, uuid) to service_role;

revoke all on function public.deliver_generated_item_to_scheduled_event(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.deliver_generated_item_to_scheduled_event(uuid, uuid, uuid) to service_role;

revoke all on function public.persist_generated_question_batch(uuid, uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.persist_generated_question_batch(uuid, uuid, jsonb, jsonb) to service_role;

revoke all on function public.rebuild_attempt_result(uuid) from public, anon, authenticated;
grant execute on function public.rebuild_attempt_result(uuid) to service_role;

revoke all on function public.sync_question_bank_answer_key(uuid) from public, anon, authenticated;
grant execute on function public.sync_question_bank_answer_key(uuid) to service_role;

revoke all on function public.auto_create_block_exam_template() from public, anon, authenticated;
grant execute on function public.auto_create_block_exam_template() to service_role;

revoke all on function public.auto_create_topic_exam_template() from public, anon, authenticated;
grant execute on function public.auto_create_topic_exam_template() to service_role;
