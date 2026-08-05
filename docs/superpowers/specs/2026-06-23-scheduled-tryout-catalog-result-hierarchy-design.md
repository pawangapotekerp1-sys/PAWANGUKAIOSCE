# Scheduled Tryout Catalog And Result Hierarchy Design

Date: 2026-06-23
Status: Draft for user review

## 1. Summary

Batch ini merapikan dua halaman student-facing pada lane `scheduled-tryout`:

- `scheduled-tryout-catalog-page`
- `scheduled-tryout-result-page`

Fokus utama batch adalah `alur aksi utama`, dengan keputusan produk yang sudah dikunci:

- katalog memakai hierarchy `resume-first`
- CTA event aktif baru memakai copy `Mulai sekarang`
- halaman hasil menjadikan `Review jawaban` sebagai aksi utama

Batch ini tidak mengubah backend, API, database, auth, routing utama, leaderboard behavior, session runtime, atau shared review behavior. Perubahan dibatasi pada hierarchy, copy, reading order, dan visual emphasis di dua halaman tersebut.

## 2. Problems Observed

### 2.1 Scheduled tryout catalog

- resume panel sudah ada, tetapi belum cukup dominan sebagai aksi pertama user
- kartu event aktif masih terasa setara satu sama lain
- CTA `Mulai sesi` masih generik dan belum terasa secepat konteks event aktif
- leaderboard dan action start masih punya bobot yang terlalu dekat
- metadata event cukup banyak dan belum cukup diarahkan ke keputusan utama

### 2.2 Scheduled tryout result

- hasil masih terasa seperti ringkasan pasif
- CTA `Buka pembahasan` belum benar-benar menjadi tindakan utama setelah submit
- detail pendukung seperti distribusi dan aksi sekunder masih bersaing dengan keputusan utama
- result page belum cukup konsisten dengan batch `tryout result` yang baru dirapikan

## 3. Goals

### Primary goals

- membuat katalog `scheduled-tryout` cepat terbaca sebagai: `lanjutkan dulu jika sudah mulai, kalau belum pilih event aktif`
- menjadikan `Mulai sekarang` CTA utama untuk event aktif yang belum dimulai
- menjadikan result page sebagai titik keputusan yang langsung mengarah ke `Review jawaban`
- menjaga konsistensi pola UX antara `tryout result` reguler dan `scheduled tryout result`
- mengurangi kompetisi visual antara aksi utama dan blok pendukung

### Non-goals

- mengubah cara event aktif dihitung
- mengubah remaining attempt logic
- mengubah resume session behavior
- mengubah leaderboard event logic
- mengubah review source handling `?source=scheduled`
- merombak `scheduled-tryout-session-page`

## 4. Scope

### In scope

- hierarchy katalog `scheduled-tryout`
- hierarchy hasil `scheduled-tryout`
- CTA copy untuk event aktif baru
- CTA hierarchy pada result page
- DOM order dan reading order yang mendukung aksi utama
- loading, empty, error, dan resume state di dua halaman
- responsive hierarchy mobile/desktop pada dua halaman target

### Out of scope

- `scheduled-tryout-session-page`
- `scheduled-tryout-leaderboard-page` behavior
- `scheduled-tryout-api`
- mapper domain scheduled tryout
- shared review page
- analytics

## 5. Product Decisions Locked

- jika ada attempt aktif atau paused, katalog harus memprioritaskan `resume hero`
- event aktif baru tetap terlihat, tetapi berada di bawah resume hero sebagai pilihan kedua
- CTA utama kartu event aktif baru adalah `Mulai sekarang`
- CTA leaderboard di katalog tetap ada, tetapi harus lebih tenang daripada CTA mulai
- halaman hasil harus memprioritaskan `Review jawaban`
- CTA leaderboard pada halaman hasil tetap sekunder
- perubahan batch ini harus tetap aman terhadap state loading, empty, error, dan disabled attempt

## 6. Recommended Approach

Gunakan pendekatan `flow-first minimal`.

Artinya:

- katalog tidak dirombak menjadi wizard atau tab baru
- result page tidak diubah menjadi halaman data yang lebih kompleks
- fokus hanya pada perubahan hierarchy yang langsung mempengaruhi keputusan user

Alur yang diinginkan:

1. user membuka katalog scheduled tryout
2. jika ada attempt aktif/paused, user langsung melihat `Lanjutkan`
3. jika tidak ada resume, user langsung melihat event aktif dan CTA `Mulai sekarang`
4. setelah submit, user mendarat ke hasil
5. hasil menempatkan `Review jawaban` sebagai next step utama

## 7. Scheduled Tryout Catalog

### 7.1 Role of the page

Halaman katalog harus menjawab dua pertanyaan dengan cepat:

- apakah saya harus lanjutkan sesi lama?
- kalau tidak, event mana yang bisa saya mulai sekarang?

### 7.2 New hierarchy

Urutan baca yang diinginkan:

