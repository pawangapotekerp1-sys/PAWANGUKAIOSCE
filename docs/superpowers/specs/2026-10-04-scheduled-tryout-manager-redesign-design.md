# Scheduled Tryout Manager Redesign

## Context
Fitur manajer Tryout Terjadwal saat ini menggunakan alur gabungan di mana metadata event (Judul, Jadwal, Status) dan soal-soal tryout disatukan dalam satu form panjang (`scheduled-event-editor-page.tsx`). Selain itu, logika limit percobaan dan durasi pengerjaan saat ini menggunakan nilai statis atau dihitung dari jumlah soal. 

User ingin merombak total fitur ini menjadi alur yang terpisah:
1. Tabel Daftar Tryout sebagai tampilan utama.
2. Konfigurasi metadata (Judul, Jumlah Soal, Durasi, Limit, Jadwal) dilakukan melalui Popup Modal.
3. Kelola Soal dilakukan di halaman terpisah setelah event dibuat.

## Architecture

Pendekatan yang digunakan adalah **Replace in-place**, di mana halaman dan komponen lama akan langsung ditimpa dan diubah agar sesuai dengan *flow* baru.

### 1. Database & API
Perlu ada perubahan skema *database* untuk mengakomodasi konfigurasi *custom* per event.

*   **Tabel `scheduled_tryout_events`**:
    *   `[NEW]` `total_questions` (int) - Menyimpan jumlah soal (target).
    *   `[NEW]` `duration_minutes` (int) - Menyimpan durasi pengerjaan dalam menit.
    *   `[NEW]` `max_attempts` (int) - Menyimpan batas maksimum percobaan (limit).
*   **API `scheduled-tryout-api.ts`**:
    *   `ScheduledEventMutationInput` akan diperbarui untuk menerima field baru.
    *   Fungsi read/write (seperti `listScheduledTryoutCatalogEntries` dan fungsi insert/update event) akan mengambil dan menyimpan nilai dinamis ini dari database, bukan bergantung pada perhitungan konstan `questionCount` atau `SCHEDULED_MAX_ATTEMPTS_PER_EVENT_CYCLE`.

### 2. Tampilan Daftar Tryout & Modal Konfigurasi
File utama: `scheduled-events-page.tsx`

*   **Tabel Utama**: Menampilkan kolom NO, JUDUL TRYOUT, SOAL, DURASI, LIMIT, TOTAL KELAS, MULAI AKSES, SELESAI AKSES, STATUS, dan AKSI.
*   **Aksi (Action Buttons)**:
    *   Ikon Mata (View): Navigasi ke halaman kelola soal (`/scheduled-ops/events/:id/questions`).
    *   Ikon Pensil (Edit): Membuka Modal Edit untuk mengubah metadata.
    *   Ikon Tempat Sampah (Delete): Memunculkan konfirmasi hapus.
*   **Popup Modal**: Digunakan untuk aksi "Tambah Tryout Baru" dan "Edit".
    *   Form State akan dikelola lokal di dalam komponen halaman.
    *   Field form: Judul Tryout, Jumlah Soal, Durasi, Limit, Jadwal (Tanggal/Waktu Mulai, Tanggal/Waktu Selesai).

### 3. Halaman Kelola Soal (Ikon Mata)
File utama: `scheduled-event-editor-page.tsx` (akan direfaktor secara fungsionalitas dan desain).

*   Fokus halaman diubah hanya untuk mengelola soal tryout.
*   Menampilkan UI daftar soal di satu sisi dan detail form/opsi soal di sisi lain, sesuai referensi Gambar 4.
*   Terdapat fungsionalitas "Tambah Soal" dan "Upload Soal" (jika API import soal tersedia, akan diintegrasikan).

## Open Questions / Edge Cases
*   *Validation Check*: Saat *event* sudah berjalan (ada percobaan peserta), apakah perubahan metadata (khususnya jumlah soal dan durasi) masih diperbolehkan via modal Edit? Idealnya field krusial ini dikunci (disabled) jika sudah ada attempts.
*   Upload Soal: Pada mockup Kelola Soal terdapat tombol "Upload Soal". API/logic import via Excel/Word harus dipastikan ketersediaannya di *backend* jika diperlukan integrasi langsung.
*   *UI Adaptation*: Tampilan layout dan struktur informasi harus mengikuti mockup (Gambar 1-5), namun *styling* (tone warna, font, shadows, dll) harus diadaptasikan dengan sistem *design* atau UI yang sudah ada di aplikasi ini agar selaras.
