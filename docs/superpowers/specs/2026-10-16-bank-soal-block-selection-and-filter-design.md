# Desain Sistem Bank Soal: Halaman Seleksi Blok & Filter Materi

## Ringkasan Eksekutif
Fitur ini mengubah alur masuk Bank Soal pada panel Admin (`/admin/questions`) dan Mentor (`/app/questions`). Saat pengguna mengakses Bank Soal, pengguna disajikan halaman perantara dengan 3 kartu pilihan blok farmasi:
1. **Clinical Science**
2. **Pharmaceutical Science**
3. **Social Behavioural Administration of Pharmacy**

Ketika sebuah blok dipilih, sistem menyajikan daftar soal yang telah diisolasi khusus untuk blok tersebut. Di dalam tampilan blok, dropdown filter hanya menyediakan penyaringan berdasarkan **Materi** (dilengkapi opsi khusus "Tanpa Materi" untuk soal *unassigned*), dan dropdown filter Blok ditiadakan. Filter materi diperketat dengan penanganan normalisasi teks dan penghapusan mutlak soal yang tidak cocok agar tidak ada soal luar materi yang muncul di bagian bawah.

---

## 1. Arsitektur & Navigasi

### 1.1 Pola Rute & State
Menggunakan pendekatan **URL Query Parameter State** di rute eksisting:
- **Halaman Pilihan Blok**:
  - URL Admin: `/admin/questions`
  - URL Mentor: `/app/questions`
  - Kondisi: Parameter `block` kosong / tidak ada.
- **Halaman Daftar Soal Per Blok**:
  - URL Admin: `/admin/questions?block=<slug>`
  - URL Mentor: `/app/questions?block=<slug>`
  - Contoh: `/admin/questions?block=clinical-science`
- **Navigasi Kembali**:
  - Tombol `← Kembali ke Pilihan Blok` menghapus parameter query `block` dari URL sehingga pengguna kembali ke halaman 3 kartu pilihan.
  - Mendukung riwayat browser (*Back/Forward*) dan *bookmarking*.

### 1.2 Definisi Tiga Blok Utama
Data blok didefinisikan dengan konfigurasi standar yang fleksibel untuk pencocokan nama di database:
1. **Clinical Science**
   - Slug: `clinical-science`
   - Alias nama database: `"Clinical Science"`
   - Deskripsi: Farmakoterapi, pemantauan terapi obat, evaluasi kasus klinis, dan interaksi obat.
   - Aksen Visual: Ikon `Stethoscope` / `HeartPulse`, tema aksen `teal` / `emerald`.
2. **Pharmaceutical Science**
   - Slug: `pharmaceutical-science`
   - Alias nama database: `"Pharmaceutical Science"`
   - Deskripsi: Teknologi sediaan cair/padat/steril, biofarmasetika, formulasi, dan stabilitas sediaan.
   - Aksen Visual: Ikon `FlaskConical` / `Pill`, tema aksen `indigo` / `blue`.
3. **Social Behavioural Administration of Pharmacy**
   - Slug: `social-behavioural-administration`
   - Alias nama database: `"Social Behavioural Administration of Pharmacy"`, `"Social, Behavioral & Administrative Pharmacy"`, `"Social Behavioural Administrative Pharmacy"`
   - Deskripsi: Regulasi farmasi, manajemen apotek/RS, farmakoekonomi, etika, dan komunikasi profesi.
   - Aksen Visual: Ikon `Users` / `Scale` / `FileSpreadsheet`, tema aksen `amber` / `orange`.

---

## 2. Rincian Komponen & Antarmuka Pengguna

### 2.1 Komponen Tampilan Pilihan Blok (`QuestionBlockSelection`)
- **Header**:
  - Judul: *Bank Soal*
  - Deskripsi: *Pilih blok bidang farmasi untuk melihat, mengelola, menyunting, dan menyaring bank soal.*
  - Tombol *Tambah Soal* (mengarah ke form tambah soal baru).
- **Grid Tiga Kartu Blok**:
  - Tata letak responsif `grid gap-6 md:grid-cols-3`.
  - Tiap kartu memuat:
    - Wadah ikon dengan warna tema blok.
    - Judul nama blok tebal.
    - Deskripsi ruang lingkup materi blok.
    - Badge hitungan total soal pada blok tersebut (dihitung dari query `listQuestionBank`).
    - Tombol aksi `Buka Bank Soal` dengan ikon panah.
  - Seluruh kartu dapat diklik untuk navigasi cepat.

### 2.2 Komponen Tampilan Daftar Soal Per Blok (`QuestionsList`)
- **Sub-Header Navigasi**:
  - Tombol `← Kembali ke Pilihan Blok` (varian `outline`, ukuran `sm`, posisi kiri atas).
  - Judul: `Bank Soal: <Nama Blok>` disertai badge penunjuk total soal aktif.
  - Tombol `Tambah Soal` di kanan atas (mengarah ke form tambah soal dengan query param `?block=<id_atau_slug>` jika didukung).
