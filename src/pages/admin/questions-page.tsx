import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useSearchParams } from "react-router";
import { Loader2 } from "lucide-react";

import AdminShell from "../../components/layout/admin-shell";
import ProductShell from "../../components/layout/product-shell";
import ConfirmDialog from "../../components/ui/confirm-dialog";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";

import {
  deleteQuestion,
  deleteQuestions,
  listQuestionBank,
} from "../../lib/api/question-authoring-api";
import { createAdminNavItems } from "../../mocks/admin-content";
import {
  createProductNavItems,
  productShellMeta,
  resolveStudentTierLabel,
} from "../../mocks/student-dashboard";
import { findBlockDefinition } from "./questions-page-blocks";
import QuestionBlockSelectionView from "./components/question-block-selection-view";
import QuestionBlockListView from "./components/question-block-list-view";

function QuestionsPage() {
  const location = useLocation();
  const isMentorSurface = location.pathname.startsWith("/app/");
  const basePath = isMentorSurface ? "/app/questions" : "/admin/questions";

  const [searchParams, setSearchParams] = useSearchParams();
  const blockParam = searchParams.get("block");
  const activeBlock = findBlockDefinition(blockParam);

  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<
    | {
        kind: "single";
        questionId: string;
      }
    | {
        kind: "bulk";
        questionIds: string[];
      }
    | null
  >(null);

  const queryClient = useQueryClient();
  const questionBankQuery = useQuery({
    queryKey: ["question-bank"],
    queryFn: () => listQuestionBank(),
  });
  const questions = questionBankQuery.data ?? [];

  const deleteQuestionMutation = useMutation({
    mutationFn: ({ questionId }: { questionId: string }) =>
      deleteQuestion({ questionId }),
    onSuccess: () => {
      setDeleteError(null);
    },
    onError: (error) => {
      setDeleteError(
        error instanceof Error ? error.message : "Soal belum berhasil dihapus."
      );
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["question-bank"],
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: ({ questionIds }: { questionIds: string[] }) =>
      deleteQuestions({ questionIds }),
    onSuccess: () => {
      setDeleteError(null);
    },
    onError: (error) => {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "Soal terpilih belum berhasil dihapus."
      );
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["question-bank"],
      });
    },
  });

  function handleConfirmDelete() {
    if (!pendingDelete) {
      return;
    }

    setDeleteError(null);

    if (pendingDelete.kind === "single") {
      deleteQuestionMutation.mutate({
        questionId: pendingDelete.questionId,
      });
      setPendingDelete(null);
      return;
    }

    bulkDeleteMutation.mutate({
      questionIds: pendingDelete.questionIds,
    });
    setPendingDelete(null);
  }

  const isDeleting =
    deleteQuestionMutation.isPending || bulkDeleteMutation.isPending;

  const shellChildren = (
    <>
      {questionBankQuery.isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4 border rounded-2xl bg-card/60 shadow-sm backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">
            Daftar soal sedang dimuat.
          </p>
        </div>
      ) : questionBankQuery.isError ? (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
          <AlertTitle>Bank soal belum tersedia</AlertTitle>
          <AlertDescription>Daftar soal belum bisa dimuat.</AlertDescription>
        </Alert>
      ) : !activeBlock ? (
        <QuestionBlockSelectionView
          basePath={basePath}
          onSelectBlock={(blockId) => {
            setSearchParams({ block: blockId });
          }}
          questions={questions}
        />
      ) : (
        <QuestionBlockListView
          activeBlock={activeBlock}
          basePath={basePath}
          deleteError={deleteError}
          isDeleting={isDeleting}
          onBack={() => {
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.delete("block");
              return next;
            });
          }}
          onBulkDelete={(questionIds) => {
            setPendingDelete({ kind: "bulk", questionIds });
          }}
          onDeleteQuestion={(questionId) => {
            setPendingDelete({ kind: "single", questionId });
          }}
          questions={questions}
        />
      )}

      <ConfirmDialog
        confirmLabel={
          pendingDelete?.kind === "bulk"
            ? `Hapus ${pendingDelete.questionIds.length} soal`
            : "Hapus soal"
        }
        description={
          pendingDelete?.kind === "bulk"
            ? `${pendingDelete.questionIds.length} soal akan dihapus dari bank soal. Tindakan ini tidak bisa dibatalkan.`
            : "Soal ini akan dihapus dari bank soal. Tindakan ini tidak bisa dibatalkan."
        }
        isPending={isDeleting}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
        open={Boolean(pendingDelete)}
        pendingLabel="Menghapus..."
        title={
          pendingDelete?.kind === "bulk"
            ? `Hapus ${pendingDelete.questionIds.length} soal?`
            : "Hapus soal ini?"
        }
      />
    </>
  );

  if (isMentorSurface) {
    return (
      <ProductShell
        brand={productShellMeta.brand}
        tierLabel={resolveStudentTierLabel("mentor")}
        navItems={createProductNavItems("/app/questions", "mentor")}
      >
        <div className="flex flex-col w-full py-4 space-y-6">
          {shellChildren}
        </div>
      </ProductShell>
    );
  }

  return (
    <AdminShell
      title="Bank Soal"
      description="Kelola soal dan rapikan isinya dari halaman ini."
      navItems={createAdminNavItems("/admin/questions")}
    >
      {shellChildren}
    </AdminShell>
  );
}

export default QuestionsPage;
