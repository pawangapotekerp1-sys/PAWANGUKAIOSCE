# Live Class Feature Design Specification

## 1. Overview
Fitur **Live Class** dirancang untuk menjadwalkan dan mengelola sesi kelas online tatap muka (webinar/bimbingan via Zoom) antara mentor dan siswa.
Fitur ini terintegrasi langsung di dua modul utama:
- **Modul Area Belajar** (Siswa): Tampilan tabel jadwal kelas online, status sesi, dan tombol link langsung menuju Zoom saat sesi berlangsung.
- **Modul Area Mentor** (Mentor & Admin): Manajemen lengkap jadwal kelas (CRUD), penentuan waktu mulai & selesai, input link Zoom, serta pembagian target kelas (`Masuk Apoteker / role pro`, `OSCE / role osce_pro`, atau `Semua Siswa`).

---

## 2. Architecture & Database

### 2.1 Database Schema (`public.live_classes`)
Tabel baru dibuat melalui migrasi Supabase:

```sql
create table public.live_classes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  zoom_link text not null,
  target_roles public.app_role[] not null default array['pro', 'osce_pro']::public.app_role[],
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint check_live_class_time_order check (end_time > start_time)
);

create index idx_live_classes_start_time on public.live_classes(start_time asc);
```

### 2.2 Row Level Security (RLS)
- **SELECT**:
  - `admin` dan `mentor` dapat melihat seluruh jadwal.
  - `student` (`pro` dan `osce_pro`) hanya dapat melihat jadwal yang mengandung role mereka dalam `target_roles`:
    ```sql
    create policy "Students view matching target roles"
      on public.live_classes for select
      to authenticated
      using (
        auth.jwt() ->> 'role' in ('admin', 'mentor')
        or exists (
          select 1 from public.profiles
          where profiles.id = auth.uid()
            and (
              profiles.role in ('admin', 'mentor')
              or profiles.role = any(live_classes.target_roles)
            )
        )
      );
    ```
- **INSERT / UPDATE / DELETE**:
  - Dibatasi hanya untuk user terautentikasi dengan role `admin` atau `mentor`.

### 2.3 Status Sesi & Logika Akses Zoom
Status sesi dihitung secara otomatis dan reaktif pada client-side berdasarkan perbandingan waktu aktual (`now`):
1. **`Mendatang` (Upcoming)**: `now < start_time`
   - Badge warna biru/abu.
   - Tombol Zoom berstatus **Disabled** dengan label *"Belum Dimulai"*.
2. **`Sedang Berlangsung` (Live / Ongoing)**: `start_time <= now <= end_time`
   - Badge warna hijau dengan indikator aktif.
   - Tombol Zoom berstatus **Aktif** berwarna aksen/hijau, dapat diklik langsung untuk direct ke `zoom_link` pada tab baru.
3. **`Selesai` (Ended / Completed)**: `now > end_time`
   - Badge warna abu netral.
   - Tombol Zoom berstatus **Disabled** dengan label *"Selesai"*.

---

## 3. UI / UX Design

### 3.1 Navigasi & Entry Points
1. **Area Belajar** (`/app/area-belajar`):
   - Ditambahkan kartu baru di daftar `STUDY_FEATURES`:
     - Judul: `Live Class`
     - Deskripsi: *"Ikuti sesi bimbingan kelas online tatap muka interaktif bersama mentor via Zoom."*
     - Tombol: *"Buka Live Class"*
     - Tautan: `/app/live-class?mode=student`
     - Ikon: `Radio` atau `Video`
2. **Area Mentor** (`/app/area-mentor`):
   - Ditambahkan kartu baru di daftar `MENTOR_FEATURES`:
     - Judul: `Kelola Live Class`
     - Deskripsi: *"Atur jadwal kelas tatap muka online, tautan Zoom, waktu pelaksanaan, dan target peserta."*
     - Tombol: *"Pilih Kelola Live Class"*
     - Tautan: `/app/live-class?mode=manage`
     - Ikon: `Radio` atau `Video`

### 3.2 Halaman Siswa (`StudentLiveClassView`)
Menggunakan rute `/app/live-class?mode=student`.
- **Tampilan Bersih**: Menampilkan tabel dengan kolom:
  1. **No**: Nomor urut urutan jadwal.
  2. **Judul Sesi**: Topik kelas bimbingan.
  3. **Waktu Pelaksanaan**: Diformat ramah lokal Indonesia (contoh: *Jumat, 31 Okt 2026 • 19:30 - 21:00 WIB*).
  4. **Status**: Badge status (`Mendatang`, `Sedang Berlangsung`, `Selesai`).
  5. **Link Zoom**: Tombol link terproteksi (aktif hanya saat kelas berlangsung).
