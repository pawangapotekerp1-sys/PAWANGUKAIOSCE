# Scheduled Event Editor Question Cards UI Design

**Date:** 2026-06-23
**Scope:** `scheduled-event-editor-page.tsx` pada area card soal per pertanyaan
**Status:** Draft untuk review user

## Tujuan

Merapikan card soal pada editor event terjadwal agar urutan isi lebih jelas, hierarchy visual lebih kuat, dan proses authoring terasa lebih terarah tanpa mengubah autosave, upload media, API, routing, atau behavior `Tambah soal` yang sudah ada.

## Masalah Yang Ingin Diselesaikan

- Semua elemen di dalam card soal terasa setara, sehingga urutan pengisian tidak jelas.
- Area stem, media, opsi, kunci jawaban, dan pembahasan terasa seperti kumpulan field, bukan alur kerja.
- Kunci jawaban terasa terpisah dari grup opsi.
- Media pertanyaan dan media pembahasan menambah beban visual pada card.
- Footer action pada card terakhir bercampur dengan isi form.

## Batas Scope

### Masuk scope

- Menyusun ulang hierarchy card soal berdasarkan urutan kerja nyata.
- Mengelompokkan opsi jawaban dan kunci jawaban dalam satu area yang konsisten.
- Menurunkan bobot visual area media agar tetap ada tetapi tidak mengganggu fokus utama.
- Memisahkan pembahasan menjadi section penutup card.
- Menata ulang footer action card terakhir tanpa mengubah logic.
- Menyesuaikan test editor yang terdampak.

### Tidak masuk scope

- Perubahan metadata atas editor.
- Perubahan autosave logic.
- Perubahan upload media logic.
- Perubahan create/update API.
- Perubahan draft recovery behavior.
- Perubahan pola interaksi seperti accordion, wizard, atau collapsible sections.

## Pendekatan Desain

Pendekatan yang dipilih adalah `reading-order first card`.

Setiap card soal dibaca sesuai urutan kerja:

1. Pahami stem soal.
2. Tinjau atau tambahkan media pertanyaan jika perlu.
3. Isi opsi jawaban.
4. Tentukan kunci jawaban.
5. Tulis pembahasan.
6. Tambahkan media pembahasan jika perlu.
7. Gunakan footer action di card terakhir.

Pendekatan ini dipilih karena langsung menjawab masalah inti: elemen saat ini hadir dengan bobot yang terlalu setara dan tidak membimbing urutan pengisian.

## Struktur Card Soal Yang Diusulkan

### 1. Header card

Bagian atas card tetap berisi:

- `Soal N` sebagai heading utama
- indikator kunci jawaban sebagai badge pendukung

Header harus tetap ringan. Badge kunci tidak boleh mengalahkan heading card.

### 2. Blok inti soal

Blok ini menjadi area paling dominan:

- `Pertanyaan N` sebagai field utama
- textarea stem dengan ruang napas paling besar

Ini adalah titik masuk utama setiap card.

### 3. Media pertanyaan

Area `Gambar pertanyaan` tetap diletakkan langsung setelah stem agar relasinya jelas, tetapi tampilannya dibuat lebih tenang:

- tetap ada nama file
- tetap ada uploader
- preview tetap ada bila tersedia
- visualnya tidak boleh lebih kuat dari stem

### 4. Blok jawaban

Semua opsi jawaban dikelompokkan sebagai satu section:

- opsi `A-E` tampil sebagai grup jawaban
- `Kunci jawaban` menjadi bagian penutup area jawaban, bukan blok terpisah

Tujuannya agar keputusan tentang jawaban benar terasa menyatu dengan pengisian opsi.

### 5. Blok pembahasan

Setelah jawaban selesai, card masuk ke area pembahasan:

- textarea `Pembahasan`
- `Gambar pembahasan` setelahnya sebagai lampiran pendukung

Urutan ini membuat pembahasan terasa sebagai langkah penjelasan akhir, bukan bagian yang bersaing dengan stem.

### 6. Footer action

Hanya card terakhir yang menampilkan area footer action:

- `Tambah soal`

Footer ini harus terasa sebagai area aksi yang terpisah dari isi soal.

## Hierarchy Visual Yang Diusulkan

### Prioritas utama

- heading `Soal N`
- stem pertanyaan

### Prioritas menengah

- grup opsi jawaban
- kunci jawaban

### Prioritas pendukung

- media pertanyaan
- pembahasan
- media pembahasan
- footer action

## Responsive Behavior

### Mobile

- Struktur tetap sepenuhnya vertikal.
- Opsi tetap dikelompokkan rapi tanpa mencoba terlalu padat.
- Area media tetap hadir, tetapi tidak menambah blok visual yang terlalu berat.

### Desktop

- Opsi boleh tetap memakai grid yang ada bila masih mudah dipindai.
- Kunci jawaban tetap dekat dengan opsi, bukan terdorong terlalu jauh ke bawah tanpa konteks.

## Accessibility

- Semua label field tetap dipertahankan.
- Heading `Soal N` tetap eksplisit untuk screen reader.
- Urutan DOM harus tetap mengikuti urutan baca yang logis.
- Input file, textarea, select, dan input opsi tetap keyboard accessible.
- Perubahan visual tidak boleh memutus relasi antara label dan field.

## State

- Autosave status behavior tetap sama.
- Upload media behavior tetap sama.
- Save error tetap sama.
- `Tambah soal` tetap hanya muncul pada card terakhir.

## Dampak Testing

Test yang perlu disesuaikan akan mengunci:

- hierarchy baru di area card soal
- keberadaan heading dan grouping yang lebih jelas
- posisi area media pertanyaan setelah stem
- posisi kunci jawaban yang tetap berada di grup jawaban
- footer action terakhir yang tetap benar
- seluruh behavior autosave, restore, upload, dan save tetap sama

## File Yang Kemungkinan Tersentuh

- `src/pages/scheduled-ops/scheduled-event-editor-page.tsx`
- `src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx`

## Non-Goals

- Tidak membangun ulang editor menjadi wizard.
- Tidak menyembunyikan section dengan accordion atau collapse.
- Tidak mengubah payload atau state persistence.
- Tidak menyentuh scheduled events list, payment, atau subscription page.
