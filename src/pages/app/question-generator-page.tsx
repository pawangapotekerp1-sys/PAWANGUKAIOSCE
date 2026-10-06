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

        <QuestionGeneratorCreateFlow basePath="/app/question-generator" />
      </div>
    </ProductShell>
  );
}

export default QuestionGeneratorPage;
