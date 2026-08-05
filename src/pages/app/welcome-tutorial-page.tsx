import React, { useState } from "react";
import { Link } from "react-router";
import {
  Sparkles,
  BookOpen,
  BarChart3,
  BrainCircuit,
  FolderGit2,
  Trophy,
  ArrowRight,
  ChevronDown,
  Clock,
  Target,
  GraduationCap,
  Flame,
  ShieldCheck,
  CheckCircle2,
  Compass,
  Zap,
  HelpCircle,
  LayoutDashboard,
} from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Apa bedanya Simulasi Try Out rutin dan Scheduled Try Out?",
    answer:
      "Simulasi Try Out rutin dapat diakses kapan saja secara fleksibel berdasarkan topik, blok, atau paket latihan. Sementara Scheduled Try Out adalah simulasi try out akbar berjadwal serentak nasional dengan timer ketat dan pemeringkatan leaderboard secara real-time.",
  },
  {
    question: "Bagaimana cara kerja Flash Cards AI & Kartu Saku?",
    answer:
      "Flash Cards AI membantu Anda mempercepat hafalan dosis, mekanisme kerja obat, interaksi obat, dan indikasi klinik. Anda bisa memakai deck bawaan kurikulum UKAI atau memanfaatkan AI Generator untuk membuat kartu saku otomatis dari rangkuman materi Anda.",
  },
  {
    question: "Apakah hasil Try Out saya dapat dilihat kembali untuk dievaluasi?",
    answer:
      "Ya, setiap ujian yang diselesaikan akan tersimpan di Bedah Pembahasan. Anda dapat meninjau rasional jawaban, kunci pembahasan, indikator kesulitan soal, serta grafik analitik kelemahan per kategori topik.",
  },
  {
    question: "Bagaimana cara mengakses rekaman Zoom dan slide materi perkuliahan?",
    answer:
      "Semua slide presentasi, ringkasan rumus kefarmasian, dan rekaman sesi live class Zoom dapat diakses di menu Area Belajar & Material Drive. File dapat diunduh atau dipelajari langsung dari dashboard.",
  },
  {
    question: "Bagaimana jika saya ingin fokus pada materi yang nilai performanya masih rendah?",
    answer:
      "Gunakan menu Analitik & Laporan Performa. Sistem Pawang Apoteker secara otomatis mendeteksi kategori soal di mana akurasi Anda masih di bawah target dan menyarankan paket try out serta flashcard khusus untuk memperbaikinya.",
  },
];

