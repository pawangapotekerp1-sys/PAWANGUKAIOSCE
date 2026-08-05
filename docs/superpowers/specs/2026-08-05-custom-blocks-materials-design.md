# Custom Blocks and Materials Management Design

## Objective
Mengganti sistem blok dan materi (topik) yang saat ini bersifat statis (hardcoded) menjadi sistem dinamis yang dapat dikelola sepenuhnya (CRUD) oleh Admin dan Mentor. Tampilan visual blok pada sisi siswa juga akan mengikuti pengaturan yang dibuat oleh Admin/Mentor, alih-alih hardcoded di komponen UI.

## Scope & Access
- **Admin & Mentor**: Memiliki akses ke halaman baru di dashboard Admin untuk mengelola (Menambah, Mengubah, Menghapus) Blok dan Materi (Sub-topik).
- **Siswa (App)**: Hanya melihat dan menggunakan blok/materi yang telah dibuat oleh Admin/Mentor di halaman latihan/Try Out.
- **Visual Blok**: Admin/Mentor dapat memilih *icon* dan *tema warna* saat membuat blok baru dari pilihan yang disediakan.

## Architecture & Data Changes

### 1. Database Schema (Supabase)
Kita akan membuat migrasi baru untuk mengubah tabel `public.blocks`:
- Tambahkan kolom `icon_name` (text, default ke icon standar, nullable).
- Tambahkan kolom `color_theme` (text, merepresentasikan preset warna seperti 'blue', 'teal', 'fuchsia', dll).
- Hapus semua data statis awal (seeder) jika diperlukan (berdasarkan instruksi user: "menghapus seluruh jenis blok dan materi").
- Kolom yang sudah ada (`slug`, `name`, `description`, `sort_order`, `is_active`) akan tetap digunakan.

### 2. Admin UI (Dashboard)
Membuat halaman baru di rute Admin:
- **`src/pages/admin/blocks-page.tsx`**: Halaman utama manajemen blok.
  - Tabel/Daftar blok yang ada.
  - Tombol "Tambah Blok" yang membuka Dialog/Modal form (Nama, Deskripsi, Pilihan Icon, Pilihan Warna, Urutan).
  - Aksi "Edit" dan "Hapus".
- **`src/pages/admin/topics-page.tsx`** (Atau dikelola di dalam detail blok): Halaman/modal manajemen materi/topik yang terikat dengan relasi `block_id`.

### 3. App UI (Siswa)
- Memodifikasi **`tryout-block-selection-page.tsx`** dan halaman relevan lainnya.
- Menghapus fungsi `getBlockVisuals` yang melakukan pengecekan hardcoded (misal `name.includes("clinical")`).
- Mengganti logika visual dengan menggunakan data `icon_name` dan `color_theme` yang dikembalikan dari API. Kita akan menyediakan *mapping* warna (Tailwind classes) dan icon berdasarkan data dari database.

## Trade-offs & Alternatives Considered
1. **Menyimpan Visual Config di Kolom `metadata` JSONB**: Lebih fleksibel untuk ekstensi masa depan, tapi berpotensi menyulitkan pengetikan (typing) di frontend.
2. **(Rekomendasi Terpilih) Menambah Kolom Eksplisit `icon_name` & `color_theme`**: Relasional dan *type-safe*, cukup untuk kebutuhan saat ini di mana visual bergantung pada sepasang konfigurasi tetap.

## Verification
- Admin/Mentor dapat membuat blok baru dengan icon "Stethoscope" dan tema warna "Teal".
- Data masuk ke Supabase dengan benar.
- Saat siswa login dan masuk ke "Latihan Per Blok", blok baru tersebut muncul dengan desain yang sesuai.
- Blok lama yang sudah dihapus tidak lagi muncul.
