import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Loader2, Plus, Filter, Trash2, Pencil, FileText, Image as ImageIcon, CheckSquare, Layers, Database } from "lucide-react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "react-router";
import AdminShell from "../../components/layout/admin-shell";
import ConfirmDialog from "../../components/ui/confirm-dialog";
import ProductShell from "../../components/layout/product-shell";
import Button from "../../components/ui/button";
import { getButtonStyleProps } from "../../components/ui/button";

import {
  deleteQuestion,
  deleteQuestions,
  listQuestionBank,
} from "../../lib/api/question-authoring-api";
import { adminShellMeta, createAdminNavItems } from "../../mocks/admin-content";
import {
  createProductNavItems,
  productShellMeta,
  resolveStudentTierLabel,
} from "../../mocks/student-dashboard";

function QuestionsPage() {
  const location = useLocation();
  const isMentorSurface = location.pathname.startsWith("/app/");
  const [blockFilter, setBlockFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
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
  const basePath = isMentorSurface ? "/app/questions" : "/admin/questions";

  const blockOptions = useMemo(() => {
    const blocks = new Set(
      (questionBankQuery.data ?? [])
        .map((question) => question.blockName)
        .filter((value): value is string => Boolean(value)),
    );

    return Array.from(blocks).sort((left, right) => left.localeCompare(right, "id-ID"));
  }, [questionBankQuery.data]);

  const topicOptions = useMemo(() => {
    const topics = new Set(
      (questionBankQuery.data ?? [])
        .filter((question) => blockFilter === "all" || question.blockName === blockFilter)
        .map((question) => question.topicName)
        .filter((value): value is string => Boolean(value)),
    );

    return Array.from(topics).sort((left, right) => left.localeCompare(right, "id-ID"));
  }, [blockFilter, questionBankQuery.data]);

  const filteredQuestions = useMemo(() => {
    const questions = questionBankQuery.data ?? [];

    return questions.filter((question) => {
      const matchesBlock = blockFilter === "all" || question.blockName === blockFilter;
      const matchesTopic = topicFilter === "all" || question.topicName === topicFilter;

      return matchesBlock && matchesTopic;
    });
  }, [blockFilter, questionBankQuery.data, topicFilter]);

  useEffect(() => {
    const visibleQuestionIds = new Set(filteredQuestions.map((question) => question.id));

    setSelectedQuestionIds((current) => {
      const nextSelection = current.filter((questionId) => visibleQuestionIds.has(questionId));

      return nextSelection.length === current.length ? current : nextSelection;
    });
  }, [filteredQuestions]);

  function handleBlockFilterChange(nextValue: string) {
    setBlockFilter(nextValue);
    setTopicFilter("all");
  }

  const deleteQuestionMutation = useMutation({
    mutationFn: ({ questionId }: { questionId: string }) => deleteQuestion({ questionId }),
    onSuccess: () => {
      setDeleteError(null);
      setSelectedQuestionIds([]);
    },
    onError: (error) => {
      setDeleteError(error instanceof Error ? error.message : "Soal belum berhasil dihapus.");
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["question-bank"],
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: ({ questionIds }: { questionIds: string[] }) => deleteQuestions({ questionIds }),
    onSuccess: () => {
      setDeleteError(null);
      setSelectedQuestionIds([]);
    },
    onError: (error) => {
      setDeleteError(error instanceof Error ? error.message : "Soal terpilih belum berhasil dihapus.");
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["question-bank"],
      });
    },
  });

  function handleQuestionSelectionChange(questionId: string, checked: boolean) {
    setSelectedQuestionIds((current) => {
      if (checked) {
        return current.includes(questionId) ? current : [...current, questionId];
      }

      return current.filter((id) => id !== questionId);
    });
  }

  function handleDeleteQuestion(questionId: string) {
    setPendingDelete({
      kind: "single",
      questionId,
    });
  }

  function handleBulkDelete() {
    if (!selectedQuestionIds.length) {
      return;
    }

    setPendingDelete({
      kind: "bulk",
      questionIds: [...selectedQuestionIds],
    });
  }

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

  const isDeleting = deleteQuestionMutation.isPending || bulkDeleteMutation.isPending;

  const shellChildren = (
    <>
      {questionBankQuery.isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4 border rounded-2xl bg-card/60 shadow-sm backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Daftar soal sedang dimuat.</p>
        </div>
      ) : questionBankQuery.isError ? (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
          <AlertTitle>Bank soal belum tersedia</AlertTitle>
          <AlertDescription>Daftar soal belum bisa dimuat.</AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-6">
          {deleteError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive">
              {deleteError}
            </div>
          ) : null}

          {/* Banner Control Bar */}
          <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-6 shadow-xs lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Daftar soal</h2>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                Cari, pilih, lalu rapikan soal dari satu control bar tanpa membuka banyak halaman.
              </p>
            </div>
            <Link
              {...getButtonStyleProps({
                className: "gap-2 sm:min-w-[11rem] h-10 px-5 text-sm font-bold shadow-md shadow-primary/20",
                size: "sm",
                variant: "primary",
              })}
              to={`${basePath}/new`}
            >
              <Plus className="h-4 w-4" />
              Tambah soal
            </Link>
          </div>

          {/* Main Card Container */}
          <Card className="space-y-6 p-6 border-border/80 bg-card shadow-xs">
            {/* Filter Bar */}
            <div className="flex flex-col gap-4 rounded-xl border border-border/80 bg-muted/30 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <h3 className="text-base font-extrabold tracking-tight text-foreground flex items-center gap-2">
                  <Filter className="h-4 w-4 text-primary" />
                  Filter soal
                </h3>
                <p className="mt-1 text-xs text-muted-foreground leading-normal">
                  Saring berdasarkan blok dan materi, lalu lanjutkan ke edit atau hapus.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="text-xs font-bold text-foreground grid gap-1.5">
                  Blok
                  <select
                    className="h-10 rounded-xl border border-border/80 bg-background px-3 text-xs font-semibold text-foreground transition-all focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer min-w-44"
                    onChange={(event) => handleBlockFilterChange(event.target.value)}
                    value={blockFilter}
                  >
                    <option value="all">Semua blok</option>
                    {blockOptions.map((blockName) => (
                      <option key={blockName} value={blockName}>
                        {blockName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-bold text-foreground grid gap-1.5">
                  Materi
                  <select
                    className="h-10 rounded-xl border border-border/80 bg-background px-3 text-xs font-semibold text-foreground transition-all focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer min-w-44"
                    onChange={(event) => setTopicFilter(event.target.value)}
                    value={topicFilter}
                  >
                    <option value="all">Semua materi</option>
                    {topicOptions.map((topicName) => (
                      <option key={topicName} value={topicName}>
                        {topicName}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {/* Selection Status Banner */}
            <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs font-medium text-foreground flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-primary" />
                {selectedQuestionIds.length
                  ? `${selectedQuestionIds.length} soal dipilih dan siap dirapikan.`
                  : "Pilih soal untuk dihapus bila memang sudah tidak dipakai."}
              </span>
              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={selectedQuestionIds.length === 0 || isDeleting}
                  onClick={handleBulkDelete}
                  size="sm"
                  variant="destructive"
                  className="h-9 text-xs font-bold px-4"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Hapus terpilih
                </Button>
              </div>
            </div>

            {/* Question Cards Grid */}
            {filteredQuestions.length ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {filteredQuestions.map((question) => (
                  <Card 
                    key={question.id} 
                    className="p-5 border-border/80 bg-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30 flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <label className="inline-flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer">
                            <input
                              aria-label={`Pilih soal ${question.stem}`}
                              checked={selectedQuestionIds.includes(question.id)}
                              className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                              onChange={(event) => handleQuestionSelectionChange(question.id, event.target.checked)}
                              type="checkbox"
                            />
                            <span>Pilih soal</span>
                          </label>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge 
                              variant={question.status === "published" ? "outline" : "secondary"}
                              className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 ${
                                question.status === "published"
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                  : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                              }`}
                            >
                              {question.statusLabel}
                            </Badge>
                            {question.blockName ? (
                              <Badge variant="secondary" className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5">
                                {question.blockName}
                              </Badge>
                            ) : null}
                            {question.topicName ? (
                              <Badge variant="secondary" className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5">
                                {question.topicName}
                              </Badge>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col">
                          <Link
                            {...getButtonStyleProps({
                              size: "sm",
                              variant: "outline",
                              className: "h-8 text-xs font-semibold px-3",
                            })}
                            to={`${basePath}/${question.id}/edit`}
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Edit soal
                          </Link>
                          <Button
                            disabled={isDeleting}
                            onClick={() => handleDeleteQuestion(question.id)}
                            size="sm"
                            variant="destructive"
                            className="h-8 text-xs font-semibold px-3"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Hapus soal
                          </Button>
                        </div>
                      </div>

                      <h4 className="text-sm font-semibold leading-relaxed text-foreground line-clamp-3">
                        {question.stem}
                      </h4>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-3 mt-3 border-t border-border/40">
                      {question.hasQuestionImage ? (
                        <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground bg-muted/30">
                          <ImageIcon className="h-3 w-3 mr-1 text-primary" />
                          Gambar soal
                        </Badge>
                      ) : null}
                      {question.hasExplanationText ? (
                        <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground bg-muted/30">
                          <FileText className="h-3 w-3 mr-1 text-emerald-500" />
                          Pembahasan teks
                        </Badge>
                      ) : null}
                      {question.hasExplanationImage ? (
                        <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground bg-muted/30">
                          <ImageIcon className="h-3 w-3 mr-1 text-amber-500" />
                          Gambar pembahasan
                        </Badge>
                      ) : null}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Alert className="border-border/80 bg-card/60">
                <AlertTitle>Soal tidak ditemukan</AlertTitle>
                <AlertDescription>Tidak ada soal yang cocok dengan filter ini.</AlertDescription>
              </Alert>
            )}
          </Card>
        </div>
      )}

      <ConfirmDialog
        confirmLabel={pendingDelete?.kind === "bulk" ? `Hapus ${pendingDelete.questionIds.length} soal` : "Hapus soal"}
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
        title={pendingDelete?.kind === "bulk" ? `Hapus ${pendingDelete.questionIds.length} soal?` : "Hapus soal ini?"}
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
          {/* Top Header Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/40">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                Bank Soal
              </h1>
              <p className="text-base text-muted-foreground mt-2">
                Kelola dan perbarui soal dari satu tempat.
              </p>
            </div>
          </div>

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
