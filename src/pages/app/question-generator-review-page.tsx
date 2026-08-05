import ProductShell from "../../components/layout/product-shell";
import QuestionGeneratorReviewFlow from "../../components/question-generator/question-generator-review-flow";
import { productShellMeta } from "../../mocks/student-dashboard";
import { useStudentShell } from "./use-student-shell";

function QuestionGeneratorReviewPage() {
  const studentShell = useStudentShell("/app/question-generator");

  return (
    <ProductShell
      brand={productShellMeta.brand}
      navItems={studentShell.navItems}
      tierLabel={studentShell.tierLabel}
    >
      <section className="space-y-6">
        <header className="space-y-3">
          <p className="font-mono text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[var(--color-teal-soft)]">
            Tinjau hasil
          </p>
          <h1 className="text-3xl font-semibold leading-tight text-[var(--color-outline)]">Penyusun Soal</h1>
          <p className="max-w-3xl text-sm leading-7 text-[var(--color-ink-muted)]">
            Periksa hasil soal sebelum dikirim ke bank soal atau sesi.
          </p>
        </header>

        <QuestionGeneratorReviewFlow />
      </section>
    </ProductShell>
  );
}

export default QuestionGeneratorReviewPage;
