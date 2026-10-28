-- Migration: Align vault helper functions privileges with production and update default privileges
-- Timestamp: 20261028000001 (after 20261027130000)

-- 1. Revoke execute privileges on vault helper functions from public, anon, and authenticated
revoke all on function public.create_vault_secret(text, text, text) from public, anon, authenticated;
revoke all on function public.read_vault_secret(uuid) from public, anon, authenticated;
revoke all on function public.delete_vault_secret(uuid) from public, anon, authenticated;

-- 2. Explicitly grant execute on vault helper functions to service_role only
grant execute on function public.create_vault_secret(text, text, text) to service_role;
grant execute on function public.read_vault_secret(uuid) to service_role;
grant execute on function public.delete_vault_secret(uuid) to service_role;

-- 3. Update default privileges in schema public for functions to stop auto-granting execute to anon and authenticated
-- CATATAN PENTING: Setelah perubahan default privileges ini diterapkan, setiap fungsi RPC baru
-- di masa mendatang yang dimaksudkan untuk dipanggil oleh klien frontend (siswa/mentor/admin)
-- WAJIB menyertakan pernyataan GRANT EXECUTE ON FUNCTION ... TO authenticated secara eksplisit
-- di migration terkait, karena default PostgreSQL di schema public tidak lagi memberi hak ke authenticated.
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;
alter default privileges in schema public revoke execute on functions from anon, authenticated;
