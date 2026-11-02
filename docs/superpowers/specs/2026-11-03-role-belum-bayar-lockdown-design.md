# Design Specification: Role Khusus `belum_bayar` & Halaman Penguncian Akun

- **Tanggal**: 2026-11-03
- **Status**: Disetujui (Approved)
- **Topik**: Pembatasan Hak Akses Siswa Telat Bayar / Baru DP Melalui Role Khusus `belum_bayar`

---

## 1. Latar Belakang & Tujuan

Aplikasi memerlukan mekanisme tegas untuk membatasi akses siswa yang belum menyelesaikan pembayaran (misal siswa yang baru membayar Down Payment / DP atau menunggak cicilan). 

Siswa yang diberi role `belum_bayar` harus:
1. Terkunci secara total dari fitur-fitur pembelajaran (`/app/*`), administrasi (`/admin/*`), langganan (`/subscription`), maupun profil (`/profile`).
2. Tertahan di halaman khusus minimalis yang menginformasikan bahwa akun mereka dinonaktifkan sementara dan mengarahkan mereka untuk melunasi pembayaran ke admin.
3. Memiliki opsi keluar (*Logout*) agar dapat berganti akun atau keluar dari perangkat bersama secara aman.
4. Mendapatkan akses kembali secara instan begitu Admin mengubah role mereka kembali menjadi `pro` atau `osce_pro` di menu manajemen pengguna admin.

---

## 2. Arsitektur Data & Database Migration

### 2.1. PostgreSQL Enum Update
Menambahkan nilai enum `belum_bayar` ke tipe `public.app_role` di Supabase.

```sql
-- Migration: 20261103000000_add_belum_bayar_role.sql
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'belum_bayar';
```

### 2.2. Row Level Security (RLS)
Pengguna dengan role `belum_bayar` tidak memiliki hak akses data materi belajar (soal tryout, rekaman kelas, materi PPT, flashcards, dll.). RLS yang sudah ada di Supabase yang mengandalkan role `pro` / `osce_pro` secara otomatis menolak pembacaan data privat oleh role `belum_bayar`.

---

## 3. Sistem Tipe TypeScript & Logika Hak Akses

### 3.1. `src/lib/auth/permissions.ts`
- Memperluas definisi tipe `UserRole`:
  ```typescript
  export type UserRole = "pendaftar_baru" | "pro" | "mentor" | "admin" | "osce_pro" | "belum_bayar";
  ```
- Memperbarui fungsi validasi peran `isUserRole(value: unknown)` agar mengenali `'belum_bayar'`.
- Menyesuaikan penentuan halaman beranda awal pengguna terautentikasi:
  ```typescript
  export function resolveAuthenticatedHome(access: AccessSnapshot): "/admin" | "/app" | "/subscription" | "/account-suspended" {
    if (access.role === "admin") {
      return "/admin";
    }
    if (access.role === "belum_bayar") {
      return "/account-suspended";
    }
    return canAccessStudentApp(access) ? "/app" : "/subscription";
  }
  ```
- Memastikan `canAccessStudentApp(access)` menghasilkan `false` untuk role `belum_bayar`.

### 3.2. `src/lib/api/admin-api.ts`
- Memperbarui `ManagedUserRow["role"]` dan `ManagedUser["role"]` agar menyertakan `'belum_bayar'`.
- Memperbarui `resolveManagedUserFilterLabel(role)` agar role `belum_bayar` dipetakan ke filter label `'belum_bayar'`.

---

## 4. Route Guards & Routing (`src/router/`)

### 4.1. Guard Lockdown
- **`AppRouteGuard` (`/app/*`)**:
  - Jika `guardState.access.role === "belum_bayar"`, langsung dialihkan ke `<Navigate replace to="/account-suspended" />`.
- **`AdminRouteGuard` (`/admin/*`)**:
  - Pengguna non-admin dialihkan ke `resolveAuthenticatedHome(guardState.access)` yang otomatis mengarahkan `belum_bayar` ke `/account-suspended`.
- **`AuthenticatedRouteGuard` (`/profile`, dll.)**:
  - Memeriksa jika role adalah `belum_bayar`, dialihkan ke `/account-suspended`.

### 4.2. `SuspendedAccountRouteGuard` (`/account-suspended`)
- Jika pengguna belum login (status `"anonymous"`) -> dialihkan ke `/auth/login`.
- Jika pengguna sudah login dan role-nya normal (`pro`, `osce_pro`, `admin`, `mentor`) -> dialihkan ke `resolveAuthenticatedHome(access)` (tidak bisa masuk ke halaman suspended jika akun aktif).
- Jika pengguna memiliki role `belum_bayar` -> diizinkan melihat halaman `/account-suspended`.

---

## 5. Halaman `/account-suspended` (`src/pages/account-suspended-page.tsx`)

### 5.1. Komponen & Tampilan
Halaman dibuat standalone (tanpa header navigasi atas, sidebar, atau footer menu):
- **Wadah**: Layar penuh dengan latar netral (`bg-slate-50 dark:bg-slate-950`), tata letak kartu berada di tengah layar (*centered card*).
- **Ikon**: Ikon peringatan akun nonaktif (misal `AlertOctagon` atau `ShieldAlert` beraksen amber/merah).
- **Judul**: *Akun Dinonaktifkan*.
- **Pesan**: *"Akun anda nonaktif, silahkan hubungi admin untuk melunasi pembayaran"*.
- **Informasi Siswa**: Nama lengkap dan alamat email siswa yang sedang login ditampilkan secara rapi di dalam kartu.
- **Tombol Aksi**:
  - Tombol **"Keluar dari Akun"** (*Logout*): Menjalankan mutasi logout Supabase dan mengarahkan kembali ke `/auth/login`.

---

## 6. Integrasi Admin Panel (`src/pages/admin/users-page.tsx`)

1. **Dropdown Role**:
   - Menambahkan opsi `"Belum Bayar"` (`belum_bayar`) pada dropdown role tabel pengguna.
   - Menambahkan label pembacaan role:
     ```typescript
     if (role === "belum_bayar") {
       return "Belum Bayar";
     }
     ```
2. **Filter Pengguna**:
   - Tab filter `"Belum bayar"` yang sudah ada di halaman admin otomatis menyaring pengguna yang memiliki role `belum_bayar` maupun pendaftar yang belum menyelesaikan pembayaran.
3. **Aksi Update Role**:
   - Mengubah role siswa ke `belum_bayar` dan klik Simpan akan memanggil RPC/update `profiles.role` menjadi `'belum_bayar'`.

---

## 7. Rencana Pengujian (Testing Strategy)

1. **Unit & Guard Tests (`route-guards.test.tsx` & `permissions.test.ts`)**:
   - Memastikan `resolveAuthenticatedHome` mengembalikan `"/account-suspended"` untuk role `belum_bayar`.
   - Memastikan `canAccessStudentApp` menghasilkan `false` untuk role `belum_bayar`.
   - Memastikan `AppRouteGuard` melakukan redirect ke `/account-suspended` saat mendeteksi user `belum_bayar`.
   - Memastikan `SuspendedAccountRouteGuard` melarang user aktif masuk ke halaman suspended, dan menolak anonymous user.
2. **Component Test (`account-suspended-page.test.tsx`)**:
   - Menampilkan teks pesan utama sesuai permintaan: *"Akun anda nonaktif, silahkan hubungi admin untuk melunasi pembayaran"*.
   - Memastikan tombol Logout memicu fungsi auth logout.
3. **Admin Users Test (`users-page.test.tsx`)**:
   - Memastikan role `"Belum Bayar"` dapat dipilih dan disimpan di tabel pengguna.
