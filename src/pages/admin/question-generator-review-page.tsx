import AdminShell from "../../components/layout/admin-shell";
import QuestionGeneratorReviewFlow from "../../components/question-generator/question-generator-review-flow";
import { createAdminNavItems } from "../../mocks/admin-content";

function QuestionGeneratorReviewPage() {
  return (
    <AdminShell
      description="Periksa hasil soal sebelum disimpan ke bank soal atau sesi."
      navItems={createAdminNavItems("/admin/question-generator")}
      title="Penyusun Soal"
    >
      <QuestionGeneratorReviewFlow />
    </AdminShell>
  );
}

export default QuestionGeneratorReviewPage;
