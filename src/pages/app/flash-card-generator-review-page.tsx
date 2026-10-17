import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import FlashCardReviewEditor from "../../components/flash-cards/flash-card-review-editor";
import ProductShell from "../../components/layout/product-shell";
import { Alert, AlertTitle, AlertDescription } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";
import {
  getFlashCardMaterialDetail,
  publishFlashCardMaterial,
  saveFlashCardMaterialReview,
  retryFlashCardMaterialProcessing,
  auditRepairFlashCardMaterial,
  resolveFlashCardConflict,
} from "../../lib/api/flash-card-api";
import { productShellMeta } from "../../mocks/student-dashboard";
import { useStudentShell } from "./use-student-shell";
import { useNavigate, useParams } from "react-router";

function formatErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  const msg = error.message.trim();
  if (msg.includes("too_small") && msg.includes("subtopics")) {
    return "Materi harus memiliki minimal 1 submateri dan kartu sebelum disimpan.";
  }
  if (msg.startsWith("[") && msg.endsWith("]")) {
    try {
      const parsed = JSON.parse(msg);
      if (Array.isArray(parsed) && parsed[0]?.message) {
        return parsed[0].message;
      }
    } catch {
      // Fall through to raw message
    }
  }
  return msg || fallback;
}

function FlashCardGeneratorReviewPage() {
  const { materialId = "" } = useParams();
  const navigate = useNavigate();
  const studentShell = useStudentShell(`/app/flash-card-generator/${materialId}`);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ["mentor-flash-card-material", materialId],
    enabled: materialId.length > 0,
    queryFn: () => getFlashCardMaterialDetail({ materialId }),
    refetchInterval: (query) => {
      if (import.meta.env.MODE === "test") {
        return false;
      }
      const status = query.state.data?.material.status;
      return status === "processing" ? 3000 : false;
    },
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
      setActionError(formatErrorMessage(error, "Perubahan materi belum berhasil disimpan."));
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
      setActionError(formatErrorMessage(error, "Materi belum berhasil diterbitkan."));
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
      setActionError(formatErrorMessage(error, "Gagal mencoba ulang pemrosesan."));
    } finally {
      setIsRetrying(false);
    }
  }

  async function handleAuditRepair() {
    setIsAuditing(true);
    setActionError(null);

    try {
      await auditRepairFlashCardMaterial({
        materialId,
      });
      await detailQuery.refetch();
    } catch (error) {
      setActionError(formatErrorMessage(error, "Audit dan perbaikan kualitas belum berhasil."));
    } finally {
      setIsAuditing(false);
    }
  }

  async function handleResolveConflict(input: {
    conflictId: string;
    resolutionStatus: "mentor_clarified" | "externally_verified";
    clinicalClarificationNotes: string;
  }) {
    setActionError(null);

    try {
      await resolveFlashCardConflict({
        materialId,
        conflictId: input.conflictId,
        resolutionStatus: input.resolutionStatus,
        clinicalClarificationNotes: input.clinicalClarificationNotes,
      });
      await detailQuery.refetch();
    } catch (error) {
      setActionError(formatErrorMessage(error, "Klarifikasi konflik belum berhasil disimpan."));
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
      ) : detailQuery.data.material.status === "processing" ? (
        <div className="rounded-3xl border border-border/80 bg-card p-8 shadow-xs text-center space-y-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
          <div className="space-y-2 max-w-lg mx-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {detailQuery.data.material.academicGroupLabel}
            </p>
            <h1 className="text-2xl font-bold text-foreground">
              AI Sedang Menyusun Flash Card
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Materi <strong className="text-foreground">"{detailQuery.data.material.title}"</strong> sedang diproses oleh pipeline Gemini 3.8 Flash. Sistem sedang mengekstrak slide presentasi, membersihkan transkrip, menyusun draf kartu, dan melakukan audit klinis.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3.5 py-1 text-xs font-medium text-foreground">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Pembersihan Transkrip
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3.5 py-1 text-xs font-medium text-foreground">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Alignment Slide PDF
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3.5 py-1 text-xs font-medium text-foreground">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Penyusunan Kartu
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3.5 py-1 text-xs font-medium text-foreground">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Audit Klinis
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            Halaman ini akan otomatis diperbarui begitu kartu siap ditinjau.
          </p>

          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void detailQuery.refetch()}
            >
              Segarkan Status Sekarang
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/app/flash-card-generator")}
            >
              Kembali ke Area Mentor
            </Button>
          </div>
        </div>
      ) : (
        <FlashCardReviewEditor
          detail={detailQuery.data}
          isPublishing={isPublishing}
          isSaving={isSaving}
          isRetrying={isRetrying}
          isAuditing={isAuditing}
          onPublish={handlePublish}
          onRetryProcessing={handleRetry}
          onAuditRepair={handleAuditRepair}
          onResolveConflict={handleResolveConflict}
          onSave={handleSave}
        />
      )}
    </ProductShell>
  );
}

export default FlashCardGeneratorReviewPage;