1. page heading singkat
2. `resume hero` jika ada attempt aktif/paused
3. daftar event aktif yang bisa dimulai
4. metadata pendukung event
5. CTA sekunder seperti leaderboard

### 7.3 Resume-first behavior

Jika `activeAttempt` ada:

- panel resume menjadi blok paling dominan di halaman
- CTA `Lanjutkan sesi` tetap primary
- event cards turun menjadi pilihan berikutnya
- copy resume harus menegaskan bahwa user bisa melanjutkan tanpa mulai ulang
- batch ini mengikuti kontrak API saat ini yang hanya mengembalikan satu `activeAttempt`
- batch ini tidak menambah client-side arbitration untuk banyak active attempt; jika backend suatu saat mengirim lebih dari satu, halaman tetap hanya mengikuti satu `activeAttempt` yang diberikan oleh contract saat ini
- event yang sama dengan `activeAttempt.eventId` tidak ditampilkan lagi sebagai kartu event aktif di bawah resume hero, agar tidak muncul CTA `Mulai sekarang` yang bersaing dengan `Lanjutkan sesi`

Jika `activeAttempt` tidak ada:

- event aktif baru menjadi fokus utama halaman
- tidak ada placeholder besar untuk resume

### 7.4 Event card direction

Setiap kartu event aktif tetap memuat:

- subtitle/status event
- title
- deskripsi ringkas
- jumlah soal
- durasi
- sisa attempt
- jendela aktif
- CTA leaderboard

Namun hierarchy-nya diubah sehingga:

- title dan `Mulai sekarang` lebih cepat terbaca daripada metadata lain
- metadata tetap ada, tetapi lebih ringkas dan tidak terasa setara dengan aksi utama
- `Lihat leaderboard` tetap tersedia sebagai aksi sekunder

### 7.5 CTA changes

Untuk event aktif yang masih bisa dimulai:

- ubah label CTA utama dari `Mulai sesi` menjadi `Mulai sekarang`
- tetap gunakan route target yang sama
- tetap gunakan variant primary

Untuk event yang attempt-nya habis:

- tombol disabled tetap ada
- explanation copy tetap ada
- leaderboard link tetap dapat diakses

Urutan event aktif yang tersisa setelah filtering resume:

- batch ini tidak mengubah urutan data dari source katalog
- perubahan hanya pada hierarchy visual dan filtering kartu yang identik dengan `activeAttempt.eventId`

### 7.6 Mobile direction

Pada mobile:

- resume hero harus terbaca penuh tanpa terasa menumpuk
- kartu event tidak boleh terasa seperti daftar badge yang rapat
- CTA `Mulai sekarang` harus tetap mudah ditemukan tanpa scroll visual panjang di dalam satu kartu

## 8. Scheduled Tryout Result

### 8.1 Role of the page

Halaman hasil menjadi titik keputusan utama setelah submit, bukan sekadar rekap skor.

Pertanyaan yang harus dijawab halaman:

- hasil saya bagaimana?
- tindakan terbaik setelah ini apa?

### 8.2 New hierarchy

Urutan baca yang diinginkan:

1. status event selesai
2. skor akhir
3. ringkasan hasil singkat
4. CTA utama `Review jawaban`
5. detail pendukung seperti benar/salah, waktu, distribusi blok
6. CTA sekunder seperti leaderboard event

### 8.3 Result hero direction

Blok hero hasil harus memuat:

- status pill bahwa event selesai
- skor akhir sebagai anchor utama
- ringkasan hasil singkat
- CTA `Review jawaban`

Jika insight tambahan ditampilkan, insight itu harus tetap singkat dan mendukung CTA review, bukan menjadi paragraf panjang.

### 8.4 CTA hierarchy

CTA utama:

- `Review jawaban`
- tetap menuju `/app/review/:attemptId?source=scheduled`
- tetap memakai variant primary

CTA sekunder:

- `Lihat leaderboard`
- tetap muncul hanya jika `eventId` tersedia
- tetap memakai variant outline

Leaderboard tidak boleh mengalahkan review sebagai next step utama.

### 8.5 Supporting detail treatment

Detail berikut wajib tetap ada:

- jawaban benar
- waktu terpakai
- distribusi hasil

Namun blok-blok ini harus menjadi informasi sekunder:

- muncul setelah hero dalam DOM/read order
- tidak memecah fokus user sebelum CTA review
- copy pendukung dibuat ringkas

## 9. State Requirements

### 9.1 Catalog states

State yang harus tetap aman:

- loading daftar event
- error daftar event
- empty ketika belum ada event aktif
- resume attempt aktif/paused
- event aktif dengan attempt tersedia
- event aktif dengan attempt habis

Matrix state katalog:

- loading
  - tampilkan heading halaman
  - jangan tampilkan resume hero
  - tampilkan state panel loading
- error
  - tampilkan heading halaman
  - jangan tampilkan grid event
  - tampilkan state panel error
