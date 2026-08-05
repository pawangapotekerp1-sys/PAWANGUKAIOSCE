import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import ProductShell from "../../components/layout/product-shell";
import { getButtonStyleProps } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "../../components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import { listMentorFlashCardMaterials } from "../../lib/api/flash-card-api";
import { productShellMeta } from "../../mocks/student-dashboard";
import { useStudentShell } from "./use-student-shell";

function FlashCardGeneratorPage() {
  const studentShell = useStudentShell("/app/flash-card-generator");
  const materialsQuery = useQuery({
    queryKey: ["mentor-flash-card-materials"],
    queryFn: () => listMentorFlashCardMaterials(),
  });

  return (
    <ProductShell
      brand={productShellMeta.brand}
      navItems={studentShell.navItems}
      tierLabel={studentShell.tierLabel}
    >
      <section className="space-y-6">
        <header className="space-y-3">
          <p className="font-mono text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-primary">
            Area mentor
          </p>
          <h1 className="text-3xl font-semibold leading-tight text-foreground">Penyusun Flash Card</h1>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
            Unggah transkrip dan slide, cek hasilnya, lalu terbitkan untuk siswa.
          </p>
          <Link
            {...getButtonStyleProps({
              variant: "primary",
            })}
            to="/app/flash-card-generator/new"
          >
            Buat materi baru
          </Link>
        </header>

        {materialsQuery.isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Daftar materi sedang dimuat...</p>
          </div>
        ) : materialsQuery.isError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Daftar materi belum bisa dimuat</AlertTitle>
            <AlertDescription>Coba lagi sebentar.</AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-4">
            {materialsQuery.data?.map((item) => (
              <Card
                key={item.materialId}
                className="block px-5 py-5 hover:-translate-y-0.5 hover:shadow-xl"
              >
                <Link to={`/app/flash-card-generator/${item.materialId}`} className="block">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                    {item.academicGroupLabel}
                  </p>
                  <h2 className="mt-3 text-xl font-semibold text-foreground">{item.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{item.statusLabel}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.subtopicCount} submateri / {item.cardCount} kartu
                  </p>
                  {item.processingError ? (
                    <p className="mt-2 text-sm text-destructive">{item.processingError}</p>
                  ) : null}
                </Link>
              </Card>
            ))}
          </div>
        )}
      </section>
    </ProductShell>
  );
}

export default FlashCardGeneratorPage;
