# Tryout Result And Review Hierarchy Design

## Ringkasan

Batch ini merapikan `tryout-result-page` dan `review-page` sebagai satu alur belajar inti setelah user submit tryout. Arah yang dipilih adalah `hasil dulu, lalu CTA utama ke review`, sehingga halaman hasil menjadi halaman keputusan utama, sementara halaman review menjadi langkah tindak lanjut yang lebih jelas dan lebih mudah dibaca.

Perubahan hanya menyentuh hierarchy, CTA emphasis, density, dan reading order di dua halaman student flow ini. Tidak ada perubahan pada logic scoring, submit attempt, contract API, mapper data, atau route target utama.

## Masalah Saat Ini

- `tryout-result-page` masih terasa seperti halaman ringkasan pasif.
- Skor, insight, dan CTA ke review belum membentuk hierarchy keputusan yang kuat.
- Blok detail hasil masih cukup setara dengan aksi utama setelah submit.
- `review-page` detail sudah informatif, tetapi hierarchy pertanyaan, jawaban user, jawaban benar, dan pembahasan masih bisa dibuat lebih terarah.
- `review-page` history masih terasa seperti daftar arsip biasa, belum cukup mendukung transisi dari result page.

## Tujuan

- Menjadikan `tryout-result-page` sebagai halaman keputusan utama setelah submit.
- Menjadikan `Review jawaban` aksi paling dominan di result page.
- Menegaskan insight utama dan blok terlemah sebagai alasan untuk lanjut review.
- Menjadikan `review-page` lebih mudah dipakai untuk membaca kesalahan dan pembahasan.
- Menjaga peran `review-page` sebagai langkah lanjutan, bukan halaman yang bersaing dengan result page.

## Di Luar Scope

- Mengubah API `getAttemptResultPageData`
- Mengubah API `listReviewHistory` atau `getReviewDetailData`
- Mengubah scoring, submit flow, atau mapper tryout/review
- Mengubah route target utama ke `/app/review/:attemptId`
- Mengubah scheduled result/review pages
- Mengubah subscription, payments, atau area admin

## Arah Flow Baru

Urutan pengalaman yang diinginkan:

1. User submit tryout.
2. User mendarat di `tryout-result-page`.
3. Halaman hasil menampilkan skor akhir, insight utama, dan CTA paling kuat ke `Review jawaban`.
4. User membuka `review-page` sebagai tindak lanjut paling logis.
5. `review-page` membantu user memahami soal salah lebih cepat lewat hierarchy baca yang lebih jelas.

## Tryout Result Page

### Peran Halaman

`tryout-result-page` menjadi halaman keputusan utama setelah submit, bukan hanya halaman informasi.

Artinya halaman harus memandu user menjawab pertanyaan:

- hasil saya bagaimana?
- area mana yang paling menahan hasil?
- tindakan terbaik setelah ini apa?

### Hierarchy Baru

Urutan baca halaman hasil:

1. skor akhir
2. insight utama / status performa
3. CTA utama `Review jawaban`
4. detail pendukung seperti benar-salah, waktu, dan distribusi blok
5. aksi sekunder seperti kembali latihan

### Hero Result

Blok hasil utama tetap memuat:

- status sesi selesai
- skor akhir
- ringkasan hasil

Namun blok ini harus lebih tegas dalam dua hal:

- skor menjadi anchor visual utama
- narasi ringkas menjelaskan kenapa review perlu dibuka

### CTA Hierarchy

CTA utama result page:

- `Review jawaban`

CTA ini menggantikan peran `Buka pembahasan` sebagai aksi dominan secara UX, walaupun route target tetap sama ke review attempt detail.

CTA sekunder boleh tetap ada, tetapi bobotnya harus lebih tenang daripada CTA review.

### Supporting Blocks

Detail seperti:

- jawaban benar
- waktu terpakai
- distribusi hasil per blok

tetap dipertahankan, tetapi tidak boleh mengalahkan skor utama dan CTA review.

### Insight Direction

Halaman hasil harus membantu user melihat area prioritas, misalnya:

- blok dengan salah terbanyak
- area yang paling menahan skor
- dorongan untuk lanjut review

