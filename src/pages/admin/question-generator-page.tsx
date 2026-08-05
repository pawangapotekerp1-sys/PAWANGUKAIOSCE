import AdminShell from "../../components/layout/admin-shell";
import QuestionGeneratorCreateFlow from "../../components/question-generator/question-generator-create-flow";
import { createAdminNavItems } from "../../mocks/admin-content";

function QuestionGeneratorPage() {
  return (
    <AdminShell
      description="Gunakan 1-3 soal acuan, lalu cek hasilnya sebelum disimpan ke bank soal atau sesi."
      navItems={createAdminNavItems("/admin/question-generator")}
      title="Penyusun Soal"
    >
      <QuestionGeneratorCreateFlow basePath="/admin/question-generator" />
    </AdminShell>
  );
}

export default QuestionGeneratorPage;