- **Control Bar Filter Materi**:
  - Dropdown filter Blok dihilangkan sepenuhnya.
  - Dropdown filter Materi:
    - Opsi 1: `Semua materi` (nilai: `"all"`).
    - Opsi 2 (Kondisional): `Tanpa materi` (nilai: `"unassigned"`, hanya muncul jika terdapat soal di blok aktif yang belum memiliki materi).
    - Opsi berikutnya: Daftar nama materi unik yang ada di dalam blok aktif, diurutkan A–Z.
- **Bar Status Seleksi Massal**:
  - Menampilkan jumlah soal terpilih jika ada centang aktif.
  - Tombol `Hapus terpilih` untuk menghapus banyak soal sekaligus.
- **Grid Kartu Soal**:
  - Kartu soal menampilkan cuplikan pertanyaan (*stem*), badge status (*Draft* / *Published*), badge materi, serta badge lampiran media (*Gambar soal*, *Pembahasan*, *Gambar pembahasan*).
  - Tombol aksi per soal: `Edit soal` dan `Hapus soal`.
- **Status Kosong (Empty State)**:
  - Jika tidak ada soal yang cocok dengan materi yang dipilih, tampilkan kartu alert peringatan: *"Tidak ada soal yang cocok dengan filter materi ini."*

---

## 3. Logika Filter Materi yang Ketat & Penyelesaian Bug

### 3.1 Normalisasi String
Untuk mencegah perbedaan spasi tersembunyi (*trailing spaces*), format karakter, atau huruf besar-kecil:
```typescript
function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}
```

### 3.2 Pencocokan Blok
Soal dikelompokkan ke dalam blok aktif dengan membandingkan nama blok yang sudah dinormalisasi terhadap nama blok target atau alias-aliasnya:
```typescript
const isBlockMatch = (questionBlockName: string | null | undefined, targetBlock: BlockDefinition) => {
  const norm = normalizeText(questionBlockName);
  return targetBlock.aliases.some((alias) => normalizeText(alias) === norm);
};
```

### 3.3 Penyaringan Materi Tanpa Kebocoran Data
```typescript
const filteredQuestions = useMemo(() => {
  return blockQuestions.filter((question) => {
    if (topicFilter === "all") {
      return true;
    }
    if (topicFilter === "unassigned") {
      return !question.topicName || question.topicName.trim() === "";
    }
    return normalizeText(question.topicName) === normalizeText(topicFilter);
  });
}, [blockQuestions, topicFilter]);
```
Dengan logika ini:
1. Tidak ada soal dari blok lain yang bisa masuk ke tampilan.
2. Saat materi spesifik dipilih, soal tanpa materi maupun soal dari materi lain dipastikan tereliminasi sepenuhnya (`false`), sehingga tidak ada soal nyasar yang muncul di bagian bawah.
3. Saat "Tanpa materi" dipilih, hanya soal yang benar-benar tidak memiliki materi yang muncul.

### 3.4 Sinkronisasi Checkbox Seleksi
```typescript
useEffect(() => {
  const visibleIds = new Set(filteredQuestions.map((q) => q.id));
  setSelectedQuestionIds((current) => current.filter((id) => visibleIds.has(id)));
}, [filteredQuestions]);
```

---

## 4. Rencana Pengujian (Testing Strategy)

### 4.1 Unit Test (`src/pages/admin/questions-page.test.tsx`)
1. **Render Halaman Pilihan Blok**:
   - Memastikan saat rute `/admin/questions` atau `/app/questions` dibuka tanpa query param, 3 card blok (Clinical Science, Pharmaceutical Science, Social Behavioural Administration of Pharmacy) dirender dengan benar.
   - Memastikan badge jumlah soal pada tiap kartu menampilkan angka yang akurat sesuai data mock.
2. **Navigasi Masuk ke Blok**:
   - Menyimulasikan klik pada card "Clinical Science".
   - Memastikan tampilan beralih ke daftar soal khusus Clinical Science dan tombol "Kembali ke Pilihan Blok" muncul.
3. **Penyaringan Materi yang Ketat**:
   - Memilih materi "Kardiologi".
   - Memastikan soal materi Kardiologi muncul.
   - Memastikan soal materi lain atau soal tanpa materi tidak ada di dokumen (`queryByText(...).not.toBeInTheDocument()`).
4. **Penyaringan Opsi "Tanpa Materi"**:
   - Memilih opsi "Tanpa materi".
   - Memastikan hanya soal dengan `topicName: null` yang muncul.
5. **Navigasi Kembali**:
   - Mengklik tombol "Kembali ke Pilihan Blok".
   - Memastikan tampilan kembali menampilkan 3 kartu pilihan blok.
