alter function public.set_updated_at()
set search_path = '';

alter function public.subscription_package_duration_days(text)
set search_path = '';

alter function public.handle_new_user()
set search_path = '';

revoke all on function public.handle_new_user() from public, anon;

alter function public.prevent_profile_role_change()
security invoker;

alter function public.prevent_profile_role_change()
set search_path = '';

revoke all on function public.prevent_profile_role_change() from public, anon;
grant execute on function public.prevent_profile_role_change() to authenticated;
grant execute on function public.prevent_profile_role_change() to service_role;

alter function public.can_manage_question_bank()
security invoker;

alter function public.can_manage_question_bank()
set search_path = '';

revoke all on function public.can_manage_question_bank() from public, anon;
grant execute on function public.can_manage_question_bank() to authenticated;
grant execute on function public.can_manage_question_bank() to service_role;

alter function public.can_manage_scheduled_tryouts()
security invoker;

alter function public.can_manage_scheduled_tryouts()
set search_path = '';

revoke all on function public.can_manage_scheduled_tryouts() from public, anon;
grant execute on function public.can_manage_scheduled_tryouts() to authenticated;
grant execute on function public.can_manage_scheduled_tryouts() to service_role;

alter function public.list_admin_users()
security invoker;

alter function public.list_admin_users()
set search_path = '';

revoke all on function public.list_admin_users() from public, anon;
grant execute on function public.list_admin_users() to authenticated;
grant execute on function public.list_admin_users() to service_role;

alter function public.admin_update_user_role(uuid, public.app_role)
security invoker;

alter function public.admin_update_user_role(uuid, public.app_role)
set search_path = '';

revoke all on function public.admin_update_user_role(uuid, public.app_role) from public, anon;
grant execute on function public.admin_update_user_role(uuid, public.app_role) to authenticated;
grant execute on function public.admin_update_user_role(uuid, public.app_role) to service_role;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to service_role;

revoke all on function public.get_leaderboard(text) from public, anon;
grant execute on function public.get_leaderboard(text) to authenticated;
grant execute on function public.get_leaderboard(text) to service_role;

revoke all on function public.get_personal_weakness_diagnosis(date, date, text) from public, anon;
grant execute on function public.get_personal_weakness_diagnosis(date, date, text) to authenticated;
grant execute on function public.get_personal_weakness_diagnosis(date, date, text) to service_role;

revoke all on function public.start_attempt_from_template(uuid) from public, anon;
grant execute on function public.start_attempt_from_template(uuid) to authenticated;
grant execute on function public.start_attempt_from_template(uuid) to service_role;

revoke all on function public.pause_attempt(uuid) from public, anon;
grant execute on function public.pause_attempt(uuid) to authenticated;
grant execute on function public.pause_attempt(uuid) to service_role;

revoke all on function public.resume_attempt(uuid) from public, anon;
grant execute on function public.resume_attempt(uuid) to authenticated;
grant execute on function public.resume_attempt(uuid) to service_role;

revoke all on function public.submit_attempt(uuid) from public, anon;
grant execute on function public.submit_attempt(uuid) to authenticated;
grant execute on function public.submit_attempt(uuid) to service_role;

revoke all on function public.save_attempt_answer(uuid, uuid, text, boolean, integer) from public, anon;
grant execute on function public.save_attempt_answer(uuid, uuid, text, boolean, integer) to authenticated;
grant execute on function public.save_attempt_answer(uuid, uuid, text, boolean, integer) to service_role;

revoke all on function public.list_tryout_catalog_entries() from public, anon;
grant execute on function public.list_tryout_catalog_entries() to authenticated;
grant execute on function public.list_tryout_catalog_entries() to service_role;

revoke all on function public.delete_question(uuid) from public, anon;
grant execute on function public.delete_question(uuid) to authenticated;
grant execute on function public.delete_question(uuid) to service_role;

revoke all on function public.delete_questions(uuid[]) from public, anon;
grant execute on function public.delete_questions(uuid[]) to authenticated;
grant execute on function public.delete_questions(uuid[]) to service_role;

revoke all on function public.list_scheduled_tryout_catalog_entries() from public, anon;
grant execute on function public.list_scheduled_tryout_catalog_entries() to authenticated;
grant execute on function public.list_scheduled_tryout_catalog_entries() to service_role;

revoke all on function public.sync_scheduled_tryout_attempt(uuid) from public, anon;
grant execute on function public.sync_scheduled_tryout_attempt(uuid) to authenticated;
grant execute on function public.sync_scheduled_tryout_attempt(uuid) to service_role;

revoke all on function public.start_scheduled_tryout_attempt(uuid) from public, anon;
grant execute on function public.start_scheduled_tryout_attempt(uuid) to authenticated;
grant execute on function public.start_scheduled_tryout_attempt(uuid) to service_role;

revoke all on function public.save_scheduled_tryout_answer(uuid, uuid, text, boolean) from public, anon;
grant execute on function public.save_scheduled_tryout_answer(uuid, uuid, text, boolean) to authenticated;
grant execute on function public.save_scheduled_tryout_answer(uuid, uuid, text, boolean) to service_role;

revoke all on function public.pause_scheduled_tryout_attempt(uuid) from public, anon;
grant execute on function public.pause_scheduled_tryout_attempt(uuid) to authenticated;
grant execute on function public.pause_scheduled_tryout_attempt(uuid) to service_role;

revoke all on function public.resume_scheduled_tryout_attempt(uuid) from public, anon;
grant execute on function public.resume_scheduled_tryout_attempt(uuid) to authenticated;
grant execute on function public.resume_scheduled_tryout_attempt(uuid) to service_role;

revoke all on function public.submit_scheduled_tryout_attempt(uuid) from public, anon;
grant execute on function public.submit_scheduled_tryout_attempt(uuid) to authenticated;
grant execute on function public.submit_scheduled_tryout_attempt(uuid) to service_role;

revoke all on function public.upsert_scheduled_tryout_event(uuid, jsonb) from public, anon;
grant execute on function public.upsert_scheduled_tryout_event(uuid, jsonb) to authenticated;
grant execute on function public.upsert_scheduled_tryout_event(uuid, jsonb) to service_role;

revoke all on function public.reactivate_scheduled_tryout_event(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.reactivate_scheduled_tryout_event(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.reactivate_scheduled_tryout_event(uuid, timestamptz, timestamptz) to service_role;

revoke all on function public.delete_scheduled_tryout_event(uuid) from public, anon;
grant execute on function public.delete_scheduled_tryout_event(uuid) to authenticated;
grant execute on function public.delete_scheduled_tryout_event(uuid) to service_role;

revoke all on function public.rebuild_attempt_diagnostic_snapshot(uuid) from public, anon;
grant execute on function public.rebuild_attempt_diagnostic_snapshot(uuid) to authenticated;
grant execute on function public.rebuild_attempt_diagnostic_snapshot(uuid) to service_role;