export default function WelcomeTutorialPage() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-teal-500 selection:text-white">
      {/* 1. Standalone Top Navbar Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80 px-4 lg:px-8 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Logo & Badge */}
          <div className="flex items-center gap-3">
            <Link
              to="/app"
              className="flex items-center gap-2.5 group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-400 p-0.5 shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-teal-400" />
                </div>
              </div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-teal-200 bg-clip-text text-transparent">
                Pawang Apoteker
              </span>
            </Link>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              Panduan Pengguna
            </span>
          </div>

          {/* Navigation Anchors */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            <a
              href="#roadmap"
              className="cursor-pointer hover:text-teal-400 transition-colors"
            >
              Roadmap Belajar
            </a>
            <a
              href="#fitur"
              className="cursor-pointer hover:text-teal-400 transition-colors"
            >
              Fitur Utama
            </a>
            <a
              href="#tips"
              className="cursor-pointer hover:text-teal-400 transition-colors"
            >
              Tips UKAI
            </a>
            <a
              href="#faq"
              className="cursor-pointer hover:text-teal-400 transition-colors"
            >
              FAQ
            </a>
          </nav>

          {/* CTA Header Button */}
          <div className="flex items-center gap-3">
            <Link
              to="/app"
              className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 hover:from-teal-400 hover:to-emerald-400 shadow-md shadow-teal-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Masuk ke Dashboard Utama</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-24 px-4 lg:px-8 border-b border-slate-800/50 bg-gradient-to-b from-slate-950 via-slate-900/50 to-slate-950">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-teal-500/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          {/* Animated Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/30 animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>Selamat Datang di Pawang Apoteker</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15]">
            Panduan Lengkap Menuju Kelulusan UKAI & Ujian Profesi Apoteker
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Platform persiapan UKAI terintegrasi nomor 1. Kuasai materi farmasi klinis, industri, dan regulasi melalui simulasi CBT interaktif, analitik pintar, serta Flash Cards AI.
          </p>

          {/* Quick CTA Actions */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/app"
              className="cursor-pointer inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl text-base font-bold bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 hover:from-teal-400 hover:to-emerald-400 shadow-lg shadow-teal-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Mulai Belajar Sekarang</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#fitur"
              className="cursor-pointer inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold bg-slate-900 text-slate-200 hover:bg-slate-800 border border-slate-700/80 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Compass className="w-5 h-5 text-teal-400" />
              <span>Jelajahi Fitur</span>
            </a>
          </div>

          {/* 4 Metric Teaser Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-10">
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl text-left backdrop-blur-sm hover:border-teal-500/40 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400 mb-3">
                <Target className="w-5 h-5" />
              </div>
              <p className="text-xl font-bold text-white">500+ Soal</p>
              <p className="text-xs text-slate-400 mt-0.5">Try Out CBT Standardized UKAI</p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl text-left backdrop-blur-sm hover:border-emerald-500/40 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-3">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-xl font-bold text-white">Bedah Detail</p>
              <p className="text-xs text-slate-400 mt-0.5">Pembahasan & Rasional Komprehensif</p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl text-left backdrop-blur-sm hover:border-teal-500/40 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400 mb-3">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <p className="text-xl font-bold text-white">Flash Cards AI</p>
              <p className="text-xs text-slate-400 mt-0.5">Hafalan Dosis & Mekanisme Obat</p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl text-left backdrop-blur-sm hover:border-emerald-500/40 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-3">
                <FolderGit2 className="w-5 h-5" />
              </div>
              <p className="text-xl font-bold text-white">Material Drive</p>
              <p className="text-xs text-slate-400 mt-0.5">Slide PPT & Live Zoom Recording</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Section 1: 4-Step Learning Roadmap (#roadmap) */}
      <section id="roadmap" className="py-16 lg:py-24 px-4 lg:px-8 max-w-7xl mx-auto border-b border-slate-800/50">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20">
            Strategi Terstruktur
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
            4-Step Learning Roadmap
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Alur belajar sistematis yang dirancang khusus untuk memastikan kesiapan mental dan akademis Anda sebelum ujian UKAI sesungguhnya.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Step 1 */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 relative flex flex-col justify-between hover:border-teal-500/50 transition-all duration-300 hover:-translate-y-1">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-extrabold text-lg">
                1
              </div>
              <h3 className="text-lg font-bold text-white">
                1. Uji Kemampuan Awal
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Mulai dengan mengerjakan Simulasi Try Out untuk mengukur baseline pemahaman awal Anda terhadap 7 kualifikasi kompetensi UKAI.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-xs font-semibold text-teal-400">
              <Clock className="w-4 h-4" />
              <span>Simulasi CBT Adaptif</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 relative flex flex-col justify-between hover:border-teal-500/50 transition-all duration-300 hover:-translate-y-1">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-extrabold text-lg">
                2
              </div>
              <h3 className="text-lg font-bold text-white">
                2. Bedah Pembahasan
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pelajari rasionalitas tiap opsi jawaban, analisis grafik performa, dan identifikasi materi mana yang memerlukan pendalaman ulang.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <BarChart3 className="w-4 h-4" />
              <span>Analitik Akurasi Per Topik</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 relative flex flex-col justify-between hover:border-teal-500/50 transition-all duration-300 hover:-translate-y-1">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-extrabold text-lg">
                3
              </div>
              <h3 className="text-lg font-bold text-white">
                3. Perdalam Materi
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Manfaatkan Flash Cards AI untuk memperkuat ingatan formula & farmakoterapi, serta pelajari slide kuliah di Material Drive.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-xs font-semibold text-teal-400">
              <BrainCircuit className="w-4 h-4" />
              <span>Kartu Saku & Flash Cards</span>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 relative flex flex-col justify-between hover:border-emerald-500/50 transition-all duration-300 hover:-translate-y-1">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-extrabold text-lg">
                4
              </div>
              <h3 className="text-lg font-bold text-white">
                4. Evaluasi TO Akbar
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Uji ketahanan mental pada Scheduled Try Out Akbar serentak nasional dan ukur posisi Anda di Leaderboard nasional.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <Trophy className="w-4 h-4" />
              <span>Leaderboard Nasional</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Section 2: Interactive Feature Exploration Hub (#fitur) */}
      <section id="fitur" className="py-16 lg:py-24 px-4 lg:px-8 max-w-7xl mx-auto border-b border-slate-800/50">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Panduan Interaktif
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
            Eksplorasi Fitur Utama Pawang Apoteker
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Temukan semua alat hebat yang dirancang untuk mempercepat persiapan ujian Anda secara efektif.
          </p>
        </div>

        <div className="space-y-8">
          {/* Card 1: Simulasi Try Out */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 lg:p-8 flex flex-col lg:flex-row items-stretch justify-between gap-8 hover:border-teal-500/40 transition-all">
            <div className="space-y-4 flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-teal-500/10 text-teal-400 text-xs font-semibold">
                <Target className="w-4 h-4" />
                Fitur Utama 1
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white">
                Simulasi Try Out & Latihan
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Latihan soal CBT interaktif dengan timer aktif standar UKAI. Anda dapat memilih latihan berdasarkan topik tertentu (Farmasi Klinis, Industri, Komunitas) atau paket Try Out 50 soal komprehensif.
              </p>
              
              {/* Step Badges */}
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="px-3 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  Langkah 1: Pilih Topik/Blok
                </span>
                <span className="px-3 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  Langkah 2: Kerjakan dengan Timer
                </span>
                <span className="px-3 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  Langkah 3: Simpan & Evaluasi
                </span>
              </div>
            </div>

            <div className="flex flex-col justify-between items-start lg:items-end gap-4 lg:w-72 bg-slate-950/60 p-6 rounded-2xl border border-slate-800/80">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Akses Cepat</p>
                <p className="text-sm font-semibold text-white">Mulai Latihan Mandiri</p>
              </div>
              <Link
                to="/app/tryout-selection"
                className="cursor-pointer inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-semibold bg-teal-500 text-slate-950 hover:bg-teal-400 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Coba Fitur Ini</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 2: Analitik & Laporan Performa */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 lg:p-8 flex flex-col lg:flex-row items-stretch justify-between gap-8 hover:border-emerald-500/40 transition-all">
            <div className="space-y-4 flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                <BarChart3 className="w-4 h-4" />
                Fitur Utama 2
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white">
                Analitik & Laporan Performa
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Pantau perkembangan persentase akurasi Anda dalam bentuk grafik visual. Sistem secara otomatis menandai kategori materi yang masih menjadi titik lemah Anda agar pembelajaran lebih terarah.
              </p>

              {/* Step Badges */}
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="px-3 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  Langkah 1: Buka Menu Analitik
                </span>
                <span className="px-3 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  Langkah 2: Cek Grafik Akurasi
                </span>
                <span className="px-3 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  Langkah 3: Identifikasi Topik Lemah
                </span>
              </div>
            </div>

            <div className="flex flex-col justify-between items-start lg:items-end gap-4 lg:w-72 bg-slate-950/60 p-6 rounded-2xl border border-slate-800/80">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Akses Cepat</p>
                <p className="text-sm font-semibold text-white">Lihat Grafik Statistik</p>
              </div>
              <Link
                to="/app/analytics"
                className="cursor-pointer inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Coba Fitur Ini</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 3: Flash Cards AI */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 lg:p-8 flex flex-col lg:flex-row items-stretch justify-between gap-8 hover:border-teal-500/40 transition-all">
            <div className="space-y-4 flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-teal-500/10 text-teal-400 text-xs font-semibold">
                <BrainCircuit className="w-4 h-4" />
                Fitur Utama 3
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white">
                Flash Cards AI & Kartu Saku
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Hafal nama obat, dosis lazim, mekanisme kerja, dan efek samping tanpa ribet. Gunakan Generator AI untuk mengubah catatan singkat Anda menjadi deck flash card interaktif secara langsung.
              </p>

              {/* Step Badges */}
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="px-3 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  Langkah 1: Pilih Deck Farmakologi
                </span>
                <span className="px-3 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  Langkah 2: Gunakan Generator AI
                </span>
                <span className="px-3 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  Langkah 3: Uji Hafalan Obat
                </span>
              </div>
            </div>

            <div className="flex flex-col justify-between items-start lg:items-end gap-4 lg:w-72 bg-slate-950/60 p-6 rounded-2xl border border-slate-800/80">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Akses Cepat</p>
                <p className="text-sm font-semibold text-white">Buka Deck Kartu Saku</p>
              </div>
              <Link
                to="/app/flash-cards"
                className="cursor-pointer inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-semibold bg-teal-500 text-slate-950 hover:bg-teal-400 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Coba Fitur Ini</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 4: Area Belajar & Material Drive */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 lg:p-8 flex flex-col lg:flex-row items-stretch justify-between gap-8 hover:border-emerald-500/40 transition-all">
            <div className="space-y-4 flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                <FolderGit2 className="w-4 h-4" />
                Fitur Utama 4
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white">
                Area Belajar & Material Drive
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Pusat dokumen materi perkuliahan UKAI, ringkasan pedoman terapi (Guideline), slide materi mentor, serta link video rekaman Zoom webinar pembelajaran interaktif.
              </p>

              {/* Step Badges */}
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="px-3 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  Langkah 1: Masuk Area Belajar
                </span>
                <span className="px-3 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  Langkah 2: Unduh PPT & Summary
                </span>
                <span className="px-3 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  Langkah 3: Tonton Rekaman Zoom
                </span>
              </div>
            </div>

            <div className="flex flex-col justify-between items-start lg:items-end gap-4 lg:w-72 bg-slate-950/60 p-6 rounded-2xl border border-slate-800/80">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Akses Cepat</p>
                <p className="text-sm font-semibold text-white">Unduh Dokumentasi Materi</p>
              </div>
              <Link
                to="/app/area-belajar"
                className="cursor-pointer inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Coba Fitur Ini</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 5: Scheduled Try Out & Leaderboard */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 lg:p-8 flex flex-col lg:flex-row items-stretch justify-between gap-8 hover:border-teal-500/40 transition-all">
            <div className="space-y-4 flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-teal-500/10 text-teal-400 text-xs font-semibold">
                <Trophy className="w-4 h-4" />
                Fitur Utama 5
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white">
                Scheduled Try Out & Leaderboard
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Simulasi Ujian Akbar Berjadwal serentak nasional. Rasakan tekanan waktu riil CBT UKAI dan lihat peringkat nasional Anda di Leaderboard peserta se-Indonesia.
              </p>

              {/* Step Badges */}
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="px-3 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  Langkah 1: Daftar Jadwal TO Akbar
                </span>
                <span className="px-3 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  Langkah 2: Ikuti Simulasi Serentak
                </span>
                <span className="px-3 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  Langkah 3: Pantau Leaderboard
                </span>
              </div>
            </div>

            <div className="flex flex-col justify-between items-start lg:items-end gap-4 lg:w-72 bg-slate-950/60 p-6 rounded-2xl border border-slate-800/80">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Akses Cepat</p>
                <p className="text-sm font-semibold text-white">Ikuti Try Out Akbar</p>
              </div>
              <Link
                to="/app/scheduled-tryout"
                className="cursor-pointer inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-semibold bg-teal-500 text-slate-950 hover:bg-teal-400 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Coba Fitur Ini</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Section 3: Strategi Lulus UKAI (#tips) */}
      <section id="tips" className="py-16 lg:py-24 px-4 lg:px-8 max-w-7xl mx-auto border-b border-slate-800/50">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20">
            Rekomendasi Mentor
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
            Strategi Rutin Lulus UKAI
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Kombinasi rutinitas harian dan mingguan ideal yang direkomendasikan apoteker lulusan terbaik.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Daily Routine */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 lg:p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Target Rutin Harian (30-45 Menit)</h3>
                <p className="text-xs text-slate-400">Konsistensi kecil setiap hari</p>
              </div>
            </div>

            <ul className="space-y-4 text-sm text-slate-300">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                <span>Kerjakan 10-15 Soal Simulasi Topik Lemah setiap pagi sebelum memulai aktivitas.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                <span>Ulas 20 Flash Cards AI untuk memperkuat memori dosis obat dan indikasi klinis.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                <span>Baca 1 lembar ringkasan pedoman terapi (Guideline) di Material Drive.</span>
              </li>
            </ul>
          </div>

          {/* Weekly Routine */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 lg:p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Target Rutin Mingguan</h3>
                <p className="text-xs text-slate-400">Evaluasi dan simulasi penuh</p>
              </div>
            </div>

            <ul className="space-y-4 text-sm text-slate-300">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Ikuti 1 Paket Try Out 50 Soal komprehensif di akhir pekan dengan timer ketat.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Bedah secara mendalam semua jawaban salah dan catat kata kunci materi baru.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Ikuti Scheduled Try Out Akbar Nasional jika jadwal telah dibuka.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 6. Section 4: FAQ Accordion (#faq) */}
      <section id="faq" className="py-16 lg:py-24 px-4 lg:px-8 max-w-4xl mx-auto border-b border-slate-800/50">
        <div className="text-center space-y-4 mb-12">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Pertanyaan Umum
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
            FAQ Pengguna Baru
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Pertanyaan yang paling sering ditanyakan oleh mahasiswa profesi apoteker saat memulai.
          </p>
        </div>

        <div className="space-y-4">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={index}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 font-semibold text-white hover:text-teal-300 transition-colors cursor-pointer"
                >
                  <span className="text-sm sm:text-base flex items-center gap-3">
                    <HelpCircle className="w-4 h-4 text-teal-400 shrink-0" />
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-teal-400" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/50">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. Bottom CTA Banner */}
      <section className="py-16 lg:py-24 px-4 lg:px-8 max-w-7xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-900/60 via-slate-900 to-emerald-900/60 border border-teal-500/30 p-8 sm:p-12 text-center space-y-6">
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-teal-500/20 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-emerald-500/20 blur-3xl rounded-full pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Zap className="w-3.5 h-3.5" />
              Siap Menjadi Apoteker Unggul?
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              Mulai Langkah Pertama Anda Sekarang
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Semua materi, simulasi CBT, dan alat hafalan pintar sudah siap digunakan di Dashboard Pawang Apoteker.
            </p>
            <div className="pt-4">
              <Link
                to="/app"
                className="cursor-pointer inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base font-bold bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 hover:from-teal-300 hover:to-emerald-300 shadow-xl shadow-teal-500/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <LayoutDashboard className="w-5 h-5" />
                <span>Mulai Belajar Sekarang di Dashboard</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="border-t border-slate-800/80 py-8 text-center text-xs text-slate-500">
        <p>© 2026 Pawang Apoteker. Platform Persiapan UKAI & Ujian Profesi Apoteker.</p>
      </footer>
    </div>
  );
}
