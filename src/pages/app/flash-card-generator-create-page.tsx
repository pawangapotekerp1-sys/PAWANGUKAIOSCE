import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import FlashCardMaterialForm from "../../components/flash-cards/flash-card-material-form";
import ProductShell from "../../components/layout/product-shell";
import Button from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "../../components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import { ShieldAlert } from "lucide-react";
import {
  createFlashCardMaterialDraft,
  processFlashCardMaterial,
} from "../../lib/api/flash-card-api";
import { getGlobalAiCredentialStatus } from "../../lib/api/global-ai-credential-api";
import { useSession } from "../../lib/auth/use-session";
import { productShellMeta } from "../../mocks/student-dashboard";
import { useStudentShell } from "./use-student-shell";

function FlashCardGeneratorCreatePage() {
  const studentShell = useStudentShell("/app/flash-card-generator/new");
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const statusQuery = useQuery({
    queryKey: ["global-ai-credential-status"],
    queryFn: () => getGlobalAiCredentialStatus(),
  });

  async function handleSubmit(input: {
    title: string;
    academicGroup: string;
    transcriptFile: File;
    slidePdfFile: File;
  }) {
    if (!user?.id) {
      throw new Error("Mentor harus login untuk membuat materi flash card.");
    }

    if (!hasCredential) {
      setSubmissionError("Simpan dan tes API key Gemini sebelum memproses materi.");
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);

    let createdDraft;
    try {
      createdDraft = await createFlashCardMaterialDraft({
        ownerId: user.id,
        title: input.title,
        academicGroup: input.academicGroup,
        transcriptFile: input.transcriptFile,
        slidePdfFile: input.slidePdfFile,
      });
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "Materi flash card belum bisa dibuat.");
      setIsSubmitting(false);
      return;
    }

    try {
      await processFlashCardMaterial({
        materialId: createdDraft.materialId,
      });
    } catch (error) {
      // Log error but continue to navigation to prevent duplicate drafts
      console.error("Processing failed or timed out:", error);
    } finally {
      setIsSubmitting(false);
    }
    
    navigate(`/app/flash-card-generator/${createdDraft.materialId}`);
  }

  const hasCredential = statusQuery.data?.hasCredential ?? false;
  const isSubmitDisabled = isSubmitting || statusQuery.isLoading || !hasCredential;

  return (
    <ProductShell
      brand={productShellMeta.brand}
      navItems={studentShell.navItems}
      tierLabel={studentShell.tierLabel}
    >
      <Card className="space-y-4 px-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Status koneksi Gemini</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Penyusun flash card menggunakan <strong>Gemini</strong>. Simpan API key sebelum materi diproses.
            </p>
          </div>
          {statusQuery.isLoading ? (
            <span className="rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-foreground">
              Memeriksa koneksi...
            </span>
          ) : (
            <span className="rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-foreground">
              {hasCredential ? "Koneksi Gemini aktif" : "Koneksi Gemini belum aktif"}
            </span>
          )}
        </div>

        {statusQuery.isError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Status koneksi belum tersedia</AlertTitle>
            <AlertDescription>Status koneksi Gemini belum bisa dimuat. Muat ulang lalu coba lagi.</AlertDescription>
          </Alert>
        ) : null}

        {!statusQuery.isLoading && !hasCredential ? (
          <div className="rounded-[1.2rem] border border-amber-500/30 bg-amber-500/10 px-6 py-6 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              Kredensial AI Belum Diatur
            </div>
            <p className="text-sm text-amber-800/80 dark:text-amber-300/80">
              Anda membutuhkan kunci API Gemini untuk dapat membuat Flash Card. 
              Sistem menggunakan skema Bring Your Own Key (BYOK) secara global.
            </p>
            <button
              onClick={() => navigate("/app/settings/ai-config")}
              className="mt-2 w-fit px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Atur Kredensial AI Sekarang
            </button>
          </div>
        ) : null}
      </Card>

      <Card className="space-y-3 px-5 py-5">
        <h1 className="text-3xl font-semibold leading-tight text-foreground">Buat materi flash card</h1>
        <p className="text-sm leading-7 text-muted-foreground">
          Materi baru tampil ke siswa setelah ditinjau dan diterbitkan.
        </p>
        {submissionError ? <p className="text-sm leading-7 text-destructive">{submissionError}</p> : null}
        <FlashCardMaterialForm isSubmitDisabled={isSubmitDisabled} isSubmitting={isSubmitting} onSubmit={handleSubmit} />
      </Card>
    </ProductShell>
  );
}

export default FlashCardGeneratorCreatePage;
