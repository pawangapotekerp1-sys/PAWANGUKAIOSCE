import ProductShell from "../../components/layout/product-shell";
import QuestionGeneratorCreateFlow from "../../components/question-generator/question-generator-create-flow";
import { productShellMeta } from "../../mocks/student-dashboard";
import { useStudentShell } from "./use-student-shell";
import { Badge } from "../../components/ui/badge";
import { Sparkles } from "lucide-react";

function QuestionGeneratorPage() {
  const studentShell = useStudentShell("/app/question-generator");

  return (
    <ProductShell
      brand={productShellMeta.brand}
      navItems={studentShell.navItems}
      tierLabel={studentShell.tierLabel}
    >
      <div className="flex flex-col gap-8 w-full py-4">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/40">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
              Fitur Mentor AI
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-3 text-foreground">
              Penyusun Soal
            </h1>
            <p className="text-base text-muted-foreground mt-2 max-w-2xl">
              Buat draf soal latihan dari topik acuan secara otomatis, lalu review hasilnya sebelum dikirim ke bank soal.
            </p>
          </div>
        </div>

        <QuestionGeneratorCreateFlow basePath="/app/question-generator" />
      </div>
    </ProductShell>
  );
}

export default QuestionGeneratorPage;
