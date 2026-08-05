export type ScheduledEventEditorOptionKey = "A" | "B" | "C" | "D" | "E";

export type ScheduledEventEditorDraftQuestion = {
  id: string | null;
  stem: string;
  correctOptionKey: ScheduledEventEditorOptionKey | "";
  explanationText: string;
  questionImagePath: string | null;
  questionImageUrl: string | null;
  explanationImagePath: string | null;
  explanationImageUrl: string | null;
  options: Record<ScheduledEventEditorOptionKey, string>;
};

export type ScheduledEventEditorDraftFormState = {
  title: string;
  description: string;
  editorialStatus: "draft" | "published";
  accessStartAt: string;
  accessEndAt: string;
  questions: ScheduledEventEditorDraftQuestion[];
};

export type ScheduledEventEditorDraftPayload = {
  eventId: string | null;
  persistedEventId: string | null;
  updatedAt: string;
  lastServerSavedAt: string | null;
  lastServerFingerprint: string | null;
  formState: ScheduledEventEditorDraftFormState;
};

const SCHEDULED_EVENT_EDITOR_DRAFT_STORAGE_PREFIX = "scheduled-event-editor:draft";

function hasWindow() {
  return typeof window !== "undefined";
}

function isOptionKey(value: unknown): value is ScheduledEventEditorOptionKey {
  return value === "A" || value === "B" || value === "C" || value === "D" || value === "E";
}

function isStringRecord(value: unknown): value is Record<ScheduledEventEditorOptionKey, string> {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;

  return ["A", "B", "C", "D", "E"].every((key) => typeof record[key] === "string");
}

function isDraftQuestion(value: unknown): value is ScheduledEventEditorDraftQuestion {
  if (!value || typeof value !== "object") {
    return false;
  }

  const question = value as Record<string, unknown>;

  return (question.id === null || typeof question.id === "string")
    && typeof question.stem === "string"
    && (isOptionKey(question.correctOptionKey) || question.correctOptionKey === "")
    && typeof question.explanationText === "string"
    && (question.questionImagePath === null || typeof question.questionImagePath === "string")
    && (question.questionImageUrl === null || typeof question.questionImageUrl === "string")
    && (question.explanationImagePath === null || typeof question.explanationImagePath === "string")
    && (question.explanationImageUrl === null || typeof question.explanationImageUrl === "string")
    && isStringRecord(question.options);
}

function isDraftFormState(value: unknown): value is ScheduledEventEditorDraftFormState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const formState = value as Record<string, unknown>;

  return typeof formState.title === "string"
    && typeof formState.description === "string"
    && (formState.editorialStatus === "draft" || formState.editorialStatus === "published")
    && typeof formState.accessStartAt === "string"
    && typeof formState.accessEndAt === "string"
    && Array.isArray(formState.questions)
    && formState.questions.every((question) => isDraftQuestion(question));
}

function isDraftPayload(value: unknown): value is ScheduledEventEditorDraftPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Record<string, unknown>;

  return (payload.eventId === null || typeof payload.eventId === "string")
    && (payload.persistedEventId === undefined || payload.persistedEventId === null || typeof payload.persistedEventId === "string")
    && typeof payload.updatedAt === "string"
    && (payload.lastServerSavedAt === undefined || payload.lastServerSavedAt === null || typeof payload.lastServerSavedAt === "string")
    && (payload.lastServerFingerprint === undefined || payload.lastServerFingerprint === null || typeof payload.lastServerFingerprint === "string")
    && isDraftFormState(payload.formState);
}

export function buildScheduledEventDraftStorageKey(eventId?: string) {
  return `${SCHEDULED_EVENT_EDITOR_DRAFT_STORAGE_PREFIX}:${eventId ?? "new"}`;
}

export function readScheduledEventDraft(eventId?: string): ScheduledEventEditorDraftPayload | null {
  if (!hasWindow()) {
    return null;
  }

  const key = buildScheduledEventDraftStorageKey(eventId);
  const rawDraft = window.localStorage.getItem(key);

  if (!rawDraft) {
    return null;
  }

  try {
    const parsedDraft = JSON.parse(rawDraft);

    if (!isDraftPayload(parsedDraft)) {
      return null;
    }

    return {
      eventId: parsedDraft.eventId,
      persistedEventId: parsedDraft.persistedEventId ?? null,
      updatedAt: parsedDraft.updatedAt,
      lastServerSavedAt: parsedDraft.lastServerSavedAt ?? null,
      lastServerFingerprint: parsedDraft.lastServerFingerprint ?? null,
      formState: parsedDraft.formState,
    };
  } catch {
    return null;
  }
}

export function writeScheduledEventDraft(payload: ScheduledEventEditorDraftPayload, eventId?: string) {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.setItem(
    buildScheduledEventDraftStorageKey(eventId),
    JSON.stringify(payload),
  );
}

export function clearScheduledEventDraft(eventId?: string) {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.removeItem(buildScheduledEventDraftStorageKey(eventId));
}
