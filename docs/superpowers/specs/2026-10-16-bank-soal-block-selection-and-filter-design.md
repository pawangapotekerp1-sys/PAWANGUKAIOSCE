# Design Specification: Bank Soal Block Selection & Topic Filter Refinement

- **Date**: 2026-10-16
- **Status**: Approved
- **Scope**: Admin Question Bank (`/admin/questions`) & Mentor Question Bank (`/app/questions`)

---

## 1. Background & Problem Statement

Halaman Bank Soal saat ini langsung menampilkan seluruh daftar soal dari semua blok secara bersamaan. Halaman tersebut memiliki dua buah dropdown filter (*Blok* dan *Materi*). Pengguna menyampaikan beberapa kendala:
1. Memerlukan halaman seleksi awal sebelum masuk ke daftar soal yang membagi bank soal ke dalam 3 blok utama:
   - **Clinical Science**
   - **Pharmaceutical Science**
   - **Social Behavioural Administration of Pharmacy**
2. Memerlukan tombol/fitur **"Tambah Soal"** yang muncul di halaman pemilihan 3 blok tersebut.
3. Saat masuk ke dalam blok tertentu, daftar soal hanya boleh menampilkan soal milik blok tersebut, dan filter blok dihilangkan sehingga hanya menyisakan filter **Materi**.
4. Terjadi bug pada filter materi eksisting: ketika filter materi digunakan, soal yang tidak sesuai kategori filter masih muncul di bagian bawah.

---

## 2. Architecture & Navigation Strategy

### 2.1 URL Query Parameter Pattern (`?block=<slug>`)
Untuk menjaga performa, kompatibilitas URL, dan kemudahan navigasi (dukungan tombol *Back/Forward* browser):
- **Base Route**: `/admin/questions` (Admin) dan `/app/questions` (Mentor).
- **Kondisi 1 (Tanpa parameter `block`)**:
  Menampilkan **Halaman Pilihan Blok (Block Selection View)** yang berisi 3 kartu blok dan tombol **"Tambah Soal"**.
- **Kondisi 2 (Dengan parameter `block`)**:
  Menampilkan **Halaman Daftar Soal Per Blok (Block Question List View)** khusus untuk blok yang dipilih, lengkap dengan tombol kembali dan filter materi.

### 2.2 Definisi 3 Blok Standar
Untuk memastikan pencocokan data yang akurat dengan database (tabel `blocks`), 3 blok dipetakan sebagai berikut:
1. **Clinical Science**
   - Slug / Key: `clinical-science`
   - Matching patterns: `"Clinical Science"`
   - Ikon: `HeartPulse` / `Stethoscope`
   - Aksen: Teal / Cyan
   - Deskripsi: Farmakoterapi, evaluasi kasus klinis, interaksi obat, dan interpretasi laboratorium klinis.
2. **Pharmaceutical Science**
   - Slug / Key: `pharmaceutical-science`
   - Matching patterns: `"Pharmaceutical Science"`
   - Ikon: `FlaskConical` / `Pill`
   - Aksen: Indigo / Violet
   - Deskripsi: Formulasi teknologi sediaan padat/cair/steril, biofarmasetika, stabilitas, dan analisis farmasi.
3. **Social Behavioural Administration of Pharmacy**
   - Slug / Key: `social-behavioural-administration`
   - Matching patterns: `"Social Behavioural Administration of Pharmacy"`, `"Social, Behavioral & Administrative Pharmacy"`, `"Social Behavioural Administrative Pharmacy"`
   - Ikon: `Users` / `Scale`
   - Aksen: Amber / Orange
   - Deskripsi: Manajemen farmasi/apotek/RS, regulasi & perundang-undangan farmasi, farmakoekonomi, etika, dan komunikasi profesi.

---

## 3. UI/UX Specifications

### 3.1 Halaman Pemilihan Blok (Block Selection View)
Tampil ketika `!searchParams.get("block")`:
1. **Header Banner**:
   - Judul: `Bank Soal`
   - Deskripsi: `Pilih blok bidang farmasi untuk melihat, mengelola, menyunting, dan menyaring bank soal.`
   - Action Button: **"Tambah soal"** (mengarah ke `${basePath}/new` dengan tombol berdesain primer).
2. **3 Kartu Blok (Grid 3 Kolom)**:
   - Setiap kartu memiliki:
     - Ikon blok dengan background aksen warna khusus.
     - Judul blok yang tegas.
     - Deskripsi singkat materi yang dicakup.
     - Badge statistik jumlah soal: `X Soal Tersedia`.
     - Tombol / Link Navigasi: `"Buka Bank Soal" →` yang mengarahkan ke `?block=<slug>`.
   - Efek visual: Hover micro-interaction (`hover:-translate-y-1 hover:shadow-lg transition-all`).