- empty tanpa resume
  - tampilkan heading halaman
  - tampilkan state panel empty
- resume only
  - tampilkan resume hero
  - jika setelah filtering tidak ada event aktif lain, jangan paksa grid event kosong kedua
- resume + event aktif lain
  - tampilkan resume hero lebih dulu
  - tampilkan grid event aktif lain di bawahnya
- event aktif tanpa resume
  - jangan tampilkan resume hero
  - tampilkan grid event aktif
- event aktif dengan attempt habis
  - kartu tetap tampil
  - CTA start disabled
  - leaderboard link tetap aktif

### 9.2 Result states

State yang harus tetap aman:

- empty jika belum ada `attempt`
- loading hasil
- error hasil
- empty jika hasil tidak tersedia
- success hasil dengan CTA review

Matrix state hasil:

- empty karena query param `attempt` tidak ada
  - tampilkan heading halaman
  - tampilkan empty state yang mengarahkan user memilih hasil dari riwayat
  - jangan tampilkan result hero
- loading
  - tampilkan heading halaman
  - tampilkan loading state
  - jangan tampilkan result hero
- error
  - tampilkan heading halaman
  - tampilkan error state
  - jangan tampilkan CTA review atau leaderboard
- empty karena `attempt` ada tetapi hasil tidak tersedia
  - tampilkan heading halaman
  - tampilkan empty state yang menjelaskan hasil sesi belum tersedia
  - jangan tampilkan result hero
- success
  - tampilkan result hero
  - tampilkan CTA utama `Review jawaban`
  - tampilkan detail pendukung setelah hero
  - tampilkan leaderboard hanya sebagai CTA sekunder dan hanya bila `eventId` tersedia

## 10. Accessibility And Interaction Notes

- DOM order harus mengikuti hierarchy visual di katalog dan hasil
- CTA utama harus tetap jelas saat keyboard focus
- tombol disabled event tetap terbaca alasan disabled-nya
- heading order tetap semantik
- link sekunder seperti leaderboard tetap tersedia tanpa mengambil prioritas utama

## 11. File Scope

File utama yang direncanakan berubah:

- `src/pages/app/scheduled-tryout-catalog-page.tsx`
- `src/pages/app/scheduled-tryout-catalog-page.test.tsx`
- `src/pages/app/scheduled-tryout-result-page.tsx`
- `src/pages/app/scheduled-tryout-result-page.test.tsx`

File yang boleh disentuh hanya bila expectation route-level perlu disesuaikan:

- `src/router/app-router.test.tsx`

Boundary implementasi:

- default pendekatan batch ini adalah page-composition only
- shared UI primitives seperti `SectionHeading`, `SurfacePanel`, `MetricPill`, dan `Button` tidak menjadi target redesign batch ini
- shared component hanya boleh disentuh bila ada kebutuhan kecil yang langsung mendukung hierarchy atau accessibility batch ini tanpa mengubah behavior global
- bila perubahan dapat dicapai di level halaman, itu harus dipilih daripada memodifikasi primitive bersama

Unit yang direncanakan jelas:

- `resume hero`
  - tanggung jawab: menampilkan satu active attempt yang harus dilanjutkan lebih dulu
- `scheduled event card`
  - tanggung jawab: menampilkan satu event aktif yang bisa dimulai sekarang atau sudah habis attempt-nya
- `scheduled result hero`
  - tanggung jawab: menampilkan skor, ringkasan hasil, dan CTA utama `Review jawaban`
- `scheduled result supporting detail`
  - tanggung jawab: menampilkan benar/salah, waktu, distribusi hasil, dan leaderboard sekunder

## 12. Testing Direction

### 12.1 Catalog contract

Test baru atau yang diperbarui harus mengunci:

- jika ada resume attempt, panel resume muncul sebelum daftar event aktif
- CTA `Lanjutkan sesi` tetap primary dan target route tetap sama
- CTA event aktif baru berubah menjadi `Mulai sekarang`
- CTA leaderboard tetap outline/sekunder
- event disabled tetap menampilkan alasan attempt habis
- loading, error, empty tetap stabil

### 12.2 Result contract

Test baru atau yang diperbarui harus mengunci:

- result hero memuat skor dan CTA utama `Review jawaban`
- CTA `Review jawaban` tetap primary dan target route scheduled review tetap sama
- CTA review muncul sebelum detail pendukung dalam DOM order
- leaderboard tetap sekunder
- loading, error, dan empty tetap stabil

## 13. Completion Criteria

Batch ini dianggap selesai jika:

- katalog `scheduled-tryout` jelas memakai hierarchy `resume-first`
- CTA event aktif baru menjadi `Mulai sekarang`
- result page `scheduled-tryout` menjadikan `Review jawaban` sebagai aksi utama
- leaderboard tetap aksi sekunder di katalog dan hasil
- state loading, empty, error, resume, dan disabled tetap aman
- tidak ada perubahan API, auth, session runtime, leaderboard behavior, atau routing utama
