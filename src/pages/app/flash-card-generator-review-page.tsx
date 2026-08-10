import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import FlashCardReviewEditor from "../../components/flash-cards/flash-card-review-editor";
import ProductShell from "../../components/layout/product-shell";
import { Alert, AlertTitle, AlertDescription } from "../../components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import {
  getFlashCardMaterialDetail,
  publishFlashCardMaterial,
  saveFlashCardMaterialReview,
  retryFlashCardMaterialProcessing,
} from "../../lib/api/flash-card-api";
import { productShellMeta } from "../../mocks/student-dashboard";
import { useStudentShell } from "./use-student-shell";
import { useNavigate, useParams } from "react-router";

function FlashCardGeneratorReviewPage() {
  const { materialId = "" } = useParams();
  const navigate = useNavigate();
  const studentShell = useStudentShell(`/app/flash-card-generator/${materialId}`);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const detailQuery = useQuery({
    queryKey: ["mentor-flash-card-material", materialId],
    enabled: materialId.length > 0,
    queryFn: () => getFlashCardMaterialDetail({ materialId }),
  });

  async function handleSave(input: {
    title: string;
    globalSummary: string;
    subtopics: Array<{
      title: string;
      summary: string;
      cards: Array<{
        frontText: string;
        backText: string;
      }>;
    }>;
  }) {
    setIsSaving(true);
    setActionError(null);

    try {
      await saveFlashCardMaterialReview({
        materialId,
        title: input.title,
        globalSummary: input.globalSummary,
        subtopics: input.subtopics,
      });
      await detailQuery.refetch();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Perubahan materi belum berhasil disimpan.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePublish() {
    setIsPublishing(true);
    setActionError(null);

    try {
      await publishFlashCardMaterial({
        materialId,
      });
      navigate("/app/flash-card-generator");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Materi belum berhasil diterbitkan.");
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleRetry() {
    setIsRetrying(true);
    setActionError(null);

    try {
      await retryFlashCardMaterialProcessing({
        materialId,
      });
      await detailQuery.refetch();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Gagal mencoba ulang pemrosesan.");
    } finally {
      setIsRetrying(false);
    }
  }

  return (
    <ProductShell
      brand={productShellMeta.brand}
      navItems={studentShell.navItems}
      tierLabel={studentShell.tierLabel}
    >
      {actionError ? <p className="mb-4 text-sm leading-7 text-destructive">{actionError}</p> : null}
      {detailQuery.isLoading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Materi sedang disiapkan untuk ditinjau...</p>
        </div>
      ) : detailQuery.isError || !detailQuery.data ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Halaman review belum tersedia</AlertTitle>
          <AlertDescription>Materi flash card belum berhasil dimuat.</AlertDescription>
        </Alert>
      ) : (
        <FlashCardReviewEditor
          detail={detailQuery.data}
          isPublishing={isPublishing}
          isSaving={isSaving}
          isRetrying={isRetrying}
          onPublish={handlePublish}
          onRetryProcessing={handleRetry}
          onSave={handleSave}
        />
      )}
    </ProductShell>
  );
}

export default FlashCardGeneratorReviewPage;
