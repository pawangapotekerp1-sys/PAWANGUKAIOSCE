import {
  Activity,
  Beaker,
  Brain,
  Building2,
  FlaskConical,
  HeartPulse,
  Leaf,
  Package,
  Scale,
  ShieldAlert,
  Stethoscope,
  TrendingUp,
} from "lucide-react";

export const getTopicVisuals = (topicTitle: string | null) => {
  const name = (topicTitle || "").toLowerCase();
  
  if (name.includes("kardio") || name.includes("jantung")) return { icon: HeartPulse, difficulty: "Sedang" };
  if (name.includes("infeksi") || name.includes("imun")) return { icon: ShieldAlert, difficulty: "Tinggi" };
  if (name.includes("endokrin") || name.includes("metabol")) return { icon: Activity, difficulty: "Sedang" };
  if (name.includes("gastro") || name.includes("respi")) return { icon: Stethoscope, difficulty: "Sedang" };
  if (name.includes("saraf") || name.includes("psikiatri")) return { icon: Brain, difficulty: "Tinggi" };
  
  if (name.includes("padat") || name.includes("semipadat")) return { icon: Package, difficulty: "Sedang" };
  if (name.includes("cair") || name.includes("steril")) return { icon: FlaskConical, difficulty: "Tinggi" };
  if (name.includes("analisis") || name.includes("qc")) return { icon: Beaker, difficulty: "Sedang" };
  if (name.includes("bahan alam") || name.includes("kimia")) return { icon: Leaf, difficulty: "Sedang" };
  
  if (name.includes("regulasi") || name.includes("etika")) return { icon: Scale, difficulty: "Sedang" };
  if (name.includes("manajemen") || name.includes("apotek")) return { icon: Building2, difficulty: "Sedang" };
  if (name.includes("ekonomi") || name.includes("epidemiologi")) return { icon: TrendingUp, difficulty: "Tinggi" };

  return { icon: Activity, difficulty: "Sedang" };
};
