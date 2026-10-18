-- supabase/migrations/20261018000051_flashcard_heartbeat_atomic_rpc.sql
-- RPC: Atomic heartbeat updater that updates ONLY processingJob.heartbeatAt in metadata
-- without rewriting the entire metadata JSONB column, preventing race conditions with stage checkpoints.

create or replace function public.update_flashcard_material_heartbeat(
  target_material_id uuid,
  target_job_id text,
  target_heartbeat_at text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_metadata jsonb;
begin
  if target_material_id is null or target_job_id is null or target_heartbeat_at is null then
    return null;
  end if;

  update public.flashcard_materials
  set
    metadata = jsonb_set(
      metadata,
      '{processingJob,heartbeatAt}',
      to_jsonb(target_heartbeat_at),
      true
    )
  where id = target_material_id
    and status = 'processing'
    and metadata->'processingJob'->>'jobId' = target_job_id
  returning metadata into updated_metadata;

  return updated_metadata;
end;
$$;

revoke all on function public.update_flashcard_material_heartbeat(uuid, text, text) from public, anon, authenticated;
grant execute on function public.update_flashcard_material_heartbeat(uuid, text, text) to service_role;
