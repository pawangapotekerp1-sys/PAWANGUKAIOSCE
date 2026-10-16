import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  ArrowLeft,
  CheckSquare,
  FileText,
  Filter,
  Image as ImageIcon,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../../../components/ui/alert";
import { Badge } from "../../../components/ui/badge";
import { Button, getButtonStyleProps } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import type { QuestionBankItemViewModel } from "../../../lib/mappers/question-authoring-mappers";
import {
  type BlockDefinition,
  filterBlockQuestions,
  getUniqueTopicsForBlock,
  isQuestionInBlock,
} from "../questions-page-blocks";

export interface QuestionBlockListViewProps {
  basePath: string; // "/admin/questions" or "/app/questions"
  activeBlock: BlockDefinition;
  questions: QuestionBankItemViewModel[];
  onBack: () => void;
  onDeleteQuestion: (questionId: string) => void;
  onBulkDelete: (questionIds: string[]) => void;
  isDeleting?: boolean;
  deleteError?: string | null;
}

export default function QuestionBlockListView({
  basePath,
  activeBlock,
  questions,
  onBack,
  onDeleteQuestion,
  onBulkDelete,
  isDeleting = false,
  deleteError,
}: QuestionBlockListViewProps) {
  const [topicFilter, setTopicFilter] = useState("all");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

  const topicOptions = useMemo(() => {
    return getUniqueTopicsForBlock(questions, activeBlock);
  }, [questions, activeBlock]);

  const hasUnassignedTopic = useMemo(() => {
    return questions.some(
      (q) => isQuestionInBlock(q, activeBlock) && (!q.topicName || !q.topicName.trim())
    );
  }, [questions, activeBlock]);

  const filteredQuestions = useMemo(() => {
    return filterBlockQuestions(questions, activeBlock, topicFilter);
  }, [questions, activeBlock, topicFilter]);

  // Clear selections when filtered questions change
  useEffect(() => {
    const visibleQuestionIds = new Set(filteredQuestions.map((q) => q.id));

    setSelectedQuestionIds((current) => {
      const nextSelection = current.filter((questionId) => visibleQuestionIds.has(questionId));
      return nextSelection.length === current.length ? current : nextSelection;
    });
  }, [filteredQuestions]);

  const isAllSelected =
    filteredQuestions.length > 0 &&
    filteredQuestions.every((q) => selectedQuestionIds.includes(q.id));

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedQuestionIds(filteredQuestions.map((q) => q.id));
    } else {
      setSelectedQuestionIds([]);
    }
  };

  const handleQuestionSelectionChange = (questionId: string, checked: boolean) => {
    setSelectedQuestionIds((current) => {
      if (checked) {
        return current.includes(questionId) ? current : [...current, questionId];
      }
      return current.filter((id) => id !== questionId);
    });
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-2 text-muted-foreground hover:text-foreground cursor-pointer -ml-2 font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Pilihan Blok
        </Button>
      </div>

      {/* Block Header Banner */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-6 shadow-xs lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl space-y-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              {activeBlock.name}
            </h1>
            <Badge variant="secondary" className="font-semibold">
              {filteredQuestions.length} Soal
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {activeBlock.description}
          </p>
        </div>
        <Link
          {...getButtonStyleProps({
            className: "gap-2 sm:min-w-[11rem] h-10 px-5 text-sm font-bold shadow-md shadow-primary/20",
            size: "sm",
            variant: "primary",
          })}
          to={`${basePath}/new?block=${activeBlock.id}`}
        >
          <Plus className="h-4 w-4" />
          Tambah soal
        </Link>
      </div>

      {/* Main Content Card: Filter, Bulk Actions & Question List */}
      <Card className="p-6 border-border/80 bg-card space-y-6">
        {/* Filter Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Filter className="h-4 w-4 text-primary" />
            <span>Filter Soal</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="text-xs font-bold text-foreground grid gap-1.5">
              Materi
              <select
                aria-label="Materi"
                className="h-10 rounded-xl border border-border/80 bg-background px-3 text-xs font-semibold text-foreground transition-all focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer min-w-44"
                value={topicFilter}
                onChange={(event) => setTopicFilter(event.target.value)}
              >
                <option value="all">Semua materi</option>
                {hasUnassignedTopic ? (
                  <option value="unassigned">Tanpa materi</option>
                ) : null}
                {topicOptions.map((topicName) => (
                  <option key={topicName} value={topicName}>
                    {topicName}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Selection Status & Bulk Actions Banner */}
        <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer">
              <input
                type="checkbox"
                aria-label="Pilih semua"
                checked={isAllSelected}
                disabled={filteredQuestions.length === 0}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                onChange={(e) => handleToggleSelectAll(e.target.checked)}
              />
              <span>Pilih semua</span>
            </label>
            <span className="text-xs font-medium text-foreground flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-primary" />
              {`${selectedQuestionIds.length} soal dipilih.`}
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={selectedQuestionIds.length === 0 || isDeleting}
              onClick={() => onBulkDelete(selectedQuestionIds)}
              size="sm"
              variant="destructive"
              className="h-9 text-xs font-bold px-4"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Hapus terpilih
            </Button>
          </div>
        </div>

        {/* Delete Error Banner */}
        {deleteError ? (
          <Alert variant="destructive">
            <AlertTitle>Terjadi kesalahan</AlertTitle>
            <AlertDescription>{deleteError}</AlertDescription>
          </Alert>
        ) : null}

        {/* Question Cards Grid or Empty State */}
        {filteredQuestions.length > 0 ? (
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
                          onChange={(event) =>
                            handleQuestionSelectionChange(question.id, event.target.checked)
                          }
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
                          {question.statusLabel || (question.status === "published" ? "Published" : "Draft")}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-semibold px-2 py-0.5 ${
                            !question.topicName
                              ? "text-destructive/80 border-destructive/20 bg-destructive/10"
                              : "text-muted-foreground"
                          }`}
                        >
                          {question.topicName || "Tidak memiliki materi"}
                        </Badge>
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
                        onClick={() => onDeleteQuestion(question.id)}
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
                    <Badge
                      variant="outline"
                      className="text-[10px] font-medium text-muted-foreground bg-muted/30"
                    >
                      <ImageIcon className="h-3 w-3 mr-1 text-primary" />
                      Gambar soal
                    </Badge>
                  ) : null}
                  {question.hasExplanationText ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-medium text-muted-foreground bg-muted/30"
                    >
                      <FileText className="h-3 w-3 mr-1 text-emerald-500" />
                      Pembahasan
                    </Badge>
                  ) : null}
                  {question.hasExplanationImage ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-medium text-muted-foreground bg-muted/30"
                    >
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
            <AlertDescription>
              Tidak ada soal yang cocok dengan filter materi ini pada blok {activeBlock.name}.
            </AlertDescription>
          </Alert>
        )}
      </Card>
    </div>
  );
}
