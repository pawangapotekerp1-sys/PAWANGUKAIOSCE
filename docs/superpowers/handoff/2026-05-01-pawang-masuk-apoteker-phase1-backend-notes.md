# Pawang Masuk Apoteker Phase 1 Backend Notes

## Status ringkas

- Repo sekarang sudah punya alur frontend + backend wiring untuk auth, subscription, tryout runtime, analytics, admin ops, AI config, dan ingestion queue.
- Verifikasi lokal yang sudah bisa diklaim di repo ini: `vitest`, `vite build`, dan scaffolding `playwright`.
- Verifikasi yang masih membutuhkan runtime eksternal: `supabase db reset`, local Supabase Docker stack, Edge Functions live invocation, dan Playwright end-to-end dengan akun nyata.

## Public env vars untuk frontend

Wajib tersedia untuk build dan runtime browser:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Referensi validasi ada di [src/lib/env.ts](</E:/Projek TRY OYT/src/lib/env.ts:1>).

## Edge Function env vars

Wajib tersedia untuk semua function di `supabase/functions/*`:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY` atau `SUPABASE_ANON_KEY` atau `SB_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Opsional:

- `GEMINI_BASE_URL`

Referensi validasi ada di [supabase/functions/_shared/env.ts](</E:/Projek TRY OYT/supabase/functions/_shared/env.ts:1>).

## Local function serve

Untuk local development, jangan panggil `npx supabase functions serve` polos bila stack Supabase dijalankan lewat network `supabase-localhost`, karena edge runtime bisa join network yang berbeda dan semua endpoint function akan terlihat `503` dari Kong.

Gunakan script repo ini:

- `npm run supabase:functions:serve`
- `npm run supabase:functions:serve:qg`
- `npm run dev:full`

Script ini otomatis:

- memastikan Docker network `supabase-localhost` ada
- mengambil env lokal dari `supabase status -o env`
- menulis env sementara ke `supabase/.temp/functions.serve.env`
- menjalankan `supabase functions serve --network-id supabase-localhost`

`npm run dev:full` dipakai bila ingin langsung menyalakan:

- local Supabase stack
- `question-generator` Edge Function runner
- Vite dev server

## Supabase buckets yang dipakai

- `payment-proofs`
  Digunakan oleh flow upload bukti transfer di subscription page.
- `reference-library`
  Digunakan oleh upload PDF referensi untuk workflow ingestion dan review queue.

Bucket dan policy saat ini diatur di:

- [20260501000006_rls_and_storage.sql](</E:/Projek TRY OYT/supabase/migrations/20260501000006_rls_and_storage.sql:1>)
- [20260501000009_reference_ingestion_storage.sql](</E:/Projek TRY OYT/supabase/migrations/20260501000009_reference_ingestion_storage.sql:1>)

## Urutan migration

Jalankan migration sesuai urutan file:

1. `20260501000001_identity_and_profiles.sql`
2. `20260501000002_subscriptions_and_payments.sql`
3. `20260501000003_academic_content.sql`
4. `20260501000004_tryout_runtime.sql`
5. `20260501000005_analytics_and_ai.sql`
6. `20260501000006_rls_and_storage.sql`
7. `20260501000007_admin_review_ops.sql`
8. `20260501000008_ai_config_and_byok.sql`
9. `20260501000009_reference_ingestion_storage.sql`

Setelah itu baru seed:

- [supabase/seed.sql](</E:/Projek TRY OYT/supabase/seed.sql:1>)

## Seed accounts untuk bootstrap lokal

Seed saat ini sudah menyiapkan tiga akun email/password:

- Admin
  - email: `admin@pawang.test`
  - password: `Admin12345!`
- Pro
  - email: `pro@pawang.test`
  - password: `Pro12345!`
- Pendaftar baru
  - email: `baru@pawang.test`
  - password: `Baru12345!`

Referensi seed ada di [supabase/seed.sql](</E:/Projek TRY OYT/supabase/seed.sql:1>).

## Admin bootstrap checklist

1. Pastikan migration dan seed sudah dijalankan penuh.
2. Login dengan akun admin seed atau ubah role user target menjadi `admin` di `public.profiles`.
3. Buka `/admin/payments` untuk verifikasi queue pembayaran.
4. Buka `/admin/references` untuk upload PDF referensi.
5. Buka `/admin/review-queue` untuk approve/reject/retry candidate ingestion.
6. Buka `/admin/ai-settings` untuk menyimpan platform key Gemini dan mode insight student.

## Edge Functions yang harus dideploy

- `platform-ai-config`
- `student-ai-insight`
- `ingest-question-pdf`
- `review-ingestion-candidate`
- `retry-ingestion-candidate`

Shared helpers ada di:

- [supabase/functions/_shared/auth.ts](</E:/Projek TRY OYT/supabase/functions/_shared/auth.ts:1>)
- [supabase/functions/_shared/cors.ts](</E:/Projek TRY OYT/supabase/functions/_shared/cors.ts:1>)
- [supabase/functions/_shared/env.ts](</E:/Projek TRY OYT/supabase/functions/_shared/env.ts:1>)
- [supabase/functions/_shared/gemini-client.ts](</E:/Projek TRY OYT/supabase/functions/_shared/gemini-client.ts:1>)
- [supabase/functions/_shared/reference-retrieval.ts](</E:/Projek TRY OYT/supabase/functions/_shared/reference-retrieval.ts:1>)

## Coolify deployment notes

1. Deploy frontend Vite app dengan env frontend:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2. Deploy Supabase project dan apply migration + seed di environment target.
3. Deploy semua Edge Function yang dipakai phase 1.
4. Masukkan env function:
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_BASE_URL` bila ingin override default
5. Jalankan smoke test minimal:
   - login admin
   - login pro
   - upload bukti transfer
   - approve pembayaran
   - start tryout
   - upload reference PDF
   - retry candidate ingestion

## Prosedur rotasi key AI

Platform key:

1. Buka `/admin/ai-settings`.
2. Isi Gemini API key baru di field platform key.
3. Simpan konfigurasi.
4. Jalankan `Tes koneksi`.
5. Pastikan timestamp `last_tested_at` berubah dan koneksi sukses.

BYOK student:

1. Student menyimpan ulang key pribadi dari analytics page.
2. Jalankan tes BYOK dari UI.
3. Jika invalid, hapus credential lama lalu simpan ulang.

Catatan:

- Secret tidak pernah disimpan langsung di browser state final.
- Jalur platform memakai Vault/secret indirection dari Edge Function.

## E2E runtime notes

Playwright spec yang sekarang tersedia:

- [tests/e2e/admin-payments-and-queue.spec.ts](</E:/Projek TRY OYT/tests/e2e/admin-payments-and-queue.spec.ts:1>)
- [tests/e2e/auth-and-subscription.spec.ts](</E:/Projek TRY OYT/tests/e2e/auth-and-subscription.spec.ts:1>)
- [tests/e2e/pro-tryout-flow.spec.ts](</E:/Projek TRY OYT/tests/e2e/pro-tryout-flow.spec.ts:1>)

Env yang perlu diisi agar spec bisa benar-benar jalan:

- `E2E_ADMIN_EMAIL`
- `E2E_ADMIN_PASSWORD`
- `E2E_PENDAFTAR_EMAIL`
- `E2E_PENDAFTAR_PASSWORD`
- `E2E_PRO_EMAIL`
- `E2E_PRO_PASSWORD`

Tanpa env tersebut, spec akan `skip` dengan exit code sukses supaya repo tetap aman dijalankan di mesin yang belum punya runtime lengkap.
