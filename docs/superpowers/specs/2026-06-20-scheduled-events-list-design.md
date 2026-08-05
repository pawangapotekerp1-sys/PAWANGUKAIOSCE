# Scheduled Events List UI Design

**Date:** 2026-06-20
**Scope:** `scheduled-events-page.tsx` dan test terkait daftar event
**Status:** Draft untuk review user

## Tujuan

Merapikan halaman daftar event terjadwal agar lebih cepat dipindai, lebih tegas hierarchy visual-nya, dan lebih aman digunakan untuk aksi operasional tanpa mengubah logic event, API, routing, atau behavior destructive action yang sudah ada.

## Masalah Yang Ingin Diselesaikan

- Status event belum cukup menonjol, sehingga event aktif, draft, selesai, atau nonaktif tidak cepat terbaca.
- Kartu event terasa setara bobotnya, sehingga elemen penting tidak langsung terlihat.
- Hierarchy aksi belum cukup jelas antara aksi aman, aksi sekunder, dan aksi berisiko.
- Area atas halaman belum cukup membantu pengguna memahami kondisi daftar event dalam sekali lihat.
- Empty, loading, dan error state masih bisa dibuat lebih ringan dan lebih mudah dipindai.

## Batas Scope

### Masuk scope

- Merapikan struktur visual header halaman daftar event.
- Menambahkan ringkasan status singkat di bagian atas halaman.
- Memperjelas struktur dan hierarchy pada setiap event card.
- Merapikan hierarchy tombol aksi pada card.
- Menyempurnakan presentasi loading, empty, dan error state.
- Menyesuaikan test agar mengunci hierarchy dan copy baru.

### Tidak masuk scope

- Perubahan API, database, business logic, auth, atau routing.
- Perubahan flow destructive action.
- Redesign penuh `scheduled-event-editor-page.tsx`.
- Mengubah mekanisme `window.prompt` untuk flow reaktivasi pada batch ini.
- Menambah data baru yang belum tersedia dari current page model.

## Pendekatan Desain

Pendekatan yang dipilih adalah `status-first control board`.

Halaman tetap berbasis daftar card, tetapi diberi dua lapisan hierarchy:

1. Ringkasan status di bagian atas untuk memberi orientasi cepat.
2. Card event yang lebih tegas urutan bacanya agar pengguna bisa memutuskan tindakan tanpa membaca seluruh isi card.

Pendekatan ini dipilih karena paling cocok dengan masalah inti halaman saat ini: pengguna butuh tahu event mana yang aktif atau perlu perhatian hanya dalam beberapa detik.

## Struktur Halaman Yang Diusulkan

### 1. Header ringkas

Header tetap memakai shell yang ada, tetapi isi di dalamnya dibuat lebih ringan:

- Judul tetap jelas dan operasional.
- Deskripsi dipendekkan menjadi satu kalimat pendek.
- Tombol `Event baru` menjadi CTA yang paling jelas di area atas.

### 2. Status summary strip

Di bawah header ditambahkan ringkasan status singkat berisi 3 sampai 4 blok kecil, misalnya:

- Event aktif
- Draft atau belum dibuka
- Selesai
- Perlu tindak lanjut

Ringkasan ini tidak memperkenalkan source data baru. Jika data yang tersedia terbatas, label bisa disesuaikan dengan status yang memang sudah ada di halaman.

### 3. Control bar

Area pencarian, filter, dan kontrol lain dibungkus sebagai control bar yang tenang, sehingga:

- Tidak bersaing dengan CTA utama
- Tetap mudah diakses
- Menjadi jembatan visual antara summary dan daftar event

### 4. Event list

Setiap card mengikuti urutan baca yang konsisten:

- Nama event
- Badge status
- Waktu akses atau informasi jadwal utama
- Metadata pendukung
- Deretan aksi

Informasi pendukung tetap tersedia, tetapi bobot visualnya diturunkan agar status dan jadwal menjadi fokus utama.

## Rekomendasi Komponen

### Status summary strip

- Visual tenang, tidak glamor, dan tetap profesional.
- Menggunakan permukaan ringan dengan border halus.
- Angka atau label cukup kontras untuk tetap terbaca, termasuk pada teks kecil.
- Di mobile dapat ditumpuk secara vertikal atau memakai grid dua kolom sederhana.

### Event card

- Nama event dan badge status menjadi titik masuk utama.
- Blok jadwal dipisah dari metadata lain agar lebih cepat dipindai.
- Spacing antar kelompok informasi diperjelas.
- Jika ada pill atau badge tambahan, bobotnya harus tetap di bawah status utama.

### Action group

Urutan visual aksi yang diusulkan:

1. `Ubah event` sebagai aksi utama yang paling stabil.
2. `Aktifkan lagi` sebagai aksi sekunder yang tetap terlihat jelas.
3. `Hapus event` tetap destructive dan dipisahkan secara visual.

Tujuannya bukan mengubah aksi yang tersedia, tetapi mengurangi beban keputusan dan risiko salah klik.

## State Dan Accessibility

### State

- Loading state dibuat lebih rapi dan ringkas.
- Empty state dibuat singkat, jelas, dan membantu.
- Error state tetap memuat konteks penting tanpa paragraf panjang.

### Accessibility

- Badge status dan teks kecil harus tetap lolos contrast dasar.
- Semua tombol aksi mempertahankan `focus-visible` yang jelas dan konsisten.
- Konfirmasi hapus tetap mengikuti pola dialog accessible yang sudah dipakai project.
- Heading dan label aksi tetap eksplisit untuk screen reader.

## Dampak Testing

Test yang perlu disesuaikan akan mengunci:

- Kehadiran header yang lebih ringkas
- Kehadiran status summary strip
- Urutan dan variant hierarchy aksi utama
- Copy state yang lebih singkat
- Perilaku logic event yang tetap sama

## File Yang Kemungkinan Tersentuh

- `src/pages/scheduled-ops/scheduled-events-page.tsx`
- `src/pages/scheduled-ops/scheduled-events-page.test.tsx`
- Komponen kecil pendukung hanya jika benar-benar perlu untuk menjaga konsistensi visual

## Non-Goals

- Tidak membangun ulang sistem event management.
- Tidak menambah workflow baru.
- Tidak mengubah isi data event.
- Tidak menyentuh pembayaran, subscription page, atau editor event pada batch ini.
