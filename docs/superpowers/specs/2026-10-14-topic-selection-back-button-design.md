# Design Spec: Tryout Topic Selection Back Navigation & Header

## 1. Problem Statement
Pada halaman pemilihan topik tryout (`/app/tryout/topics`), terdapat filter pill button ("Semua Blok", "Clinical Science", "Pharmaceutical Science", dll.). Karena siswa telah memilih blok secara spesifik pada halaman sebelumnya (`/app/tryout/blocks`), filter pill button ini redundan dan membingungkan alur navigasi.

Kebutuhan:
1. Menghapus filter tab pill button ("Semua Blok" dan tombol-tombol nama blok).
2. Menggantinya dengan tombol navigasi "Kembali" yang mengarahkan pengguna kembali ke halaman pemilihan blok (`/app/tryout/blocks`).
3. Menampilkan identitas header blok yang sedang aktif (nama blok dan keterangan topik) agar konteks pembelajaran tetap jelas.

## 2. User Experience & User Flow
1. Siswa berada di halaman `/app/tryout/blocks` (TryoutBlockSelectionPage).
2. Siswa menekan "Pilih per Materi" pada kartu blok tertentu (misalnya Clinical Science), yang menavigasikan ke `/app/tryout/topics?block=<blockId>`.
3. Pada halaman `/app/tryout/topics`:
   - Di bagian atas, siswa melihat tombol kembali: `< Kembali ke Pilihan Blok` (menautkan ke `/app/tryout/blocks`).
   - Di samping/bawah tombol kembali, ditampilkan judul blok aktif (misal: "Materi Blok: Clinical Science") beserta informasi materi yang tersedia.
   - Filter pill buttons tidak lagi ditampilkan.
   - Hanya kartu materi milik blok terpilih yang dirender (jika `block` query parameter ada).
   - Jika siswa menekan tombol "Kembali ke Pilihan Blok", siswa kembali ke `/app/tryout/blocks`.

## 3. Component Architecture & Changes
### File Target: `src/pages/app/tryout-topic-selection-page.tsx`
- **Import**: Menambahkan utilitas atau komponen yang diperlukan (`ArrowLeft`, `Link`, `Button`, `getButtonStyleProps`).
- **Data Resolution**:
  - Ambil `block` dari query params (`activeFilter = searchParams.get("block") || "ALL"`).
  - Tentukan nama blok aktif:
    ```ts
    const activeBlock = uniqueBlocks.find((b) => b.id === activeFilter);
    const activeBlockName = activeBlock ? activeBlock.name : "Semua Materi";
    ```
- **UI Replacement**:
  - Hapus blok `{/* Filter Tabs */}` yang berisi `<Button data-testid="filter-all">` dan tombol-tombol blok lainnya.
  - Tambahkan header navigasi:
    ```tsx
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
      <div className="flex items-center gap-3">
        <Link
          {...getButtonStyleProps({
            variant: "outline",
            size: "sm",
            className: "rounded-lg text-xs font-semibold gap-2 shadow-xs",
          })}
          to="/app/tryout/blocks"
          data-testid="btn-back-to-blocks"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Pilihan Blok
        </Link>
        <div className="h-4 w-px bg-border hidden sm:block" />
        <h1 className="text-lg font-bold tracking-tight text-foreground">
          {activeBlock ? activeBlock.name : "Semua Materi"}
        </h1>
      </div>
      <span className="text-xs font-medium text-muted-foreground">
        Menampilkan {filteredTopics.length} materi
      </span>
    </div>
    ```

## 4. Testing Plan
### File Target: `src/pages/app/tryout-topic-selection-page.test.tsx`
- Update unit tests:
  - Hapus assertions yang mencari `screen.getByRole("button", { name: "Clinical Science" })` atau `filter-all`.
  - Tambahkan assertion bahwa tombol "Kembali ke Pilihan Blok" (`data-testid="btn-back-to-blocks"`) dirender dan memiliki href `/app/tryout/blocks`.
  - Pastikan topik tetap terfilter dengan benar saat URL query param `?block=...` disertakan.
  - Pastikan nama blok aktif ("Clinical Science" atau "Semua Materi") ditampilkan pada header.

## 5. Verification
- Jalankan pemeriksaan lint/typecheck: `npx tsc --noEmit`.
- Jalankan test terkait jika lingkungan memungkinkan.