### 3.2 Halaman Daftar Soal Per Blok (Block Question List View)
Tampil ketika `searchParams.get("block")` valid:
1. **Navigasi & Header**:
   - Tombol **"Kembali ke Pilihan Blok"** (`ArrowLeft`) yang menghapus parameter `?block` dan mengembalikan ke tampilan 3 kartu.
   - Judul Halaman: `Bank Soal: <Nama Blok>` disertai badge jumlah soal yang lolos saringan.
   - Tombol **"Tambah Soal"** (`${basePath}/new?block=<blockId/blockName>`).
2. **Control Bar & Filter**:
   - Filter *Blok* **dihilangkan**.
   - Filter *Materi* (`<select>`):
     - `Semua materi`: Menampilkan semua soal pada blok aktif.
     - `Tanpa materi`: Khusus menampilkan soal pada blok aktif yang belum memiliki relasi materi (`!question.topicName || !question.topicId`).
     - Opsi materi: Seluruh materi unik yang ada di blok aktif, diurutkan alfabetis A-Z.
3. **Banner Seleksi Massal**:
   - Menampilkan jumlah soal terpilih.
   - Tombol `Hapus terpilih` (destructive) dengan konfirmasi `ConfirmDialog`.
   - State `selectedQuestionIds` otomatis membersihkan ID soal yang tidak lagi masuk dalam kriteria filter materi aktif.
4. **Grid Kartu Soal**:
   - Menampilkan soal yang sesuai kriteria filter.
   - Badge status: *Draft* / *Published*.
   - Badge materi: `<Nama Materi>` atau `Tidak memiliki materi`.
   - Badge media pendukung: *Gambar soal*, *Pembahasan*, *Gambar pembahasan*.
   - Aksi: `Edit soal` dan `Hapus soal`.
   - Empty State: Menampilkan pesan peringatan informatif saat tidak ada soal yang cocok dengan filter materi.

---

## 4. Strict Filtering Logic & Bug Fix

### 4.1 Diagnosis Masalah Sebelumnya
Sebelumnya, filter materi rentan meloloskan soal yang tidak relevan ke bagian bawah daftar karena:
1. Normalisasi string yang tidak ketat terhadap trailing whitespace atau case sensitivity.
2. Penanganan soal yang tidak memiliki nilai materi (`null`/`undefined`) yang tidak terisolasi dari perbandingan filter spesifik.
3. Ketiadaan opsi terpisah untuk soal tanpa materi sehingga membuat daftar tidak konsisten.

### 4.2 Algoritma Filter Baru
```typescript
// 1. Isolasi soal pada blok aktif
const blockQuestions = useMemo(() => {
  if (!activeBlockSlug) return [];
  return (questionBankQuery.data ?? []).filter((question) => {
    return isQuestionInBlock(question, activeBlockSlug);
  });
}, [questionBankQuery.data, activeBlockSlug]);

// 2. Ekstraksi materi unik yang tersedia di blok aktif
const topicOptions = useMemo(() => {
  const topics = new Set<string>();
  blockQuestions.forEach((q) => {
    const trimmed = q.topicName?.trim();
    if (trimmed) topics.add(trimmed);
  });
  return Array.from(topics).sort((a, b) => a.localeCompare(b, "id-ID"));
}, [blockQuestions]);

const hasUnassignedTopics = useMemo(() => {
  return blockQuestions.some((q) => !q.topicName || !q.topicName.trim());
}, [blockQuestions]);

// 3. Penyaringan ketat materi
const filteredQuestions = useMemo(() => {
  return blockQuestions.filter((question) => {
    if (topicFilter === "all") return true;
    if (topicFilter === "unassigned") {
      return !question.topicName || !question.topicName.trim();
    }
    const qTopic = question.topicName?.trim().toLowerCase();
    const targetTopic = topicFilter.trim().toLowerCase();
    return qTopic === targetTopic;
  });
}, [blockQuestions, topicFilter]);
```

Dengan logika ini:
- Soal dari blok lain tidak akan pernah tampil.
- Soal dengan materi berbeda atau tanpa materi saat materi spesifik dipilih **100% disaring keluar** dan tidak akan muncul di bagian bawah.
- Soal tanpa materi dapat diakses secara khusus melalui opsi `Tanpa materi`.

---

## 5. Verification & Testing Plan

1. **Unit Tests (`questions-page.test.tsx`)**:
   - Memastikan tampilan awal `/admin/questions` dan `/app/questions` menampilkan 3 kartu pilihan blok dan tombol "Tambah soal".
   - Memastikan klik pada salah satu kartu blok membuka rute daftar soal blok tersebut (`?block=...`).
   - Memastikan tombol "Kembali ke Pilihan Blok" mengembalikan ke tampilan 3 kartu.
   - Memastikan dropdown materi hanya memuat materi dari blok aktif.
   - Memastikan pemilihan materi menyaring soal secara ketat (soal dari materi lain dan soal tanpa materi tidak ada di DOM / `not.toBeInTheDocument()`).
   - Memastikan opsi "Tanpa materi" berfungsi dengan benar.
2. **Router & Navigation Tests (`app-router.test.tsx`)**:
   - Memastikan kompatibilitas navigasi `/admin/questions` dan `/app/questions` tetap lulus tanpa regresi.
