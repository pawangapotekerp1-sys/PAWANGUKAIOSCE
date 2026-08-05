# Scheduled Event Editor Metadata UI Design

**Date:** 2026-06-20
**Scope:** `scheduled-event-editor-page.tsx` pada area metadata atas event
**Status:** Draft untuk review user

## Tujuan

Meringankan bagian metadata atas pada halaman editor event terjadwal agar lebih mudah dipindai, lebih jelas urutan bacanya, dan tidak terasa seperti tumpukan field setara, tanpa mengubah autosave, validasi, API, routing, atau logic penyimpanan draft yang sudah ada.

## Masalah Yang Ingin Diselesaikan

- Semua field metadata atas terasa setara, sehingga pengguna tidak tahu harus mulai dari mana.
- Judul, status tayang, deskripsi, dan jadwal akses terasa berhimpitan dalam satu blok.
- Bagian atas form terasa berat sejak pertama dibuka, terutama di mobile.
- Durasi otomatis tampil sebagai blok pendukung, tetapi posisinya belum membantu hierarchy.
- Informasi autosave belum cukup terintegrasi secara visual dengan konteks pengisian metadata.

## Batas Scope

### Masuk scope

- Merapikan hierarchy visual area metadata atas.
- Menyusun ulang kelompok field metadata tanpa mengubah field yang ada.
- Menambahkan intro ringan untuk membantu orientasi pengguna.
- Menata ulang posisi autosave info dan ringkasan durasi agar lebih mendukung.
- Menyesuaikan test editor yang terdampak oleh hierarchy dan copy baru.

### Tidak masuk scope

- Perubahan autosave logic.
- Perubahan create/update API.
- Perubahan upload media logic.
- Perubahan draft storage dan recovery behavior.
- Redesign penuh blok soal.
- Perubahan route, payload, atau perilaku simpan.

## Pendekatan Desain

Pendekatan yang dipilih adalah `step-first editor header`.

Bagian atas editor tetap menjadi satu alur kerja yang utuh, tetapi dibaca secara bertahap:

1. Pengguna memahami konteks event.
2. Pengguna mengisi identitas event.
3. Pengguna mengatur status tayang.
4. Pengguna menentukan jadwal akses.

Pendekatan ini dipilih karena paling tepat untuk mengatasi masalah inti halaman: semua field saat ini terasa datar dan muncul sekaligus dengan bobot visual yang sama.

## Struktur Area Metadata Yang Diusulkan

### 1. Intro strip

Di atas area metadata utama ditambahkan intro ringan yang berisi:

- label kecil seperti `Atur event`
- judul pendek untuk memberi konteks
- satu kalimat panduan yang singkat
- status autosave sebagai informasi pendukung

Intro ini bukan hero besar, melainkan jembatan agar pengguna merasa memulai sebuah langkah, bukan langsung dilempar ke form padat.

### 2. Card metadata utama

Metadata tetap berada di satu surface utama agar flow tidak terpecah, tetapi isi di dalamnya dibagi menjadi sub-section yang jelas.

Sub-section yang diusulkan:

- `Identitas event`
  - judul event
  - deskripsi singkat
- `Status tayang`
  - pilihan draft atau tayang
  - bantuan copy singkat jika diperlukan
- `Jadwal akses`
  - akses mulai
  - akses selesai
  - ringkasan durasi otomatis sebagai informasi pendukung

## Hierarchy Visual Yang Diusulkan

### Identitas event

- `Judul event` menjadi titik masuk utama dan field paling dominan.
- `Deskripsi singkat` tetap ada, tetapi bobot visualnya lebih rendah dari judul.

### Status tayang

- `Status tayang` dibuat ringkas dan tidak mendominasi tinggi layout.
- Pengguna tetap memahami bahwa field ini penting, tetapi fokus utama tetap pada judul dan jadwal.

### Jadwal akses

- `Akses mulai` dan `akses selesai` dibuat sebagai pasangan yang jelas.
- Grup jadwal menjadi prioritas kedua setelah identitas event.

### Durasi otomatis

- Tidak lagi berdiri sendiri sebagai blok besar yang bersaing dengan field utama.
- Diposisikan sebagai hasil ringkas dari struktur soal, sehingga terasa seperti info pendukung.

### Autosave

- Status autosave tetap terlihat, tetapi diposisikan sebagai helper yang tenang.
- Informasi ini tidak boleh menjadi pusat perhatian visual di atas form.

## Responsive Behavior

### Mobile

- Semua grup tetap bertumpuk vertikal dengan jarak yang rapi.
- Field pasangan seperti jadwal akses ditumpuk penuh agar tidak sempit.
- Tidak ada elemen dekoratif berlebihan.

### Desktop

- Field tetap bisa memakai grid ringan selama hierarchy tetap jelas.
- Pasangan field boleh sejajar selama tidak membuat judul dan konteks kehilangan dominasi.

## Accessibility

- Semua input, select, dan textarea tetap memakai label eksplisit.
- Group heading baru harus membantu pembacaan screen reader, bukan hanya visual.
- Focus-visible input/select/textarea tetap jelas dan konsisten.
- Status autosave dan ringkasan durasi tetap terbaca tanpa menambah kebisingan visual.

## State

- Loading state editor tetap ada dengan makna yang sama.
- Error state editor tetap ada dengan makna yang sama.
- Empty/not found state editor tetap ada dengan makna yang sama.
- Save error tetap muncul jelas, tanpa mengubah validasi atau flow simpan.

## Dampak Testing

Test yang perlu disesuaikan akan mengunci:

- copy shell yang lebih ringkas bila berubah
- kehadiran intro atau heading grup metadata
- hierarchy baru pada area metadata
- posisi informasi autosave dan durasi yang tetap tersedia
- behavior autosave, restore draft, upload, dan save yang tetap sama

## File Yang Kemungkinan Tersentuh

- `src/pages/scheduled-ops/scheduled-event-editor-page.tsx`
- `src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx`
- komponen kecil pendukung hanya jika benar-benar perlu untuk menjaga konsistensi UI

## Non-Goals

- Tidak membangun ulang editor soal.
- Tidak menambah langkah wizard baru.
- Tidak mengubah behavior autosave.
- Tidak menyentuh daftar event, payment, atau subscription page pada batch ini.
