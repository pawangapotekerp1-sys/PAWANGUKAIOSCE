import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Loader2, Upload } from "lucide-react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import ConfirmDialog from "../../components/ui/confirm-dialog";
import Button from "../../components/ui/button";



import {
  createScheduledEvent,
  getScheduledEventEditorData,
  updateScheduledEvent,
  uploadScheduledQuestionMedia,
  type ScheduledEventMutationInput,
} from "../../lib/api/scheduled-tryout-api";
import type { ScheduledEventEditorDataViewModel } from "../../lib/mappers/scheduled-tryout-mappers";
import {
  clearScheduledEventDraft,
  readScheduledEventDraft,
  writeScheduledEventDraft,
  type ScheduledEventEditorDraftFormState,
  type ScheduledEventEditorDraftQuestion,
  type ScheduledEventEditorOptionKey,
} from "../../lib/scheduled-event-editor-draft";
import ScheduledOpsShell from "./scheduled-ops-shell";

type OptionKey = ScheduledEventEditorOptionKey;

const optionFields: OptionKey[] = ["A", "B", "C", "D", "E"];

type EventQuestionFormState = ScheduledEventEditorDraftQuestion;
type EventFormState = ScheduledEventEditorDraftFormState;
type AutosaveStatus = "idle" | "saving" | "saved" | "error";

const emptyQuestion = (): EventQuestionFormState => ({
  id: null,
  stem: "",
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
});

const buildInitialFormState = (): EventFormState => ({
  editorialStatus: "draft",
  questions: [emptyQuestion()],
});

function extractFileName(path: string | null) {
  if (!path) {
    return "Belum ada file";
  }

  const segments = path.split("/");

  return segments[segments.length - 1] || path;
}

function mapEditorQuestionToFormState(question: ScheduledEventEditorDataViewModel["questions"][number]) {
  const nextQuestion = emptyQuestion();

  question.options.forEach((option) => {
    if (option.key in nextQuestion.options) {
      nextQuestion.options[option.key as OptionKey] = option.text;
    }
  });

  return {
    ...nextQuestion,
    id: question.id,
    stem: question.stem,
    correctOptionKey: (question.correctOptionKey as OptionKey) ?? "",
    explanationText: question.explanationText ?? "",
    questionImagePath: question.questionImagePath,
    questionImageUrl: question.questionImageUrl,
    explanationImagePath: question.explanationImagePath,
    explanationImageUrl: question.explanationImageUrl,
  };
}

function mapEditorDataToFormState(editorData: ScheduledEventEditorDataViewModel): EventFormState {
  return {
    editorialStatus: editorData.event.editorialStatus,
    questions: editorData.questions.map((question) => mapEditorQuestionToFormState(question)),
  };
}

function buildInputFromFormState(formState: EventFormState, serverEvent?: ScheduledEventEditorDataViewModel["event"]): ScheduledEventMutationInput | null {
  if (!serverEvent) return null;

  const title = serverEvent.title;
  const description = serverEvent.description;
  const accessStartAt = serverEvent.accessStartAt;
  const accessEndAt = serverEvent.accessEndAt;
  const durationMinutes = serverEvent.durationMinutes || 100;
  const totalQuestions = serverEvent.questionCount || 100;
  const maxAttempts = serverEvent.maxAttempts || 1;

  if (formState.questions.length === 0) {
    return null;
  }

  const questions = formState.questions.map((question) => {
    const options = optionFields
      .map((key) => ({
        key,
        text: question.options[key].trim(),
      }))
      .filter((option) => option.text.length > 0);

    if (
      question.stem.trim().length === 0
      || options.length < 2
      || !options.some((option) => option.key === question.correctOptionKey)
    ) {
      return null;
    }

    return {
      id: question.id,
      stem: question.stem.trim(),
      questionImagePath: question.questionImagePath,
      correctOptionKey: question.correctOptionKey,
      explanationText: question.explanationText.trim() || null,
      explanationImagePath: question.explanationImagePath,
      options,
    };
  });

  if (questions.some((question) => question === null)) {
    return null;
  }

  return {
    title,
    description,
    editorialStatus: formState.editorialStatus,
    accessStartAt,
    accessEndAt,
    totalQuestions,
    durationMinutes,
    maxAttempts,
    questions: questions as ScheduledEventMutationInput["questions"],
  };
}

