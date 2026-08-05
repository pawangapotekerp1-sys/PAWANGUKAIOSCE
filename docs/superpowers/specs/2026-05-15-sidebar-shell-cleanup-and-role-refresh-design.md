# Sidebar Shell Cleanup and Role Refresh Design

## 1. Goal

Rapikan shell aplikasi agar lebih fokus ke navigasi inti, terasa lebih penuh di desktop, dan tidak menampilkan flicker role saat user cepat berpindah tab.

Perubahan yang termasuk dalam scope:

- hapus label `Sesi aktif` dari shell kiri
- hapus panel `Sumber data aktif`
- hapus panel `Sprint hari ini`
- rapatkan sidebar desktop agar menempel ke kiri viewport
- perbaiki refresh saat kembali fokus supaya role mentor tidak sempat terlihat sebagai `Pro`

Perubahan yang tidak termasuk dalam scope:

- redesign total warna, tipografi, atau arsitektur shell
- perubahan besar pada mobile navigation
- perubahan schema database atau auth provider
- menghapus badge role utama (`Mentor`, `Pro`, `Admin`)

## 2. Current State

### 2.1 Product shell

Product shell di [product-shell.tsx](</E:/Projek TRY OYT/src/components/layout/product-shell.tsx:1>) saat ini masih menampilkan tiga lapisan sidebar yang bukan inti navigasi:

- status baris atas memakai `statusLabel`
- panel debug `SupabaseSourceNotice`
- panel sprint memakai `sprintTitle`, `sprintIcon`, dan `sprintItems`

Akibatnya, sidebar terlihat ramai dan tinggi visualnya terlalu berat di kiri.

### 2.2 Admin shell

Admin shell di [admin-shell.tsx](</E:/Projek TRY OYT/src/components/layout/admin-shell.tsx:1>) juga masih memuat:

- status baris atas memakai `statusLabel`
- panel debug `SupabaseSourceNotice`

Selain itu, wrapper `main` dan container dalam masih memberi jarak kiri-kanan yang membuat sidebar terasa mengambang, bukan menempel ke viewport.

### 2.3 Role flicker

Role badge di shell student dibangun dari query profile di [use-student-shell.ts](</E:/Projek TRY OYT/src/pages/app/use-student-shell.ts:1>).

Saat focus kembali, hook [use-window-focus-refresh.ts](</E:/Projek TRY OYT/src/lib/use-window-focus-refresh.ts:1>) menaikkan `refreshVersion`. Nilai ini masuk ke `queryKey` profile pada beberapa surface. Saat query key berubah:

- query profile diinisialisasi ulang
- `profileQuery.data` sempat kosong
- `resolveStudentTierLabel` jatuh ke fallback `Pro`
- setelah fetch selesai, role mentor muncul lagi

Ini membuat user mentor bisa melihat flicker cepat `Pro` lalu kembali `Mentor` saat `Alt+Tab`.

### 2.4 Query behavior context

Repo ini sudah mematikan `refetchOnWindowFocus` global di [query-client.ts](</E:/Projek TRY OYT/src/lib/supabase/query-client.ts:1>). Berdasarkan docs resmi TanStack Query v5 yang dicek via Context7, refetch focus default memang bisa dimatikan global atau per query. Jadi flicker saat ini bukan berasal dari default React Query, tetapi dari refresh kustom berbasis focus yang kita tambahkan sendiri.

## 3. Design Decision

### 3.1 Recommended approach

Gunakan pendekatan `Clean + Flush Left`:

- shell hanya menyisakan brand, badge role, nav utama, dan tombol logout
- sidebar desktop dirapatkan ke kiri viewport
- refresh focus tetap ada, tetapi tidak lagi mengosongkan role saat fetch berjalan

Pendekatan ini dipilih karena:

- paling langsung menjawab keluhan visual user
- tidak membuang informasi role yang masih penting
- memperbaiki akar flicker, bukan sekadar menyamarkan gejalanya

### 3.2 Alternatives considered

#### A. Trim only

Hanya hapus label dan panel, tanpa ubah struktur wrapper shell.

Kelebihan:

- patch kecil
- risiko layout rendah

Kekurangan:

- sidebar tetap terasa mengambang
- kesan fullscreen yang diminta user tidak tercapai penuh

#### B. Clean + Flush Left

Hapus panel non-inti, rapatkan sidebar desktop ke kiri, dan ubah refresh role agar stabil.

Kelebihan:

- paling sesuai dengan kebutuhan user
- shell terasa lebih bersih dan lebih “app-like”
- akar flicker tertangani

Kekurangan:

- perlu sentuhan di beberapa test shell/layout

#### C. Hide only with CSS

Sembunyikan panel lama via class, tapi biarkan prop dan render tree lama tetap hidup.

Kelebihan:

- implementasi cepat

Kekurangan:

- technical debt tetap tinggal
- data dan logic sidebar tetap terpasang padahal tidak dipakai
- tidak menyelesaikan flicker role

Pendekatan `C` ditolak.

## 4. Detailed Design

### 4.1 Product shell cleanup

File utama:

- [product-shell.tsx](</E:/Projek TRY OYT/src/components/layout/product-shell.tsx:1>)

Perubahan:

- hapus import `SupabaseSourceNotice`
- hapus render `statusLabel` row
- hapus render panel sprint seluruhnya
- sederhanakan props shell agar tidak lagi membutuhkan:
  - `statusLabel`
  - `sprintTitle`
  - `sprintIcon`
  - `sprintItems`
  - `sidebarStatusIcon`

Boundary baru product shell:

- brand
- role badge
- nav items
- logout button
- children area

### 4.2 Admin shell cleanup

File utama:

- [admin-shell.tsx](</E:/Projek TRY OYT/src/components/layout/admin-shell.tsx:1>)

Perubahan:

- hapus import `SupabaseSourceNotice`
- hapus render `statusLabel`
- shell props tidak lagi butuh:
  - `statusLabel`
  - `statusIcon`

Boundary admin shell setelah cleanup:

- brand
- nav admin
- logout
- content header
- content body

### 4.3 Sidebar flush-left layout

File utama:

- [product-shell.tsx](</E:/Projek TRY OYT/src/components/layout/product-shell.tsx:1>)
- [admin-shell.tsx](</E:/Projek TRY OYT/src/components/layout/admin-shell.tsx:1>)

Perubahan desktop/tablet:

- hilangkan gap visual kiri dari wrapper utama
- buat sidebar mengisi kolom kiri penuh viewport
- pertahankan padding internal sidebar agar konten tetap nyaman dibaca
- area konten kanan tetap punya breathing room

Prinsip layout:

- flush-left berlaku untuk breakpoint saat sidebar permanen tampil
- mobile tidak dipaksa mengikuti pola desktop

### 4.4 Stabilize role refresh on focus

File utama:

- [use-window-focus-refresh.ts](</E:/Projek TRY OYT/src/lib/use-window-focus-refresh.ts:1>)
- [use-student-shell.ts](</E:/Projek TRY OYT/src/pages/app/use-student-shell.ts:1>)
- [dashboard-page.tsx](</E:/Projek TRY OYT/src/pages/app/dashboard-page.tsx:1>)
- [route-guards.tsx](</E:/Projek TRY OYT/src/router/route-guards.tsx:1>)

Perubahan desain:

1. dedupe focus bursts

- hook refresh focus akan menghindari bump ganda dari kombinasi `focus` dan `visibilitychange`
- burst event cepat saat `Alt+Tab` hanya menghasilkan satu refresh

2. preserve previous role while fetching

- shell student tidak boleh turun ke fallback `Pro` hanya karena query refetch sedang berlangsung
- role terakhir yang sudah valid harus tetap dipakai sampai data baru selesai masuk

3. keep access refresh but avoid UI reset

- guard dan profile refresh tetap boleh jalan saat window kembali aktif
- refresh harus bersifat background update, bukan reset visual shell

Implementasi boleh memakai salah satu dari dua pola berikut, dengan preferensi ke pola pertama:

- pola A: simpan `lastResolvedRole` di hook shell dan gunakan saat query sedang fetch
- pola B: ubah refresh dari query-key invalidation ke `queryClient.invalidateQueries`/`refetchQueries` tanpa mengganti key yang mereset data

Rekomendasi:

- untuk shell role gunakan pola A agar badge tetap stabil
- untuk query refresh gunakan invalidation/background refetch bila perubahan tetap minim dan testable

### 4.5 Mock data cleanup

File utama:

- [student-dashboard.ts](</E:/Projek TRY OYT/src/mocks/student-dashboard.ts:1>)
- [admin-content.ts](</E:/Projek TRY OYT/src/mocks/admin-content.ts:1>)

Perubahan:

- hapus metadata shell yang tidak lagi dipakai
- jaga agar mock tetap merepresentasikan shell final, bukan membawa props usang

## 5. Data Flow

### 5.1 Before

1. user kembali ke tab app
2. `focus` dan `visibilitychange` bisa sama-sama bump refresh
3. query key profile berubah
4. data profile sempat kosong
5. shell memakai fallback tier label `Pro`
6. fetch selesai dan role mentor kembali

### 5.2 After

1. user kembali ke tab app
2. event focus burst didedupe
3. refresh jalan sekali
4. shell tetap menampilkan last known role
5. data baru masuk di background
6. hanya jika role backend benar-benar berubah, badge ikut berubah sekali secara final

## 6. Error Handling

- jika refresh profile gagal saat kembali fokus, shell tetap menampilkan role terakhir yang valid
- route guard tetap boleh menampilkan error state bila verifikasi akses awal gagal total
- cleanup visual sidebar tidak boleh bergantung pada data remote, jadi tidak menambah failure mode baru

## 7. Testing Strategy

### 7.1 Product and admin shell UI

Tambah/ubah test agar memastikan:

- `Sesi aktif` tidak dirender
- `Sumber data aktif` tidak dirender
- `Sprint hari ini` tidak dirender
- nav dan logout tetap tampil

### 7.2 Desktop shell layout

Tambahkan assertion class/structure untuk memastikan shell desktop memakai wrapper flush-left yang baru.

### 7.3 Role flicker regression

Tambahkan test yang mensimulasikan:

- user mentor sudah login
- event `focus` dan `visibilitychange` datang cepat berurutan
- role tidak pernah dirender sebagai `Pro` selama refetch

### 7.4 Safety checks

Jalankan minimal:

- targeted vitest untuk shell, router, profile, subscription
- full `npm run build`

## 8. Implementation Plan Outline

1. Tulis failing tests untuk shell cleanup dan role refresh stability.
2. Refactor product shell dan admin shell agar prop debug/status tidak lagi dipakai.
3. Rapikan wrapper layout desktop menjadi flush-left.
4. Stabilkan refresh role saat focus return.
5. Rapikan mock metadata dan test snapshots/assertions.
6. Jalankan verification suite dan build.

## 9. Success Criteria

Perubahan dianggap selesai jika:

- semua shell tidak lagi menampilkan `Sesi aktif`, `Sumber data aktif`, dan `Sprint hari ini`
- sidebar desktop terlihat menempel ke kiri viewport
- mentor tidak lagi flicker menjadi `Pro` saat `Alt+Tab` cepat
- targeted tests dan build lulus
