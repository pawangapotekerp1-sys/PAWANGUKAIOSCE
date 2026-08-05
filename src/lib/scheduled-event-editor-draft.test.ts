import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  buildScheduledEventDraftStorageKey,
  clearScheduledEventDraft,
  readScheduledEventDraft,
  writeScheduledEventDraft,
  type ScheduledEventEditorDraftPayload,
} from "./scheduled-event-editor-draft";

function createDraftPayload(overrides: Partial<ScheduledEventEditorDraftPayload> = {}): ScheduledEventEditorDraftPayload {
  return {
    eventId: null,
    persistedEventId: null,
    updatedAt: "2026-05-16T13:00:00.000Z",
    lastServerSavedAt: null,
    lastServerFingerprint: null,
    formState: {
      title: "TO Klinik Draft",
      description: "Draft browser-local",
      editorialStatus: "draft",
      accessStartAt: "2026-06-10T08:00",
      accessEndAt: "2026-06-12T21:00",
      questions: [
        {
          id: null,
          stem: "Apa terapi awal yang paling rasional?",
          correctOptionKey: "B",
          explanationText: "",
          questionImagePath: null,
          questionImageUrl: null,
          explanationImagePath: null,
          explanationImageUrl: null,
          options: {
            A: "Pilihan A",
            B: "Pilihan B",
            C: "",
            D: "",
            E: "",
          },
        },
      ],
    },
    ...overrides,
  };
}

describe("scheduled event editor draft storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  test("builds isolated storage keys for new and edit routes", () => {
    expect(buildScheduledEventDraftStorageKey()).toBe("scheduled-event-editor:draft:new");
    expect(buildScheduledEventDraftStorageKey("event-9")).toBe("scheduled-event-editor:draft:event-9");
  });

  test("writes and reads a valid draft payload", () => {
    const payload = createDraftPayload();

    writeScheduledEventDraft(payload);

    expect(readScheduledEventDraft()).toEqual(payload);
  });

  test("writes and reads a valid draft payload with persisted server metadata", () => {
    const payload = createDraftPayload({
      eventId: null,
      persistedEventId: "event-99",
      lastServerSavedAt: "2026-06-02T12:15:00.000Z",
      lastServerFingerprint: "{\"title\":\"TO Klinik Draft\"}",
    });

    writeScheduledEventDraft(payload);

    expect(readScheduledEventDraft()).toEqual(payload);
  });

  test("keeps older draft payloads readable when autosave metadata is missing", () => {
    window.localStorage.setItem(
      "scheduled-event-editor:draft:new",
      JSON.stringify({
        eventId: null,
        updatedAt: "2026-05-16T13:00:00.000Z",
        formState: createDraftPayload().formState,
      }),
    );

    expect(readScheduledEventDraft()).toEqual({
      eventId: null,
      persistedEventId: null,
      updatedAt: "2026-05-16T13:00:00.000Z",
      lastServerSavedAt: null,
      lastServerFingerprint: null,
      formState: createDraftPayload().formState,
    });
  });

  test("returns null for invalid persisted payloads", () => {
    window.localStorage.setItem("scheduled-event-editor:draft:new", JSON.stringify({ foo: "bar" }));

    expect(readScheduledEventDraft()).toBeNull();
  });

  test("clears the matching draft key", () => {
    writeScheduledEventDraft(createDraftPayload({ eventId: "event-9" }), "event-9");

    clearScheduledEventDraft("event-9");

    expect(window.localStorage.getItem("scheduled-event-editor:draft:event-9")).toBeNull();
  });
});