function buildFormStateFingerprint(formState: EventFormState, serverEvent?: ScheduledEventEditorDataViewModel["event"]) {
  const input = buildInputFromFormState(formState, serverEvent);

  if (!input) {
    return null;
  }

  return JSON.stringify(input);
}

function parseTimestamp(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? null : timestamp;
}

function shouldRestoreMatchingEditDraft(
  {
    draft,
    eventId,
    serverData,
  }: {
    draft: ReturnType<typeof readScheduledEventDraft>;
    eventId?: string;
    serverData: ScheduledEventEditorDataViewModel;
  },
) {
  if (!draft || draft.eventId !== eventId) {
    return false;
  }

  const serverFormState = mapEditorDataToFormState(serverData);
  const draftFingerprint = buildFormStateFingerprint(draft.formState, serverData.event);
  const serverFingerprint = buildFormStateFingerprint(serverFormState, serverData.event);

  if (draftFingerprint && serverFingerprint && draftFingerprint === serverFingerprint) {
    return false;
  }

  const draftUpdatedAt = parseTimestamp(draft.updatedAt);
  const lastServerSavedAt = parseTimestamp(draft.lastServerSavedAt);
  const serverUpdatedAt = parseTimestamp(serverData.event.updatedAt);
  const hasUnsavedLocalChanges = Boolean(
    draft.lastServerFingerprint
    && draftFingerprint
    && draft.lastServerFingerprint !== draftFingerprint,
  );

  if (hasUnsavedLocalChanges) {
    if (draftUpdatedAt === null || serverUpdatedAt === null) {
      return true;
    }

    return draftUpdatedAt >= serverUpdatedAt;
  }

  if (serverUpdatedAt !== null && lastServerSavedAt !== null && serverUpdatedAt > lastServerSavedAt) {
    return false;
  }

  if (serverUpdatedAt !== null && draftUpdatedAt !== null && draftUpdatedAt <= serverUpdatedAt) {
    return false;
  }

  return true;
}

function formatAutosaveTimestamp(value: string | null) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

function ScheduledEventEditorPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id: eventId } = useParams();
  const [searchParams] = useSearchParams();
  const isEditMode = Boolean(eventId);
  const [restoredDraft] = useState(() =>
    readScheduledEventDraft(eventId),
  );
  const initialPersistedEventId = restoredDraft?.persistedEventId ?? eventId ?? null;
  const [formState, setFormState] = useState<EventFormState>(() => {
    return restoredDraft?.formState ?? buildInitialFormState();
  });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("idle");
  const [questionPendingDeletionIndex, setQuestionPendingDeletionIndex] = useState<number | null>(null);
  const [persistedEventId, setPersistedEventId] = useState<string | null>(
    () => initialPersistedEventId,
  );
  const persistedEventIdRef = useRef<string | null>(initialPersistedEventId);
  const [lastServerSavedAt, setLastServerSavedAt] = useState<string | null>(
    () => restoredDraft?.lastServerSavedAt ?? null,
  );
  const [lastAutosaveFingerprint, setLastAutosaveFingerprint] = useState<string | null>(
    () => restoredDraft?.lastServerFingerprint
      ?? (restoredDraft?.lastServerSavedAt ? buildFormStateFingerprint(restoredDraft.formState) : null),
  );
  const [isDraftPersistenceEnabled, setIsDraftPersistenceEnabled] = useState(true);
  const [hasHydratedEditForm, setHasHydratedEditForm] = useState(
    !isEditMode || Boolean(restoredDraft),
  );
  const editorQuery = useQuery({
    queryKey: ["scheduled-event-editor", eventId],
    enabled: isEditMode,
    queryFn: () =>
      getScheduledEventEditorData({
        eventId: eventId ?? "",
      }),
  });
  const isLegacyRecoveredEditDraft = restoredDraft !== null
    && restoredDraft.eventId === eventId
    && restoredDraft.lastServerSavedAt === null
    && restoredDraft.lastServerFingerprint === null;
  const shouldDeferLegacyDraftPersistence = isEditMode
    && editorQuery.isLoading
    && isLegacyRecoveredEditDraft;

  function updatePersistedEventId(nextValue: string | null) {
    persistedEventIdRef.current = nextValue;
    setPersistedEventId(nextValue);
  }

  useEffect(() => {
    if (!editorQuery.data) {
      return;
    }

    const draft = readScheduledEventDraft(eventId);
    const serverFormState = mapEditorDataToFormState(editorQuery.data);
    const shouldRestoreDraft = shouldRestoreMatchingEditDraft({
      draft,
      eventId,
      serverData: editorQuery.data,
    });
    const nextFormState = shouldRestoreDraft && draft
      ? draft.formState
      : serverFormState;

    if (draft && draft.eventId === eventId && !shouldRestoreDraft) {
      clearScheduledEventDraft(eventId);
    }

    setFormState(nextFormState);
    updatePersistedEventId(
      shouldRestoreDraft && draft
        ? draft.persistedEventId ?? eventId ?? editorQuery.data.event.id
        : eventId ?? editorQuery.data.event.id,
    );
    setLastServerSavedAt(
      shouldRestoreDraft && draft
        ? draft.lastServerSavedAt ?? null
        : editorQuery.data.event.updatedAt,
    );
    setLastAutosaveFingerprint(
      shouldRestoreDraft && draft
        ? draft.lastServerFingerprint ?? buildFormStateFingerprint(draft.formState, editorQuery.data.event)
        : buildFormStateFingerprint(serverFormState, editorQuery.data.event),
    );
    setHasHydratedEditForm(true);
  }, [editorQuery.data, eventId]);

  useEffect(() => {
    if (!isDraftPersistenceEnabled) {
      return;
    }

    if (shouldDeferLegacyDraftPersistence) {
      return;
    }

    if (isEditMode && !hasHydratedEditForm) {
      return;
    }

    writeScheduledEventDraft(
      {
        eventId: eventId ?? null,
        persistedEventId,
        updatedAt: new Date().toISOString(),
        lastServerSavedAt,
        lastServerFingerprint: lastAutosaveFingerprint,
        formState,
      },
      eventId,
    );
  }, [
    eventId,
    formState,
    hasHydratedEditForm,
    isDraftPersistenceEnabled,
    isEditMode,
    lastAutosaveFingerprint,
    lastServerSavedAt,
    persistedEventId,
    shouldDeferLegacyDraftPersistence,
  ]);

  useEffect(() => {
    if (isEditMode && !hasHydratedEditForm) {
      return;
    }

    setAutosaveStatus((current) => (current === "saving" ? current : "idle"));
  }, [formState, hasHydratedEditForm, isEditMode]);

  async function persistScheduledEvent(
    targetEventId: string | null,
    input: ScheduledEventMutationInput,
  ) {
    if (targetEventId) {
      return updateScheduledEvent({
        eventId: targetEventId,
        input,
      });
    }

    return createScheduledEvent({ input });
  }

  const autosaveMutation = useMutation({
    mutationFn: ({
      targetEventId,
      input,
    }: {
      targetEventId: string | null;
      input: ScheduledEventMutationInput;
    }) => persistScheduledEvent(targetEventId, input),
    onSuccess: async (result, variables) => {
      const savedAt = new Date().toISOString();

      updatePersistedEventId(result.id);
      setLastServerSavedAt(savedAt);
      setLastAutosaveFingerprint(JSON.stringify(variables.input));
      setAutosaveStatus("saved");
      await queryClient.invalidateQueries({
        queryKey: ["scheduled-ops-events"],
      });
    },
    onError: () => {
      setAutosaveStatus("error");
    },
  });
  const saveMutation = useMutation({
    mutationFn: ({
      targetEventId,
      input,
    }: {
      targetEventId: string | null;
      input: ScheduledEventMutationInput;
    }) => persistScheduledEvent(targetEventId, input),
    onSuccess: async (result, variables) => {
      const savedAt = new Date().toISOString();

      updatePersistedEventId(result.id);
      setLastServerSavedAt(savedAt);
      setLastAutosaveFingerprint(JSON.stringify(variables.input));
      setIsDraftPersistenceEnabled(false);
      clearScheduledEventDraft(eventId);
      await queryClient.invalidateQueries({
        queryKey: ["scheduled-ops-events"],
      });
      navigate("/scheduled-ops/events", { replace: true });
    },
    onError: (error) => {
      setSaveError(error instanceof Error ? error.message : "Event belum bisa disimpan.");
    },
  });
  const uploadMutation = useMutation({
    mutationFn: ({
      kind,
      file,
    }: {
      kind: "question" | "explanation";
      file: File;
    }) =>
      uploadScheduledQuestionMedia({
        eventId: persistedEventIdRef.current ?? eventId ?? "draft",
        kind,
        file,
      }),
    onError: (error) => {
      setSaveError(error instanceof Error ? error.message : "Media belum bisa diunggah.");
    },
  });

  function updateQuestion(
    questionIndex: number,
    updater: (question: EventQuestionFormState) => EventQuestionFormState,
  ) {
    setFormState((current) => ({
      ...current,
      questions: current.questions.map((question, index) =>
        index === questionIndex ? updater(question) : question),
    }));
  }

  async function handleMediaUpload(
    questionIndex: number,
    kind: "question" | "explanation",
    fileList: FileList | null,
  ) {
    const file = fileList?.[0];

    if (!file) {
      return;
    }

    setSaveError(null);
    const uploaded = await uploadMutation.mutateAsync({
      kind,
      file,
    });

    updateQuestion(questionIndex, (question) => ({
      ...question,
      questionImagePath: kind === "question" ? uploaded.path : question.questionImagePath,
      questionImageUrl: kind === "question" ? uploaded.signedUrl : question.questionImageUrl,
      explanationImagePath: kind === "explanation" ? uploaded.path : question.explanationImagePath,
      explanationImageUrl: kind === "explanation" ? uploaded.signedUrl : question.explanationImageUrl,
    }));
  }

  function handleAddQuestion() {
    setSaveError(null);
    const input = buildInputFromFormState(formState, editorQuery.data?.event);

    if (!input) {
      setSaveError("Lengkapi semua soal dan pastikan ada kunci jawaban sebelum menambah soal baru.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setFormState((current) => ({
      ...current,
      questions: [...current.questions, emptyQuestion()],
    }));
  }

  function handleRequestDeleteQuestion(questionIndex: number) {
    if (formState.questions.length <= 1) {
      return;
    }

    setQuestionPendingDeletionIndex(questionIndex);
  }

  function handleCancelDeleteQuestion() {
    setQuestionPendingDeletionIndex(null);
  }

  function handleConfirmDeleteQuestion() {
    if (questionPendingDeletionIndex === null) {
      return;
    }

    setFormState((current) => {
      if (current.questions.length <= 1) {
        return current;
      }

      return {
        ...current,
        questions: current.questions.filter((_, index) => index !== questionPendingDeletionIndex),
      };
    });
    setQuestionPendingDeletionIndex(null);
  }

  const runAutosave = useEffectEvent(async () => {
    if (isEditMode && !hasHydratedEditForm) {
      return;
    }

    if (uploadMutation.isPending || autosaveMutation.isPending) {
      return;
    }

    const input = buildInputFromFormState(formState, editorQuery.data?.event);

    if (!input) {
      return;
    }

    const nextFingerprint = JSON.stringify(input);

    if (nextFingerprint === lastAutosaveFingerprint) {
      return;
    }

    setAutosaveStatus("saving");

    try {
      await autosaveMutation.mutateAsync({
        targetEventId: persistedEventIdRef.current ?? eventId ?? null,
        input,
      });
    } catch {
      // Error state is handled in the autosave mutation callback.
    }
  });

  useEffect(() => {
    if (isEditMode && !hasHydratedEditForm) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void runAutosave();
    }, 5 * 60 * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [hasHydratedEditForm, isEditMode, runAutosave]);

  function handleSave() {
    setSaveError(null);
    const input = buildInputFromFormState(formState, editorQuery.data?.event);

    if (!input) {
      setSaveError("Lengkapi semua soal dan pastikan tiap soal memiliki minimal dua opsi serta kunci jawaban.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    saveMutation.mutate({
      targetEventId: persistedEventIdRef.current ?? eventId ?? null,
      input,
    });
  }

  const hasRecoveredEditDraft = isEditMode && restoredDraft?.eventId === eventId;
  const isLoading = isEditMode && editorQuery.isLoading;
  const isError = editorQuery.isError && !hasRecoveredEditDraft;
  const pendingDeletionQuestionNumber = questionPendingDeletionIndex === null
    ? null
    : questionPendingDeletionIndex + 1;
  const autosaveLabel = autosaveStatus === "saving"
    ? "Menyimpan perubahan..."
    : autosaveStatus === "saved"
      ? `Perubahan tersimpan ${formatAutosaveTimestamp(lastServerSavedAt) ?? ""}`.trim()
      : autosaveStatus === "error"
        ? "Perubahan belum tersimpan. Draft di perangkat ini tetap aman."
        : "Perubahan di perangkat ini tersimpan.";

  return (
    <ScheduledOpsShell
      activeHref="/scheduled-ops/events"
      title="Manajemen Soal Event Terjadwal"
      description="Susun soal dan pembahasan untuk event ini."
    >
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  <p className="text-sm text-muted-foreground">Form event sedang disiapkan.</p>
</div>
      ) : isError ? (
        <Alert variant="destructive">
  <AlertTitle>Form event belum tersedia</AlertTitle>
  <AlertDescription>Form event belum bisa dimuat.</AlertDescription>
</Alert>
      ) : isEditMode && !editorQuery.data && !hasRecoveredEditDraft ? (
        <Alert>
  <AlertTitle>Event tidak ditemukan</AlertTitle>
  <AlertDescription>Event yang ingin diedit tidak ditemukan.</AlertDescription>
</Alert>
      ) : (
        <div className="space-y-6">
          {saveError ? (
            <div className="rounded-[1.2rem] bg-muted px-4 py-3 text-sm font-medium text-foreground">
              {saveError}
            </div>
          ) : null}

          <Card className="px-5 py-5" >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <section
                aria-labelledby="event-status-heading"
                className="space-y-3 lg:w-1/3"
              >
                <h2
                  className="text-sm font-semibold text-foreground"
                  id="event-status-heading"
                >
                  Status Publikasi
                </h2>
                <select
                  id="event-status"
                  className="min-h-11 w-full rounded-[1.15rem] border border-border bg-muted px-4 text-sm text-foreground outline-none transition focus:border-border"
                  onChange={(event) => {
                    setFormState((current) => ({
                      ...current,
                      editorialStatus: event.target.value as EventFormState["editorialStatus"],
                    }));
                  }}
                  value={formState.editorialStatus}
                >
                  <option value="draft">Draft (Disembunyikan)</option>
                  <option value="published">Tayang (Publik)</option>
                </select>
              </section>

              <div className="rounded-[1.1rem] border border-border bg-muted px-4 py-3 lg:max-w-sm">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-foreground">
                  Status penyimpanan
                </p>
                <p className="mt-2 text-sm font-medium leading-6 text-foreground">
                  {autosaveLabel}
                </p>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            {formState.questions.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 bg-card border rounded-lg text-center space-y-4">
                <p className="text-muted-foreground">Belum ada soal untuk tryout ini.</p>
                <Button type="button" onClick={() => handleAddQuestion()}>Tambah Soal Pertama</Button>
              </div>
            ) : formState.questions.map((question, questionIndex) => {
              return (
                <Card key={`${question.id ?? "draft"}-${questionIndex}`} className="space-y-6 px-5 py-5" >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h2 className="text-xl font-semibold text-foreground">
                      Soal {questionIndex + 1}
                    </h2>
                    <Badge variant="default">{question.correctOptionKey} sebagai kunci</Badge>
                  </div>

                  <section className="space-y-3">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                        Pertanyaan utama
                      </p>
                      <p className="text-sm leading-6 text-foreground">
                        Tulis stem soal terlebih dahulu sebelum menambahkan pendukung lain.
                      </p>
                    </div>
                    <label className="text-sm font-medium text-foreground" htmlFor={`scheduled-question-${questionIndex}`}>
                      {`Pertanyaan ${questionIndex + 1}`}
                      <textarea
                        id={`scheduled-question-${questionIndex}`}
                        className="mt-2 min-h-28 w-full rounded-[1.15rem] border border-border bg-muted px-4 py-3 text-sm text-foreground outline-none transition focus:border-border"
                        onChange={(event) => {
                          updateQuestion(questionIndex, (current) => ({
                            ...current,
                            stem: event.target.value,
                          }));
                        }}
                        value={question.stem}
                      />
                    </label>
                  </section>

                  <section className="space-y-2 rounded-[1.15rem] border border-border bg-muted px-4 py-4">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                        Pendukung pertanyaan
                      </p>
                      <p className="text-sm leading-6 text-foreground">
                        Tambahkan gambar hanya jika memang membantu membaca soal.
                      </p>
                    </div>
                    <div className="text-sm font-medium text-foreground">
                      {`Gambar pertanyaan ${questionIndex + 1}`}
                      <div className="mt-2 space-y-3 rounded-[1.15rem] border border-border bg-muted px-4 py-3">
                        <label
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 text-xs font-semibold text-primary cursor-pointer transition-all duration-150 active:scale-95 shadow-2xs"
                          htmlFor={`scheduled-question-${questionIndex}-image`}
                        >
                          <Upload className="h-3.5 w-3.5" />
                          <span>Pilih gambar</span>
                          <span className="text-muted-foreground font-normal">
                            {extractFileName(question.questionImagePath)}
                          </span>
                        </label>
                        <input
                          id={`scheduled-question-${questionIndex}-image`}
                          accept="image/*"
                          aria-label={`Gambar pertanyaan ${questionIndex + 1}`}
                          className="sr-only"
                          onChange={(event) => {
                            void handleMediaUpload(questionIndex, "question", event.target.files);
                          }}
                          type="file"
                        />
                        {question.questionImageUrl ? (
                          <img
                            alt={`Preview gambar pertanyaan ${questionIndex + 1}`}
                            className="max-h-64 w-full rounded-[1rem] border border-border bg-muted object-contain"
                            src={question.questionImageUrl}
                          />
                        ) : (
                          <p className="text-sm leading-6 text-foreground">
                            Belum ada gambar pertanyaan.
                          </p>
                        )}
                      </div>
                    </div>
                  </section>

                  <section
                    aria-labelledby={`scheduled-question-${questionIndex}-answers-heading`}
                    className="space-y-4 rounded-[1.15rem] border border-border bg-muted px-4 py-4"
                  >
                    <div className="space-y-1">
                      <h3
                        id={`scheduled-question-${questionIndex}-answers-heading`}
                        className="text-base font-semibold text-foreground"
                      >
                        Jawaban
                      </h3>
                      <p className="text-sm leading-6 text-foreground">
                        Lengkapi opsi lalu tentukan jawaban yang benar.
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {optionFields.map((key) => (
                        <label
                          key={key}
                          className="text-sm font-medium text-foreground"
                          htmlFor={`scheduled-question-${questionIndex}-option-${key}`}
                        >
                          {`Opsi ${key} soal ${questionIndex + 1}`}
                          <input
                            id={`scheduled-question-${questionIndex}-option-${key}`}
                            className="mt-2 min-h-11 w-full rounded-[1.15rem] border border-border bg-muted px-4 text-sm text-foreground outline-none transition focus:border-border"
                            onChange={(event) => {
                              updateQuestion(questionIndex, (current) => ({
                                ...current,
                                options: {
                                  ...current.options,
                                  [key]: event.target.value,
                                },
                              }));
                            }}
                            value={question.options[key]}
                          />
                        </label>
                      ))}
                    </div>

                    <label className="text-sm font-medium text-foreground" htmlFor={`scheduled-question-${questionIndex}-correct-option`}>
                      {`Kunci jawaban soal ${questionIndex + 1}`}
                      <select
                        id={`scheduled-question-${questionIndex}-correct-option`}
                        className="mt-2 min-h-11 w-full rounded-[1.15rem] border border-border bg-muted px-4 text-sm text-foreground outline-none transition focus:border-border"
                        onChange={(event) => {
                          updateQuestion(questionIndex, (current) => ({
                            ...current,
                            correctOptionKey: event.target.value as OptionKey | "",
                          }));
                        }}
                        value={question.correctOptionKey}
                      >
                        <option value="" disabled>Pilih salah satu</option>
                        {optionFields.map((key) => (
                          <option key={key} value={key}>
                            {key}
                          </option>
                        ))}
                      </select>
                    </label>
                  </section>

                  <section
                    aria-labelledby={`scheduled-question-${questionIndex}-explanation-heading`}
                    className="space-y-4 rounded-[1.15rem] border border-border bg-muted px-4 py-4"
                  >
                    <div className="space-y-1">
                      <h3
                        id={`scheduled-question-${questionIndex}-explanation-heading`}
                        className="text-base font-semibold text-foreground"
                      >
                        Pembahasan
                      </h3>
                      <p className="text-sm leading-6 text-foreground">
                        Tambahkan pembahasan singkat dan lampiran bila diperlukan.
                      </p>
                    </div>
                    <label className="text-sm font-medium text-foreground" htmlFor={`scheduled-question-${questionIndex}-explanation`}>
                      {`Pembahasan soal ${questionIndex + 1}`}
                      <textarea
                        id={`scheduled-question-${questionIndex}-explanation`}
                        className="mt-2 min-h-24 w-full rounded-[1.15rem] border border-border bg-muted px-4 py-3 text-sm text-foreground outline-none transition focus:border-border"
                        onChange={(event) => {
                          updateQuestion(questionIndex, (current) => ({
                            ...current,
                            explanationText: event.target.value,
                          }));
                        }}
                        value={question.explanationText}
                      />
                    </label>

                    <div className="text-sm font-medium text-foreground">
                      {`Gambar pembahasan ${questionIndex + 1}`}
                      <div className="mt-2 space-y-3 rounded-[1.15rem] border border-border bg-muted px-4 py-3">
                        <label
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 text-xs font-semibold text-primary cursor-pointer transition-all duration-150 active:scale-95 shadow-2xs"
                          htmlFor={`scheduled-question-${questionIndex}-explanation-image`}
                        >
                          <Upload className="h-3.5 w-3.5" />
                          <span>Pilih gambar</span>
                          <span className="text-muted-foreground font-normal">
                            {extractFileName(question.explanationImagePath)}
                          </span>
                        </label>
                        <input
                          id={`scheduled-question-${questionIndex}-explanation-image`}
                          accept="image/*"
                          aria-label={`Gambar pembahasan ${questionIndex + 1}`}
                          className="sr-only"
                          onChange={(event) => {
                            void handleMediaUpload(questionIndex, "explanation", event.target.files);
                          }}
                          type="file"
                        />
                        {question.explanationImageUrl ? (
                          <img
                            alt={`Preview gambar pembahasan ${questionIndex + 1}`}
                            className="max-h-64 w-full rounded-[1rem] border border-border bg-muted object-contain"
                            src={question.explanationImageUrl}
                          />
                        ) : (
                          <p className="text-sm leading-6 text-foreground">
                            Belum ada gambar pembahasan.
                          </p>
                        )}
                      </div>
                    </div>
                  </section>

                  <div
                    aria-label={`Aksi soal ${questionIndex + 1}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-[1.2rem] border border-border bg-muted px-4 py-4"
                    role="group"
                  >
                    <div>
                      {questionIndex === formState.questions.length - 1 ? (
                        <Button
                          onClick={handleAddQuestion}
                          size="sm"
                        >
                          Tambah soal
                        </Button>
                      ) : null}
                    </div>
                    {formState.questions.length > 1 ? (
                      <Button
                        aria-label={`Hapus soal ${questionIndex + 1}`}
                        onClick={() => handleRequestDeleteQuestion(questionIndex)}
                        size="sm"
                        variant="destructive"
                      >
                        Hapus soal
                      </Button>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleSave}
              size="sm"
            >
              Simpan event
            </Button>
            <Link
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-border px-4 text-sm font-semibold text-foreground"
              to="/scheduled-ops/events"
            >
              Kembali ke daftar event
            </Link>
          </div>
        </div>
      )}
      <ConfirmDialog
        confirmLabel="Hapus soal"
        description={pendingDeletionQuestionNumber === null
          ? ""
          : `Soal ini akan dihapus dari event. Tindakan ini tidak bisa dibatalkan, tetapi minimal satu soal akan tetap tersisa.`}
        onClose={handleCancelDeleteQuestion}
        onConfirm={handleConfirmDeleteQuestion}
        open={questionPendingDeletionIndex !== null}
        title={pendingDeletionQuestionNumber === null ? "Hapus soal?" : `Hapus soal ${pendingDeletionQuestionNumber}?`}
      />
    </ScheduledOpsShell>
  );
}

export default ScheduledEventEditorPage;
