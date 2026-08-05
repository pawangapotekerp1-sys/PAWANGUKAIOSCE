export type TryoutCatalogItem = {
  title: string;
  subtitle: string;
  description: string;
  questionCount: string;
  emphasis?: "default" | "accent";
};

export type TryoutQuestion = {
  id: number;
  block: string;
  stem: string;
  options: string[];
};

export type ResultBlockSummary = {
  name: string;
  correct: number;
  wrong: number;
};

export const tryoutCatalog: TryoutCatalogItem[] = [
  {
    title: "Try Out Besar",
    subtitle: "Simulasi penuh",
    description: "50 soal campuran untuk membaca stamina, fokus, dan pola salah saat tekanan waktu ikut bermain.",
    questionCount: "50 soal",
    emphasis: "accent",
  },
  {
    title: "Clinical Science",
    subtitle: "Try out per blok",
    description: "Prioritaskan farmakoterapi dan interpretasi kasus klinis saat skor blok ini masih tertahan.",
    questionCount: "50 soal",
  },
  {
    title: "Pharmaceutical Science",
    subtitle: "Try out per blok",
    description: "Fokus ke sediaan, evaluasi steril, dan konsep farmasetika yang paling sering menahan akurasi.",
    questionCount: "30 soal",
  },
  {
    title: "Social, Behavioral & Administrative Pharmacy",
    subtitle: "Try out per blok",
    description: "Rapikan pemahaman layanan, dokumentasi, dan kebijakan yang sering terlihat sederhana tetapi memakan skor.",
    questionCount: "30 soal",
  },
] as const;

export const tryoutSessionQuestions: TryoutQuestion[] = [
  {
    id: 1,
    block: "Clinical Science",
    stem: "Pasien hipertensi dengan edema perifer datang untuk evaluasi ulang. Intervensi terapi awal mana yang paling rasional untuk ditinjau lebih dulu sebelum kombinasi lanjutan diberikan?",
    options: [
      "Calcium channel blocker tunggal",
      "ACE inhibitor sebagai dasar titrasi awal",
      "Diuretik loop sebagai monoterapi jangka panjang",
      "Beta blocker dosis tinggi tanpa evaluasi fungsi ginjal",
      "Kombinasi semua obat sekaligus tanpa evaluasi respon awal",
    ],
  },
  {
    id: 2,
    block: "Pharmaceutical Science",
    stem: "Pada evaluasi sediaan steril, indikator apa yang paling langsung menunjukkan kemungkinan masalah pada proses aseptik?",
    options: [
      "Perubahan pH akhir sediaan",
      "Hasil media fill dan monitoring lingkungan proses",
      "Warna kemasan sekunder",
      "Tebal label produk",
      "Urutan penyimpanan kardus luar di gudang",
    ],
  },
  {
    id: 3,
    block: "Social, Behavioral & Administrative Pharmacy",
    stem: "Dokumentasi intervensi farmasis akan paling berguna bila rekomendasi obat ditautkan dengan elemen apa?",
    options: [
      "Promo produk yang sedang berlaku",
      "Preferensi warna kemasan pasien",
      "Tujuan klinis dan hasil monitoring",
      "Jumlah stok gudang",
      "Desain brosur edukasi yang dipakai di apotek",
    ],
  },
  {
    id: 4,
    block: "Clinical Science",
    stem: "Pada review kasus gagal jantung, parameter apa yang perlu dipantau paling awal setelah optimasi terapi awal dimulai?",
    options: [
      "Frekuensi ganti kemasan obat",
      "Tekanan darah, gejala, dan toleransi terapi",
      "Desain poster edukasi pasien",
      "Warna kartu kontrol",
      "Merek map rekam medis yang digunakan shift sebelumnya",
    ],
  },
] as const;

export const tryoutResultSummary = {
  score: 74,
  correctAnswers: 148,
  wrongAnswers: 52,
  timeUsed: "02:41:12",
} as const;

export const tryoutResultBlocks: ResultBlockSummary[] = [
  {
    name: "Clinical Science",
    correct: 42,
    wrong: 18,
  },
  {
    name: "Pharmaceutical Science",
    correct: 33,
    wrong: 7,
  },
  {
    name: "Social, Behavioral & Administrative Pharmacy",
    correct: 27,
    wrong: 9,
  },
] as const;
