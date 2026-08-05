# Local Supabase Runtime Hardening

Tanggal: 2 Mei 2026

## Tujuan

Menjadikan local Supabase lebih konsisten dan aman dipakai di repo ini pada Windows.

## Perubahan

- `supabase/config.toml`
  - `analytics.enabled = false`
  - alasan: service analytics bersifat opsional, sementara docs Supabase menyebut ada caveat khusus untuk Windows ketika Docker daemon tidak diekspos ke `tcp://localhost:2375`
- `package.json`
  - tambah `supabase:network`
  - tambah `supabase:start`
  - tambah `supabase:status`
  - tambah `supabase:stop`
- `scripts/ensure-supabase-local-network.mjs`
  - memastikan Docker network `supabase-localhost` ada
  - network ini dibuat dengan binding `127.0.0.1` agar stack lokal tidak terbuka ke seluruh host network secara default

## Jalur Operasional Yang Disarankan

```powershell
npm run supabase:start
npm run supabase:status
npm run supabase:stop
```

## Catatan

- Script start default tetap memakai `--ignore-health-check` dan `-x vector`.
- `vector` tidak dipakai oleh aplikasi fase ini dan justru paling sering noisy/restart pada local runtime.
- Jika suatu saat fitur analytics lokal atau vector bucket benar-benar dibutuhkan, konfigurasi ini perlu dievaluasi ulang.
