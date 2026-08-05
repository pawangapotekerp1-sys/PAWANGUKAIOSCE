export type BlockAccuracy = {
  name: string;
  score: number;
  label: string;
};

export type TopicWeakness = {
  topic: string;
  block: string;
  accuracy: number;
  note: string;
};

export type RulesInsight = {
  title: string;
  body: string;
};

export type ReviewPreviewItem = {
  id: number;
  block: string;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  isWrong: boolean;
};

export const blockAccuracy: BlockAccuracy[] = [
  {
    name: "Clinical Science",
    score: 64,
    label: "Perlu prioritas review",
  },
  {
    name: "Pharmaceutical Science",
    score: 81,
    label: "Paling stabil",
  },
  {
    name: "Social, Behavioral & Administrative",
    score: 76,
    label: "Naik perlahan",
  },
] as const;

export const topicWeaknessRanking: TopicWeakness[] = [
  {
    topic: "Farmakoterapi kardiovaskular",
    block: "Clinical Science",
    accuracy: 52,
    note: "Pola salah masih berulang di pemilihan terapi awal dan titrasi obat.",
  },
  {
    topic: "Teknik aseptik dan sterilitas",
    block: "Pharmaceutical Science",
    accuracy: 61,
    note: "Kesalahan terbanyak muncul saat soal berpindah ke evaluasi stabilitas.",
  },
  {
    topic: "Intervensi farmasi klinis",
    block: "Clinical Science",
    accuracy: 66,
    note: "Sudah membaik, tetapi masih sering turun saat kasus memuat komorbid.",
  },
] as const;

export const rulesInsights: RulesInsight[] = [
  {
    title: "Ringkasan ini disusun dari hasil try out terakhir.",
    body: "Urutan prioritas berasal dari blok dengan akurasi terendah dan topik yang paling sering menahan skor saat review jawaban salah.",
  },
  {
    title: "Clinical Science perlu dipakai sebagai blok pembuka sesi berikutnya.",
    body: "Dua topik terlemah masih datang dari blok ini, jadi mengulang blok lain lebih dulu hanya akan menyebar fokusmu.",
  },
] as const;

export const reviewPreviewItems: ReviewPreviewItem[] = [
  {
    id: 1,
    block: "Clinical Science",
    question:
      "Pasien gagal jantung dengan hipertensi belum terkontrol datang dengan edema perifer. Regimen awal mana yang paling rasional untuk ditinjau ulang lebih dulu?",
    userAnswer: "Calcium channel blocker tunggal",
    correctAnswer: "ACE inhibitor sebagai dasar titrasi awal",
    explanation:
      "Soal ini menilai prioritas terapi awal sebelum kombinasi tambahan. Pada profil kasus seperti ini, ACE inhibitor lebih relevan sebagai dasar optimasi terapi.",
    isWrong: true,
  },
  {
    id: 2,
    block: "Pharmaceutical Science",
    question:
      "Pada evaluasi sediaan steril, parameter apa yang paling langsung menunjukkan risiko kontaminasi proses aseptik?",
    userAnswer: "Nilai pH akhir",
    correctAnswer: "Hasil media fill dan kebersihan lingkungan proses",
    explanation:
      "pH penting untuk stabilitas, tetapi risiko kontaminasi aseptik lebih langsung dibaca dari simulasi proses dan monitoring lingkungan.",
    isWrong: true,
  },
  {
    id: 3,
    block: "Social, Behavioral & Administrative",
    question:
      "Dokumentasi intervensi farmasis paling berguna bila memuat elemen apa selain rekomendasi obat?",
    userAnswer: "Tujuan klinis dan hasil monitoring",
    correctAnswer: "Tujuan klinis dan hasil monitoring",
    explanation:
      "Jawabanmu sudah tepat. Dokumentasi intervensi perlu menautkan rekomendasi dengan target klinis dan rencana evaluasinya.",
    isWrong: false,
  },
] as const;