Insight ini harus singkat dan operasional, bukan paragraf panjang.
Insight hanya boleh memakai data yang sudah tersedia di payload hasil atau yang sudah bisa diturunkan dari UI saat ini. Batch ini tidak boleh menambah ranking logic baru, mapper baru, atau query baru hanya untuk menghasilkan insight. Jika data yang ada tidak cukup untuk menyebut blok terlemah secara eksplisit, gunakan fallback copy yang tetap mendorong user membuka review tanpa membuat klaim analitik baru.

## Review Page

### Peran Halaman

`review-page` menjadi langkah tindak lanjut setelah result page. Halaman ini harus terasa seperti tempat memahami kesalahan, bukan sekadar daftar data.

### Review History

List mode (`/app/review`) tetap dipertahankan sebagai route yang ada sekarang, tetapi bukan fokus redesign utama batch ini. Perubahan di history list hanya boleh berupa penyesuaian ringan jika diperlukan untuk menjaga konsistensi visual dasar atau kontrak test, bukan perombakan hierarchy besar.

Fokus redesign review pada batch ini adalah `review detail` yang dibuka dari result page.

### Review Detail Hierarchy

Urutan baca tiap item review:

1. pertanyaan
2. status benar/salah
3. jawaban user
4. jawaban benar
5. pembahasan
6. media pembahasan bila ada

Tujuannya agar user cepat menangkap:

- soal mana yang salah
- apa jawaban yang dipilih
- apa jawaban yang benar
- kenapa jawabannya demikian

### Wrong-Only Filter

Filter `Hanya jawaban salah` tetap dipertahankan. Secara UX, filter ini harus tetap terasa ringan dan mendukung, bukan mengambil alih hierarchy halaman.

### Visual Weight

`review-page` harus lebih readable daripada dramatic.

Artinya:

- pertanyaan dan status item perlu jelas
- blok jawaban user dan jawaban benar harus mudah dibandingkan
- pembahasan harus terasa sebagai blok penjelas penutup
- section antar item tidak boleh terlalu padat

## Hubungan Result Page Dan Review Page

Karakter dua halaman harus dibedakan:

- `tryout-result-page`: decisive, ringkas, mendorong aksi
- `review-page`: readable, terstruktur, mendukung pemahaman

Keduanya tidak boleh punya bobot visual yang sama atau fungsi yang terasa tumpang tindih.

## Accessibility dan Interaction Notes

- CTA utama di result page harus tetap jelas secara keyboard-focus dan visual emphasis.
- Heading order harus tetap semantik di kedua halaman.
- Reading order DOM harus mengikuti hierarchy visual.
- Status benar/salah harus tetap terbaca jelas tanpa bergantung pada warna saja.
- Filter checkbox di review detail tetap keyboard accessible.

## File Scope

File utama yang direncanakan berubah:

- `src/pages/app/tryout-result-page.tsx`
- `src/pages/app/tryout-result-page.test.tsx`
- `src/pages/app/review-page.tsx`
- `src/pages/app/review-page.test.tsx`

File yang boleh disentuh bila route-level expectation perlu disesuaikan:

- `src/router/app-router.test.tsx`

## Strategi Testing

Kontrak test baru harus mengunci hal-hal berikut:

### Result Page

- skor akhir tetap menjadi anchor utama
- tepat satu CTA primary mengarah ke review attempt
- CTA utama ke review tetap menuju attempt yang benar
- CTA primary review muncul di atas blok detail pendukung
- hierarchy baru menonjolkan review sebagai next action utama tanpa mengubah route target
- loading, error, dan empty state tetap tidak berubah secara behavior

### Review Page

- history tetap memuat sesi tryout dan scheduled sesuai source-nya, tetapi tidak menjadi target redesign besar
- detail review tetap mempertahankan filter wrong-only dengan behavior query/filter yang sama
- hierarchy item review menegaskan pertanyaan, jawaban user, jawaban benar, lalu pembahasan
- selected attempt target dan source scheduled tetap tidak berubah
- loading, error, dan empty state tetap stabil

## Kriteria Selesai

Batch ini dianggap selesai jika:

- `tryout-result-page` memiliki satu CTA primary ke review yang paling jelas
- CTA review tetap berada di area utama hasil, bukan turun ke blok detail pendukung
- `review-page` detail memiliki urutan baca yang jelas: pertanyaan, jawaban user, jawaban benar, lalu pembahasan
- filter wrong-only dan target attempt/source tetap tidak berubah
- tidak ada perubahan logic scoring, API, atau routing utama
- test terkait pass
- build produksi tetap hijau
