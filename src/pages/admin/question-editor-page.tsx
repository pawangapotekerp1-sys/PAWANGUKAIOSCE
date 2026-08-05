import { useEffect, useMemo, useState } from "react";
import { Card } from "../../components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Loader2, Save, ArrowLeft, FileText, CheckCircle2, FolderTree, BookOpen, Image as ImageIcon, Sparkles, Upload } from "lucide-react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import AdminShell from "../../components/layout/admin-shell";
import ProductShell from "../../components/layout/product-shell";
import Button from "../../components/ui/button";
import { getButtonStyleProps } from "../../components/ui/button";

import {
  createQuestion,
  getQuestionEditorData,
  listQuestionTaxonomy,
  updateQuestion,
  uploadQuestionMedia,
  type QuestionFormInput,
} from "../../lib/api/question-authoring-api";
import { adminShellMeta, createAdminNavItems } from "../../mocks/admin-content";
import {
  createProductNavItems,
  productShellMeta,
  resolveStudentTierLabel,
} from "../../mocks/student-dashboard";

type OptionKey = "A" | "B" | "C" | "D" | "E";

const optionFields: OptionKey[] = ["A", "B", "C", "D", "E"];

type EditorFormState = {
  stem: string;
  blockId: string;
  topicId: string;
  status: "draft" | "published" | "archived";
  correctOptionKey: OptionKey | "";
  explanationText: string;
  questionImagePath: string | null;
  questionImageUrl: string | null;
  explanationImagePath: string | null;
  explanationImageUrl: string | null;
  options: Record<OptionKey, string>;
};

const emptyFormState: EditorFormState = {
  stem: "",
  blockId: "",
  topicId: "",
  status: "draft",
  correctOptionKey: "",
  explanationText: "",
  questionImagePath: null,
  questionImageUrl: null,
  explanationImagePath: null,
  explanationImageUrl: null,
  options: {
    A: "",
    B: "",
    C: "",
    D: "",
    E: "",
  },
};

function buildInitialFormState() {
  return {
    ...emptyFormState,
    options: { ...emptyFormState.options },
  };
}

function extractFileName(path: string | null) {
  if (!path) {
    return "Belum ada file";
  }

  const segments = path.split("/");

  return segments[segments.length - 1] || path;
}

function QuestionEditorPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMentorSurface = location.pathname.startsWith("/app/");
  const { questionId } = useParams();
  const isEditMode = Boolean(questionId);
  const [formState, setFormState] = useState<EditorFormState>(() => buildInitialFormState());
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const backHref = isMentorSurface ? "/app/questions" : "/admin/questions";

  const taxonomyQuery = useQuery({
    queryKey: ["question-taxonomy"],
    queryFn: () => listQuestionTaxonomy(),
  });
  const editorQuery = useQuery({
    queryKey: ["question-editor", questionId],
    queryFn: () => getQuestionEditorData({ questionId: questionId ?? "" }),
    enabled: isEditMode,
  });

  useEffect(() => {
    if (!editorQuery.data) {
      return;
    }

    const nextOptions: Record<OptionKey, string> = {
      A: "",
      B: "",
      C: "",
      D: "",
      E: "",
    };

    editorQuery.data.options.forEach((option) => {
      if (
        option.key === "A" ||
        option.key === "B" ||
        option.key === "C" ||
        option.key === "D" ||
        option.key === "E"
      ) {
        nextOptions[option.key] = option.text;
      }
    });

    setFormState({
      stem: editorQuery.data.stem,
      blockId: editorQuery.data.blockId ?? "",
      topicId: editorQuery.data.topicId ?? "",
      status: editorQuery.data.status as EditorFormState["status"],
      correctOptionKey: (editorQuery.data.correctOptionKey as OptionKey | null) ?? "",
      explanationText: editorQuery.data.explanationText ?? "",
      questionImagePath: editorQuery.data.questionImagePath,
      questionImageUrl: editorQuery.data.questionImageUrl,
      explanationImagePath: editorQuery.data.explanationImagePath,
      explanationImageUrl: editorQuery.data.explanationImageUrl,
      options: nextOptions,
    });
  }, [editorQuery.data]);

  useEffect(() => {
    if (isEditMode || !taxonomyQuery.data?.length) {
      return;
    }

    const firstBlock = taxonomyQuery.data[0];
    const firstTopicId = firstBlock.topics[0]?.id ?? "";

    setFormState((current) => {
      if (current.blockId || current.topicId) {
        return current;
      }

      return {
        ...current,
        blockId: firstBlock.id,
        topicId: firstTopicId,
      };
    });
  }, [isEditMode, taxonomyQuery.data]);

  const availableTopics = useMemo(() => {
    const selectedBlock = (taxonomyQuery.data ?? []).find((block) => block.id === formState.blockId);

    return selectedBlock?.topics ?? [];
  }, [formState.blockId, taxonomyQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (input: QuestionFormInput) => {
      if (isEditMode && questionId) {
        return updateQuestion({ questionId, input });
      }

      return createQuestion({ input });
    },
    onSuccess: async () => {
      setSaveError(null);
      setSaveMessage(null);
      await queryClient.invalidateQueries({
        queryKey: ["question-bank"],
      });
      navigate(backHref, { replace: true });
    },
    onError: (error) => {
      setSaveMessage(null);
      setSaveError(error instanceof Error ? error.message : "Soal belum berhasil disimpan.");
    },
  });

  const mediaMutation = useMutation({
    mutationFn: async ({
      kind,
      file,
    }: {
      kind: "question" | "explanation";
      file: File;
    }) =>
      uploadQuestionMedia({
        questionId: questionId ?? "draft",
        kind,
        file,
      }),
    onError: (error) => {
      setSaveMessage(null);
      setSaveError(error instanceof Error ? error.message : "Gambar belum berhasil diunggah.");
    },
  });

  function updateFormState(updater: (current: EditorFormState) => EditorFormState) {
    setFormState((current) => updater(current));
  }

  function handleBlockChange(nextBlockId: string) {
    updateFormState((current) => ({
      ...current,
      blockId: nextBlockId,
      topicId: "",
    }));
  }

  async function handleMediaChange(kind: "question" | "explanation", fileList: FileList | null) {
    const file = fileList?.[0];

    if (!file) {
      return;
    }

    setSaveError(null);
    setSaveMessage(null);
    const uploaded = await mediaMutation.mutateAsync({ kind, file });

    updateFormState((current) => ({
      ...current,
      questionImagePath: kind === "question" ? uploaded.path : current.questionImagePath,
      questionImageUrl: kind === "question" ? uploaded.signedUrl : current.questionImageUrl,
      explanationImagePath: kind === "explanation" ? uploaded.path : current.explanationImagePath,
      explanationImageUrl: kind === "explanation" ? uploaded.signedUrl : current.explanationImageUrl,
    }));
  }

  function buildQuestionInput(): QuestionFormInput | null {
    const trimmedStem = formState.stem.trim();
    const normalizedOptions = optionFields
      .map((key) => ({
        key,
        text: formState.options[key].trim(),
      }))
      .filter((option) => option.text.length > 0);
    const hasCorrectOption = normalizedOptions.some((option) => option.key === formState.correctOptionKey);

    if (
      trimmedStem.length === 0 ||
      normalizedOptions.length < 2 ||
      !hasCorrectOption ||
      formState.blockId.length === 0 ||
      formState.topicId.length === 0
    ) {
      return null;
    }

    return {
      stem: trimmedStem,
      blockId: formState.blockId,
      topicId: formState.topicId,
      status: formState.status,
      questionImagePath: formState.questionImagePath,
      explanationText: formState.explanationText.trim() || null,
      explanationImagePath: formState.explanationImagePath,
      options: normalizedOptions.map((option) => ({
        key: option.key,
        text: option.text,
        isCorrect: option.key === formState.correctOptionKey,
      })),
    };
  }

  function handleSave() {
    setSaveMessage(null);
    setSaveError(null);

    const input = buildQuestionInput();

    if (!input) {
      setSaveError("Lengkapi soal, minimal dua opsi jawaban, kunci jawaban, blok, dan materi.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    saveMutation.mutate(input);
  }

  const isLoading = taxonomyQuery.isLoading || (isEditMode && editorQuery.isLoading);
  const isError = taxonomyQuery.isError || editorQuery.isError;
  const shellChildren = isLoading ? (
    <div className="flex flex-col items-center justify-center py-16 space-y-4 border rounded-2xl bg-card/60 shadow-sm backdrop-blur-sm">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm font-medium text-muted-foreground">Editor soal sedang dimuat.</p>
    </div>
  ) : isError ? (
    <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
      <AlertTitle>Editor soal belum tersedia</AlertTitle>
      <AlertDescription>Editor soal belum bisa dibuka.</AlertDescription>
    </Alert>
  ) : isEditMode && !editorQuery.data ? (
    <Alert className="border-border/80 bg-card/60">
      <AlertTitle>Soal tidak ditemukan</AlertTitle>
      <AlertDescription>Soal yang ingin Anda ubah tidak ditemukan.</AlertDescription>
    </Alert>
  ) : (
    <div className="space-y-6">
      {saveMessage ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-semibold text-emerald-600">
          {saveMessage}
        </div>
      ) : null}
      {saveError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive">
          {saveError}
        </div>
      ) : null}

      <Card className="space-y-6 p-6 border-border/80 bg-card shadow-xs">
        {/* Stem Section */}
        <div className="rounded-xl border border-border/80 bg-muted/30 p-5 space-y-3">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Mulai dari inti soal
          </p>
          <label className="block text-sm font-bold text-foreground space-y-2" htmlFor="question-stem">
            Soal
            <textarea
              id="question-stem"
              className="min-h-36 w-full rounded-xl border border-border/80 bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-all leading-relaxed"
              onChange={(event) => updateFormState((current) => ({ ...current, stem: event.target.value }))}
              value={formState.stem}
            />
          </label>
        </div>

        {/* Question Image Section */}
        <div className="text-sm font-bold text-foreground space-y-2">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase font-mono tracking-wider">
            <ImageIcon className="h-3.5 w-3.5 text-primary" />
            Gambar soal
          </span>
          <div className="space-y-3 rounded-xl border border-border/80 bg-muted/30 p-4">
            <label
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 text-xs font-semibold text-primary cursor-pointer transition-all duration-150 active:scale-95 shadow-2xs"
              htmlFor="question-image"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Pilih gambar</span>
              <span className="text-muted-foreground font-normal">
                {extractFileName(formState.questionImagePath)}
              </span>
            </label>
            <input
              id="question-image"
              accept="image/*"
              aria-label="Gambar soal"
              className="sr-only"
              onChange={(event) => {
                void handleMediaChange("question", event.target.files);
              }}
              type="file"
            />
            {formState.questionImageUrl ? (
              <img
                alt="Pratinjau gambar soal"
                className="max-h-64 w-full rounded-xl border border-border/80 bg-background object-contain"
                src={formState.questionImageUrl}
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                Belum ada gambar soal.
              </p>
            )}
          </div>
        </div>

        {/* Options Section */}
        <div className="space-y-4 rounded-xl border border-border/80 bg-muted/30 p-5">
          <div>
            <h2 className="text-base font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Pilihan jawaban
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Isi opsi yang diperlukan, lalu tentukan jawaban yang benar.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {optionFields.map((key) => (
              <label key={key} className="text-xs font-bold text-foreground grid gap-1.5" htmlFor={`option-${key}`}>
                <span className="flex items-center gap-1.5 font-mono text-muted-foreground">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary font-bold text-[11px]">
                    {key}
                  </span>
                  Opsi {key}
                </span>
                <input
                  id={`option-${key}`}
                  className="h-10 w-full rounded-xl border border-border/80 bg-background px-4 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-all font-normal"
                  onChange={(event) =>
                    updateFormState((current) => ({
                      ...current,
                      options: {
                        ...current.options,
                        [key]: event.target.value,
                      },
                    }))
                  }
                  value={formState.options[key]}
                />
              </label>
            ))}
          </div>
        </div>

        {/* Classification Section */}
        <div className="space-y-4 rounded-xl border border-border/80 bg-muted/30 p-5">
          <div>
            <h2 className="text-base font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <FolderTree className="h-4 w-4 text-primary" />
              Atur klasifikasi soal
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Pilih blok, materi, kunci jawaban, dan status sebelum soal disimpan.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-foreground grid gap-1.5" htmlFor="question-block">
              Blok
              <select
                id="question-block"
                className="h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-xs font-semibold text-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
                onChange={(event) => handleBlockChange(event.target.value)}
                value={formState.blockId}
              >
                <option value="">Pilih blok</option>
                {(taxonomyQuery.data ?? []).map((block) => (
                  <option key={block.id} value={block.id}>
                    {block.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-bold text-foreground grid gap-1.5" htmlFor="question-topic">
              Materi
              <select
                id="question-topic"
                className="h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-xs font-semibold text-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
                onChange={(event) => updateFormState((current) => ({ ...current, topicId: event.target.value }))}
                value={formState.topicId}
              >
                <option value="">Pilih materi</option>
                {availableTopics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-foreground grid gap-1.5" htmlFor="question-correct-option">
              Kunci jawaban
              <select
                id="question-correct-option"
                className="h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-xs font-semibold text-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
                onChange={(event) =>
                  updateFormState((current) => ({
                    ...current,
                    correctOptionKey: event.target.value as OptionKey | "",
                  }))
                }
                value={formState.correctOptionKey}
              >
                <option value="" disabled>Pilih salah satu</option>
                {optionFields.map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-bold text-foreground grid gap-1.5" htmlFor="question-status">
              Status
              <select
                id="question-status"
                className="h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-xs font-semibold text-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
                onChange={(event) =>
                  updateFormState((current) => ({
                    ...current,
                    status: event.target.value as EditorFormState["status"],
                  }))
                }
                value={formState.status}
              >
                <option value="draft">Draft</option>
                <option value="published">Tayang</option>
                <option value="archived">Arsip</option>
              </select>
            </label>
          </div>
        </div>

        {/* Explanation Text */}
        <label className="block text-sm font-bold text-foreground space-y-2" htmlFor="question-explanation">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase font-mono tracking-wider">
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            Pembahasan
          </span>
          <textarea
            id="question-explanation"
            className="min-h-28 w-full rounded-xl border border-border/80 bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-all leading-relaxed font-normal"
            onChange={(event) =>
              updateFormState((current) => ({
                ...current,
                explanationText: event.target.value,
              }))
            }
            value={formState.explanationText}
          />
        </label>

        {/* Explanation Image */}
        <div className="space-y-2">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase font-mono tracking-wider font-bold">
            <ImageIcon className="h-3.5 w-3.5 text-amber-500" />
            Gambar pembahasan
          </span>
          <div className="space-y-3 rounded-xl border border-border/80 bg-muted/30 p-4">
            <label
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 text-xs font-semibold text-primary cursor-pointer transition-all duration-150 active:scale-95 shadow-2xs"
              htmlFor="explanation-image"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Pilih gambar</span>
              <span className="text-muted-foreground font-normal">
                {extractFileName(formState.explanationImagePath)}
              </span>
            </label>
            <input
              id="explanation-image"
              accept="image/*"
              aria-label="Gambar pembahasan"
              className="sr-only"
              onChange={(event) => {
                void handleMediaChange("explanation", event.target.files);
              }}
              type="file"
            />
            {formState.explanationImageUrl ? (
              <img
                alt="Pratinjau gambar pembahasan"
                className="max-h-64 w-full rounded-xl border border-border/80 bg-background object-contain"
                src={formState.explanationImageUrl}
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                Belum ada gambar pembahasan.
              </p>
            )}
          </div>
        </div>

        {/* Footer Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 border-t border-border/40 pt-4">
          <Button
            disabled={saveMutation.isPending}
            loading={saveMutation.isPending}
            loadingLabel="Menyimpan..."
            onClick={handleSave}
            size="sm"
            className="h-10 px-5 text-xs font-bold shadow-md shadow-primary/20 cursor-pointer hover:bg-primary/90 transition-all"
          >
            <Save className="h-4 w-4 mr-1.5" />
            Simpan soal
          </Button>
          <Link
            {...getButtonStyleProps({
              size: "sm",
              variant: "outline",
              className: "h-10 px-4 text-xs font-semibold cursor-pointer",
            })}
            to={backHref}
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Kembali ke bank soal
          </Link>
        </div>
      </Card>
    </div>
  );

  if (isMentorSurface) {
    return (
      <ProductShell
        brand={productShellMeta.brand}
        tierLabel={resolveStudentTierLabel("mentor")}
        navItems={createProductNavItems("/app/questions", "mentor")}
      >
        <div className="flex flex-col w-full py-4 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/40">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Link
                  to={backHref}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-primary/30 bg-primary/5 px-4 py-2 text-sm font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200 shadow-2xs group"
                >
                  <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  <span>Kembali ke bank soal</span>
                </Link>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                Editor Soal
              </h1>
              <p className="text-base text-muted-foreground mt-2">
                Tulis atau ubah soal, lalu simpan.
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
      title="Editor Soal"
      description="Tulis atau ubah soal di sini."
      navItems={createAdminNavItems("/admin/questions")}
    >
      {shellChildren}
    </AdminShell>
  );
}

export default QuestionEditorPage;
