# Try Out Selection Page Design Spec

## Konteks & Tujuan
Pengguna ingin menggabungkan dua menu terpisah ("Try Out" dan "Try Out Terjadwal") di sidebar menjadi satu menu tunggal. Saat diklik, menu ini akan mengarah ke halaman baru (`TryoutSelectionPage`) di mana pengguna akan dihadapkan pada dua pilihan mode try out melalui desain kartu (*card*) yang elegan.

## Gaya Visual (Aesthetic)
Mengikuti pendekatan **Floating Centered Cards (Elegan & Minimalis)**.
- **Hero Section**: Bersih, terpusat (*centered*). Judul tegas namun tidak terlalu besar, dilengkapi subjudul yang memandu pengguna.
- **Cards**: Dua kartu besar yang menampilkan efek *glassmorphism* atau *shadow* premium yang sangat halus pada saat normal, dan bereaksi dengan pergerakan terangkat (`translate-y`) serta *glow* warna aksen (primary) saat di-*hover*.
- **Warna & Tipografi**: Menggunakan palet yang sudah ada (`clinical-surface` untuk *background*, `primary` untuk aksen). Tipografi akan mengutamakan *readability* yang tinggi.

## Perubahan Arsitektur & Routing
1. **Sidebar Navigation (`src/mocks/student-dashboard.ts`)**:
   - Hapus entri menu "Try out" (yang tadinya mengarah ke `/app/tryout`).
   - Hapus entri menu "Try Out Terjadwal" (yang tadinya mengarah ke `/app/scheduled-tryout`).
   - Tambahkan satu entri menu baru bernama "Try Out" yang mengarah ke `/app/tryout-selection`.
2. **Routing (`src/router/app-router.tsx`)**:
   - Tambahkan *route* baru untuk `/app/tryout-selection` yang memuat `TryoutSelectionPage`.
3. **Halaman Baru (`src/pages/app/tryout-selection-page.tsx`)**:
   - Memanfaatkan komponen layout `ProductShell`.
   - Menggunakan komponen `shadcn/ui` seperti `Card`, `Badge`, dan icon dari `lucide-react`.

## Anatomi Halaman TryoutSelectionPage
```tsx
<ProductShell>
  <div className="flex flex-col items-center justify-center min-h-[70vh]">
    <Header>
      <h1>Pilih Mode Try Out</h1>
      <p>Sesuaikan dengan gaya belajar dan kesiapanmu hari ini.</p>
    </Header>
    <CardGrid>
      <SelectionCard 
         title="Try Out Unlimited"
         description="Latihan mandiri tanpa batas waktu, fokus pada pemahaman materi."
         icon={<Infinity/BookOpen />}
         href="/app/tryout"
      />
      <SelectionCard 
         title="Try Out Terjadwal"
         description="Simulasi ujian sebenarnya dengan waktu dan saingan serentak."
         icon={<CalendarClock />}
         href="/app/scheduled-tryout"
      />
    </CardGrid>
  </div>
</ProductShell>
```

## Evaluasi Mandiri (Spec Self-Review)
- [x] Placeholder scan: Tidak ada TODO atau TBD.
- [x] Internal consistency: Konsep sinkron dengan permintaan menggabungkan menu sidebar dan membuat halaman seleksi.
- [x] Scope check: Pekerjaan fokus pada UI/UX, tidak menyentuh logika *backend*. Skala cukup kecil untuk satu *implementation plan*.
- [x] Ambiguity check: Perilaku klik sudah didefinisikan dengan jelas (mengarah ke katalog yang sudah ada).

## Langkah Berikutnya
Menunggu persetujuan (review) pengguna sebelum lanjut ke pembuatan *Implementation Plan* menggunakan *skill* `writing-plans`.
