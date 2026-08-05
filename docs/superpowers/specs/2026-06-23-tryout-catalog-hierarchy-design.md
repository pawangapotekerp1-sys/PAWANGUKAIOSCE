# Tryout Catalog Hierarchy Design

## Ringkasan

Batch ini merapikan `tryout-catalog-page` agar user lebih cepat memahami jalur utama untuk mulai latihan. Arah yang dipilih adalah `hero-first catalog` dengan prioritas tertinggi pada `resume banner` ketika sesi aktif masih ada, lalu menonjolkan `Simulasi penuh` sebagai entry point utama untuk memulai tryout baru.

Perubahan hanya menyentuh hierarchy, CTA emphasis, dan density visual halaman katalog reguler. Tidak ada perubahan pada API, mapper, routing sesi, business logic, atau halaman scheduled catalog.

## Masalah Saat Ini

- Semua kelompok katalog masih terasa terlalu setara.
- `Simulasi penuh`, `per blok`, dan `per materi` belum membentuk prioritas yang jelas.
- CTA `Mulai sesi` konsisten, tetapi belum cukup diarahkan oleh hierarchy halaman.
- Saat user punya sesi aktif, banner lanjutkan sesi sudah benar secara fungsi, tetapi perlu dipertahankan sebagai prioritas tertinggi agar user tidak salah memulai sesi baru.

## Tujuan

- Menjadikan `resume banner` elemen paling dominan ketika sesi aktif tersedia.
- Menjadikan `Simulasi penuh` jalur utama untuk memulai tryout baru.
- Menurunkan bobot visual kartu `per blok` dan `per materi` tanpa menghilangkan aksesnya.
- Membuat halaman lebih mudah dipindai di mobile dan desktop.
- Mempertahankan copy CTA utama `Mulai sesi` agar perilaku tetap familiar.

## Di Luar Scope

- Mengubah `scheduled-tryout-catalog-page`
- Mengubah `listTryoutCatalogEntries`
- Mengubah `findActiveAttemptForUser`
- Mengubah `groupTemplatesForCatalog`
- Mengubah target route sesi
- Menambah flow detail page baru
- Mengubah subscription, payments, atau halaman admin

## Struktur Halaman Baru

Urutan baca halaman:

1. `Banner lanjutkan sesi` jika user punya sesi aktif
2. `Hero katalog`
3. `Featured card` untuk `Simulasi penuh`
4. Grup `Try out per blok`
5. Grup `Try out per materi`

### 1. Resume Banner Tetap Paling Atas

Jika `activeAttempt` ada, banner ini tetap menjadi blok pertama di halaman. Alasannya fungsional: user yang sudah memulai sesi harus didorong untuk melanjutkan sesi berjalan, bukan mulai ulang dari katalog.

Banner tetap memakai treatment accent yang kuat, memuat:

- status sesi (`paused` atau masih berjalan)
- judul sesi aktif
- konteks mode sesi
- progres jawaban
- sisa waktu
- CTA utama `Lanjutkan sesi`

Tidak ada CTA baru lain di banner.

### 2. Hero Katalog Menjadi Pengarah Halaman

Setelah resume banner, halaman menampilkan hero katalog yang lebih jelas daripada versi sekarang. Hero ini bukan kartu tryout, tetapi pengarah singkat yang memberi konteks:

- user bisa memilih simulasi penuh, blok, atau materi
- jalur yang paling disarankan adalah mulai dari simulasi penuh

Hero harus ringkas. Tujuannya memberi hierarchy, bukan menambah copy panjang.

### 3. Simulasi Penuh Menjadi Featured Entry Point

`Simulasi penuh` dipisahkan secara visual dari grup lain dan ditampilkan sebagai featured card utama. Featured card ini harus terasa lebih penting lewat:

- ruang lebih lapang
- treatment background lebih kuat
- posisi langsung setelah hero
- CTA `Mulai sesi` yang jelas dan langsung terlihat

Yang berubah hanya presentasi. Struktur data, label, dan target route tetap sama.

### 4. Try Out Per Blok Menjadi Pilihan Sekunder

Grup `per blok` tetap penting, tetapi posisinya turun setelah `Simulasi penuh`. Kartu-kartunya tetap memakai grid reguler dan CTA `Mulai sesi`, namun bobot visualnya lebih tenang daripada featured card.

Tujuannya:

- tetap mudah dipilih bila user ingin fokus
- tidak bersaing dengan entry point utama

### 5. Try Out Per Materi Menjadi Pilihan Paling Granular

`Per materi` tetap digrup berdasarkan blok, tetapi harus menjadi area paling ringan secara visual. Heading grup per blok tetap ada agar orientasi konten tetap jelas, namun section ini tidak boleh terasa lebih dominan daripada `Simulasi penuh` atau `per blok`.

## Hierarchy CTA

Urutan CTA saat sesi aktif ada:

1. `Lanjutkan sesi`
2. `Mulai sesi` pada featured `Simulasi penuh`
3. `Mulai sesi` pada kartu `per blok`
4. `Mulai sesi` pada kartu `per materi`

Urutan CTA saat tidak ada sesi aktif:

1. `Mulai sesi` pada featured `Simulasi penuh`
2. `Mulai sesi` pada kartu `per blok`
3. `Mulai sesi` pada kartu `per materi`

Copy CTA tidak perlu diganti-ganti. Hierarchy dibentuk melalui urutan dan treatment visual, bukan label yang berbeda-beda.

## Arah Visual

### Featured vs Supporting

Halaman perlu membedakan tiga level bobot visual:

- `Primary`: resume banner, featured full simulation
- `Secondary`: block-based tryout cards
- `Supporting`: topic-based tryout cards

Pembeda utamanya:

- ukuran heading
- padding
- background treatment
- jarak antar section

### Density

Halaman perlu dibuat lebih ringan, terutama di mobile:

- featured card tidak boleh terlalu tinggi
- grid kartu blok harus tetap mudah discan
- daftar materi tidak boleh terasa seperti dinding kartu
- copy deskriptif per section perlu dijaga pendek

## Accessibility dan Interaction Notes

- CTA utama harus tetap mudah dibedakan secara visual dan keyboard-focus.
- Reading order DOM harus tetap mengikuti hierarchy visual.
- Heading section harus tetap semantik dan berurutan.
- Disabled state `Mulai sesi` tetap dipertahankan ketika sesi tidak startable.

## File Scope

File utama yang direncanakan berubah:

- `src/pages/app/tryout-catalog-page.tsx`
- `src/pages/app/tryout-catalog-page.test.tsx`

File yang boleh disentuh bila kontrak route-level perlu disesuaikan:

- `src/router/app-router.test.tsx`

## Strategi Testing

Kontrak test baru harus mengunci hal-hal berikut:

- resume banner tetap tampil paling atas saat ada sesi aktif
- featured `Simulasi penuh` muncul sebelum grup lain
- CTA `Lanjutkan sesi` tetap menjadi aksi utama untuk sesi aktif
- CTA `Mulai sesi` pada featured card tetap tersedia dan startable seperti sebelumnya
- state loading, error, dan empty tetap tidak berubah secara behavior

## Kriteria Selesai

Batch ini dianggap selesai jika:

- hierarchy halaman baru sudah terasa jelas di UI
- tidak ada perubahan logic data atau routing
- test halaman terkait pass
- build produksi tetap hijau