- **Auto-Refresh Timer**: Interval tick setiap 30 detik agar tombol otomatis aktif saat jam masuk sesi tanpa reload manual.
- **Empty State**: Tampilan informatif bila belum ada jadwal untuk role siswa terkait.

### 3.3 Halaman Mentor (`MentorLiveClassView`)
Menggunakan rute `/app/live-class?mode=manage` (hanya bisa diakses mentor/admin).
- **Action Header**:
  - Judul & informasi jumlah kelas.
  - Tombol **`+ Tambah Jadwal Kelas`** untuk memicu modal form.
- **Tabel Kelola Mentor**:
  - Kolom: No, Judul Sesi, Target Siswa (Badge: *Apoteker*, *OSCE*, *Semua*), Jadwal Pelaksanaan, Status, Link Zoom (pratinjau & uji buka link), serta Kolom Aksi.
  - Aksi:
    - ✏️ **Edit**: Membuka modal form dengan nilai sesi yang dipilih untuk diperbarui.
    - 🗑️ **Hapus**: Membuka dialog konfirmasi `ConfirmDialog` sebelum melakukan penghapusan data di database.

### 3.4 Modal Formulir Tambah / Edit Sesi (`LiveClassFormModal`)
Dialog interaktif untuk membuat atau memperbarui sesi dengan validasi:
1. **Judul Kelas**: Input teks wajib diisi.
2. **Target Role**: Pilihan radio atau select:
   - `Semua Siswa` (`['pro', 'osce_pro']`)
   - `Khusus Masuk Apoteker` (`['pro']`)
   - `Khusus OSCE` (`['osce_pro']`)
3. **Waktu Mulai**: Datetime-local picker wajib diisi.
4. **Waktu Selesai**: Datetime-local picker wajib diisi. Validasi UI: waktu selesai harus setelah waktu mulai.
5. **Link Zoom**: URL input wajib diisi dengan validasi format URL (`https://...`).

---

## 4. API & Data Access Layer (`src/lib/api/live-class-api.ts`)

Menyediakan fungsi terstandarisasi untuk konsumsi komponen frontend:
- `getLiveClasses(role?: UserRole)`: Mengambil daftar kelas yang diurutkan berdasarkan `start_time asc`.
- `createLiveClass(payload)`: Menyimpan sesi kelas baru ke Supabase.
- `updateLiveClass(id, payload)`: Memperbarui rincian sesi kelas yang ada.
- `deleteLiveClass(id)`: Menghapus sesi kelas berdasarkan ID.

---

## 5. Edge Cases & Error Handling

1. **Format URL Zoom**: Validasi regex memastikan protokol valid (`https://` atau `http://`) untuk mencegah tautan rusak atau potensi skrip berbahaya.
2. **Urutan Waktu**: Form mencegah submit jika `end_time <= start_time`, serta dijaga oleh database check constraint `check_live_class_time_order`.
3. **Perbedaan Zona Waktu User**: Data disimpan dalam format ISO UTC (`timestamptz`). Format tampilan menggunakan fungsi utilitas dengan `Intl.DateTimeFormat` locale `id-ID` sehingga waktu akurat di zona waktu manapun.
4. **Pencegahan Akses Awal / Kedaluwarsa**: Tombol Zoom pada siswa tidak dapat diklik di luar rentang `start_time` dan `end_time`.
5. **Kegagalan Jaringan**: Setiap mutasi (Create, Update, Delete) dilengkapi penanganan error state dan notifikasi alert yang jelas.

---

## 6. Testing Strategy

1. **API Unit Tests (`live-class-api.test.ts`)**:
   - Memastikan pemanggilan query `select`, `insert`, `update`, `delete` ke Supabase berjalan dengan parameter yang tepat.
   - Memverifikasi penanganan error saat respons database gagal.
2. **UI & Component Tests (`live-class-page.test.tsx`)**:
   - Memastikan render tabel siswa memuat kolom No, Judul, Waktu, Status, dan Tombol Zoom.
   - Memverifikasi tombol Zoom:
     - Disabled saat waktu sekarang < `start_time` ("Belum Dimulai").
     - Aktif saat waktu sekarang di antara `start_time` dan `end_time` ("Masuk Zoom").
     - Disabled saat waktu sekarang > `end_time` ("Selesai").
   - Memastikan tampilan mentor memunculkan tombol tambah sesi, opsi edit, dan hapus.
   - Memastikan direct link Zoom memiliki atribut `target="_blank"` dan `rel="noopener noreferrer"`.
3. **Type-Check & Build Verification**:
   - Menjalankan `npm run type-check` atau `tsc` untuk memastikan seluruh tipe data TypeScript valid.
