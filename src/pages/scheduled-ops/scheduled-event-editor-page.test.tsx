import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import ScheduledEventEditorPage from "./scheduled-event-editor-page";

const mockListQuestionTaxonomy = vi.fn();
const mockGetScheduledEventEditorData = vi.fn();
const mockCreateScheduledEvent = vi.fn();
const mockUpdateScheduledEvent = vi.fn();
const mockUploadScheduledQuestionMedia = vi.fn();

vi.mock("../../lib/api/question-authoring-api", () => ({
  listQuestionTaxonomy: (...args: unknown[]) => mockListQuestionTaxonomy(...args),
}));

vi.mock("../../lib/api/scheduled-tryout-api", () => ({
  getScheduledEventEditorData: (...args: unknown[]) => mockGetScheduledEventEditorData(...args),
  createScheduledEvent: (...args: unknown[]) => mockCreateScheduledEvent(...args),
  updateScheduledEvent: (...args: unknown[]) => mockUpdateScheduledEvent(...args),
  uploadScheduledQuestionMedia: (...args: unknown[]) => mockUploadScheduledQuestionMedia(...args),
}));

function renderScheduledEventEditor(initialEntry = "/scheduled-ops/events/event-1/questions") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const renderResult = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route element={<Outlet context={{ role: "mentor" as const }} />}>
            <Route path="/scheduled-ops/events" element={<div>Scheduled events list</div>} />
            <Route path="/scheduled-ops/events/:id/questions" element={<ScheduledEventEditorPage />} />
            
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

  return {
    ...renderResult,
    queryClient,
  };
}

async function fillValidScheduledEventForm() {
  const firstQuestionInput = await screen.findByLabelText(/^pertanyaan 1$/i);
  fireEvent.change(firstQuestionInput, {
    target: { value: "Apa terapi awal yang paling rasional?" },
  });
  fireEvent.change(screen.getByLabelText(/opsi a soal 1/i), {
    target: { value: "Pilihan A" },
  });
  fireEvent.change(screen.getByLabelText(/opsi b soal 1/i), {
    target: { value: "Pilihan B" },
  });
  fireEvent.change(screen.getByLabelText(/kunci jawaban soal 1/i), {
    target: { value: "B" },
  });
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.localStorage.clear();
});

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  mockListQuestionTaxonomy.mockResolvedValue([
    {
      id: "block-1",
      name: "Clinical Science",
      slug: "clinical-science",
      topics: [
        { id: "topic-1", name: "Kardiologi", slug: "kardiologi" },
      ],
    },
    {
      id: "block-2",
      name: "Pharmaceutical Science",
      slug: "pharmaceutical-science",
      topics: [
        { id: "topic-2", name: "Sediaan steril", slug: "sediaan-steril" },
      ],
    },
  ]);
  mockGetScheduledEventEditorData.mockResolvedValue({
    event: {
      id: "event-1",
      title: "TO Klinik Juni",
      description: "Deskripsi",
      editorialStatus: "draft",
      accessStartAt: "2026-06-01T07:00:00Z",
      accessEndAt: "2026-06-01T10:00:00Z",
      durationMinutes: 100,
      questionCount: 1,
      maxAttempts: 1,
      updatedAt: "2026-06-01T00:00:00Z",
      currentCycle: 1,
    },
    questions: [
      {
        id: "question-1",
        order: 1,
        stem: "Apa terapi awal yang paling rasional?",
        questionImagePath: null,
        questionImageUrl: null,
        explanationText: "ACE inhibitor dipilih sebagai fondasi awal.",
        explanationImagePath: null,
        explanationImageUrl: null,
        blockId: "block-1",
        blockName: "Clinical Science",
        topicId: "topic-1",
        topicName: "Kardiologi",
        correctOptionKey: "B",
        options: [
          { id: "option-1", key: "A", text: "Pilihan A", sortOrder: 1 },
          { id: "option-2", key: "B", text: "Pilihan B", sortOrder: 2 },
          { id: "option-3", key: "C", text: "", sortOrder: 3 },
          { id: "option-4", key: "D", text: "", sortOrder: 4 },
          { id: "option-5", key: "E", text: "", sortOrder: 5 },
        ],
      }
    ],
  });
  mockCreateScheduledEvent.mockResolvedValue({ id: "event-1" });
  mockUpdateScheduledEvent.mockResolvedValue({ id: "event-9" });
  mockUploadScheduledQuestionMedia.mockResolvedValue({
    path: "question/scheduled-events/draft-image.png",
    signedUrl: "https://example.com/question/scheduled-events/draft-image.png",
  });
});

describe("Scheduled event editor page", () => {
  test("renders event metadata fields and can add local question blocks before save", async () => {
    renderScheduledEventEditor(); await screen.findByRole("combobox", { name: /status publikasi/i });

    expect(await screen.findByText(/manajemen soal event terjadwal/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    
    expect(screen.getByText(/status publikasi/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^pertanyaan 1$/i)).toBeInTheDocument();
        expect(screen.getByText(/perubahan di perangkat ini tersimpan/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tambah soal/i })).toHaveAttribute("data-variant", "primary");
    expect(screen.getByRole("button", { name: /simpan event/i })).toHaveAttribute("data-variant", "primary");

    await fillValidScheduledEventForm();
    fireEvent.click(screen.getByRole("button", { name: /tambah soal/i }));

    expect(screen.getByLabelText(/^pertanyaan 2$/i)).toBeInTheDocument();
      });

  test("shows the add-question action only inside the last question card", async () => {
    renderScheduledEventEditor(); await screen.findByRole("combobox", { name: /status publikasi/i });

    
    const firstCard = screen.getByText(/soal 1/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }).closest('.px-5');
    const firstCardActions = within(firstCard as HTMLElement).getByRole("group", { name: /aksi soal 1/i });

    await fillValidScheduledEventForm();
    fireEvent.click(screen.getByRole("button", { name: /tambah soal/i }));

    const secondCard = screen.getByText(/soal 2/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }).closest('.px-5');
    const secondCardActions = within(secondCard as HTMLElement).getByRole("group", { name: /aksi soal 2/i });
    const addQuestionButton = screen.getByRole("button", { name: /tambah soal/i });

    expect(secondCardActions).toContainElement(addQuestionButton);
    expect(firstCardActions).not.toContainElement(addQuestionButton);
  });

  test("shows delete actions per question card only when more than one question exists", async () => {
    renderScheduledEventEditor(); await screen.findByRole("combobox", { name: /status publikasi/i });

    
    await fillValidScheduledEventForm();
    fireEvent.click(screen.getByRole("button", { name: /tambah soal/i }));

    expect(screen.getByRole("button", { name: /hapus soal 1/i })).toHaveAttribute("data-variant", "destructive");
    expect(screen.getByRole("button", { name: /hapus soal 2/i })).toHaveAttribute("data-variant", "destructive");
  });

  test("renders each question card with grouped answer and explanation sections in reading order", async () => {
    renderScheduledEventEditor(); await screen.findByRole("combobox", { name: /status publikasi/i });

    
    const questionCard = screen.getByText(/soal 1/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }).closest('.px-5');
    const card = questionCard as HTMLElement;
    const questionHeading = within(card).getByText(/soal 1/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' });
    const stemField = screen.getByLabelText(/^pertanyaan 1$/i);
    const questionImageInput = screen.getByLabelText(/^gambar pertanyaan 1$/i);
    const answerSectionHeading = within(card).getByText(/^jawaban$/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' });
    const optionAField = screen.getByLabelText(/opsi a soal 1/i);
    const answerKeyField = screen.getByLabelText(/kunci jawaban soal 1/i);
    const explanationSectionHeading = within(card).getByText(/^pembahasan$/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' });
    const explanationField = screen.getByLabelText(/pembahasan soal 1/i);
    const explanationImageInput = screen.getByLabelText(/^gambar pembahasan 1$/i);

    expect(questionHeading.compareDocumentPosition(stemField)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(stemField.compareDocumentPosition(questionImageInput)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(questionImageInput.compareDocumentPosition(answerSectionHeading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(answerSectionHeading.compareDocumentPosition(optionAField)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(optionAField.compareDocumentPosition(answerKeyField)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(answerKeyField.compareDocumentPosition(explanationSectionHeading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(explanationSectionHeading.compareDocumentPosition(explanationField)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(explanationField.compareDocumentPosition(explanationImageInput)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  test("removes a question only after delete confirmation", async () => {
    renderScheduledEventEditor(); await screen.findByRole("combobox", { name: /status publikasi/i });

    await fillValidScheduledEventForm();
    fireEvent.click(screen.getByRole("button", { name: /tambah soal/i }));

    expect(screen.getByLabelText(/^pertanyaan 2$/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /hapus soal 2/i }));

    const dialog = await screen.findByRole("alertdialog", { name: /hapus soal 2\?/i });
    expect(dialog).toHaveTextContent(/soal ini akan dihapus dari event/i);
    expect(screen.getByLabelText(/^pertanyaan 2$/i)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: /hapus soal/i }));

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/^pertanyaan 2$/i)).not.toBeInTheDocument();
    });

      });

  test("keeps the question when delete confirmation is cancelled", async () => {
    renderScheduledEventEditor(); await screen.findByRole("combobox", { name: /status publikasi/i });

    await fillValidScheduledEventForm();
    fireEvent.click(screen.getByRole("button", { name: /tambah soal/i }));
    fireEvent.click(screen.getByRole("button", { name: /hapus soal 2/i }));

    const dialog = await screen.findByRole("alertdialog", { name: /hapus soal 2\?/i });
    fireEvent.click(within(dialog).getByRole("button", { name: /batal/i }));

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });

    expect(screen.getByLabelText(/^pertanyaan 2$/i)).toBeInTheDocument();
      });

  test("hides block and topic categorization in the scheduled editor", async () => {
    renderScheduledEventEditor(); await screen.findByRole("combobox", { name: /status publikasi/i });

    

    expect(screen.queryByLabelText(/blok soal 1/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/materi soal 1/i)).not.toBeInTheDocument();
  });

  test("restores the new-event draft automatically after remount", async () => {
    const firstRender = renderScheduledEventEditor(); await screen.findByRole("combobox", { name: /status publikasi/i });

    
    fireEvent.change(screen.getByLabelText(/^pertanyaan 1$/i), {
      target: { value: "Pertanyaan draft yang belum sempat disimpan" },
    });

    firstRender.unmount();
    renderScheduledEventEditor(); await screen.findByRole("combobox", { name: /status publikasi/i });

    expect(screen.getByDisplayValue(/pertanyaan draft yang belum sempat disimpan/i)).toBeInTheDocument();
  });

  test("loads existing event questions in edit mode", async () => {
    mockGetScheduledEventEditorData.mockResolvedValue({
      event: {
        id: "event-9",
        
        editorialStatus: "published",
        
        currentCycle: 2,
      },
      questions: [
        {
          id: "question-1",
          order: 1,
          stem: "Apa terapi awal yang paling rasional?",
          questionImagePath: null,
          questionImageUrl: null,
          explanationText: "ACE inhibitor dipilih sebagai fondasi awal.",
          explanationImagePath: null,
          explanationImageUrl: null,
          blockId: "block-1",
          blockName: "Clinical Science",
          topicId: "topic-1",
          topicName: "Kardiologi",
          correctOptionKey: "B",
          options: [
            { id: "option-1", key: "A", text: "Pilihan A", sortOrder: 1 },
            { id: "option-2", key: "B", text: "Pilihan B", sortOrder: 2 },
            { id: "option-3", key: "C", text: "", sortOrder: 3 },
            { id: "option-4", key: "D", text: "", sortOrder: 4 },
            { id: "option-5", key: "E", text: "", sortOrder: 5 },
          ],
        },
      ],
    });

    renderScheduledEventEditor("/scheduled-ops/events/event-9/questions"); await screen.findByRole("combobox", { name: /status publikasi/i });

    
    
    expect(screen.getByDisplayValue(/apa terapi awal yang paling rasional/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/ace inhibitor dipilih sebagai fondasi awal/i)).toBeInTheDocument();
      });

  test("prefers the matching edit draft over hydrated server data", async () => {
    window.localStorage.setItem(
      "scheduled-event-editor:draft:event-9",
      JSON.stringify({
        eventId: "event-9",
        updatedAt: "2026-05-16T13:00:00.000Z",
        formState: {
          
          editorialStatus: "draft",
          
          questions: [
            {
              id: "question-1",
              stem: "Soal draft edit lokal",
              correctOptionKey: "C",
              explanationText: "Pembahasan draft lokal",
              questionImagePath: null,
              questionImageUrl: null,
              explanationImagePath: null,
              explanationImageUrl: null,
              options: {
                A: "A lokal",
                B: "B lokal",
                C: "C lokal",
                D: "",
                E: "",
              },
            },
          ],
        },
      }),
    );
    mockGetScheduledEventEditorData.mockResolvedValue({
      event: {
        id: "event-9",
        
        editorialStatus: "published",
        
        currentCycle: 2,
      },
      questions: [
        {
          id: "question-1",
          order: 1,
          stem: "Apa terapi awal yang paling rasional?",
          questionImagePath: null,
          questionImageUrl: null,
          explanationText: "ACE inhibitor dipilih sebagai fondasi awal.",
          explanationImagePath: null,
          explanationImageUrl: null,
          blockId: "block-1",
          blockName: "Clinical Science",
          topicId: "topic-1",
          topicName: "Kardiologi",
          correctOptionKey: "B",
          options: [
            { id: "option-1", key: "A", text: "Pilihan A", sortOrder: 1 },
            { id: "option-2", key: "B", text: "Pilihan B", sortOrder: 2 },
            { id: "option-3", key: "C", text: "", sortOrder: 3 },
            { id: "option-4", key: "D", text: "", sortOrder: 4 },
            { id: "option-5", key: "E", text: "", sortOrder: 5 },
          ],
        },
      ],
    });

    renderScheduledEventEditor("/scheduled-ops/events/event-9/questions"); await screen.findByRole("combobox", { name: /status publikasi/i });

    
    expect(screen.getByDisplayValue(/soal draft edit lokal/i)).toBeInTheDocument();
    
  });

  test("prefers newer backend event data over a stale matching edit draft", async () => {
    window.localStorage.setItem(
      "scheduled-event-editor:draft:event-9",
      JSON.stringify({
        eventId: "event-9",
        updatedAt: "2026-06-05T07:00:00.000Z",
        lastServerSavedAt: "2026-06-05T07:00:00.000Z",
        formState: {
          
          editorialStatus: "draft",
          
          questions: [
            {
              id: "question-1",
              stem: "Soal draft lama 1",
              correctOptionKey: "A",
              explanationText: "Pembahasan draft lama 1",
              questionImagePath: null,
              questionImageUrl: null,
              explanationImagePath: null,
              explanationImageUrl: null,
              options: {
                A: "A1",
                B: "B1",
                C: "",
                D: "",
                E: "",
              },
            },
            {
              id: "question-2",
              stem: "Soal draft lama 2",
              correctOptionKey: "B",
              explanationText: "Pembahasan draft lama 2",
              questionImagePath: null,
              questionImageUrl: null,
              explanationImagePath: null,
              explanationImageUrl: null,
              options: {
                A: "A2",
                B: "B2",
                C: "",
                D: "",
                E: "",
              },
            },
          ],
        },
      }),
    );
    mockGetScheduledEventEditorData.mockResolvedValue({
      event: {
        id: "event-9",
        
        editorialStatus: "published",
        
        currentCycle: 2,
        updatedAt: "2026-06-05T08:30:00.000Z",
      },
      questions: [
        {
          id: "question-1",
          order: 1,
          stem: "Soal backend 1",
          questionImagePath: null,
          questionImageUrl: null,
          explanationText: "Pembahasan backend 1",
          explanationImagePath: null,
          explanationImageUrl: null,
          blockId: null,
          blockName: null,
          topicId: null,
          topicName: null,
          correctOptionKey: "A",
          options: [
            { id: "option-1a", key: "A", text: "A1", sortOrder: 1 },
            { id: "option-1b", key: "B", text: "B1", sortOrder: 2 },
          ],
        },
        {
          id: "question-2",
          order: 2,
          stem: "Soal backend 2",
          questionImagePath: null,
          questionImageUrl: null,
          explanationText: "Pembahasan backend 2",
          explanationImagePath: null,
          explanationImageUrl: null,
          blockId: null,
          blockName: null,
          topicId: null,
          topicName: null,
          correctOptionKey: "B",
          options: [
            { id: "option-2a", key: "A", text: "A2", sortOrder: 1 },
            { id: "option-2b", key: "B", text: "B2", sortOrder: 2 },
          ],
        },
        {
          id: "question-3",
          order: 3,
          stem: "Soal backend 3",
          questionImagePath: null,
          questionImageUrl: null,
          explanationText: "Pembahasan backend 3",
          explanationImagePath: null,
          explanationImageUrl: null,
          blockId: null,
          blockName: null,
          topicId: null,
          topicName: null,
          correctOptionKey: "C",
          options: [
            { id: "option-3a", key: "A", text: "A3", sortOrder: 1 },
            { id: "option-3b", key: "C", text: "C3", sortOrder: 2 },
          ],
        },
        {
          id: "question-4",
          order: 4,
          stem: "Soal backend 4",
          questionImagePath: null,
          questionImageUrl: null,
          explanationText: "Pembahasan backend 4",
          explanationImagePath: null,
          explanationImageUrl: null,
          blockId: null,
          blockName: null,
          topicId: null,
          topicName: null,
          correctOptionKey: "D",
          options: [
            { id: "option-4a", key: "A", text: "A4", sortOrder: 1 },
            { id: "option-4b", key: "D", text: "D4", sortOrder: 2 },
          ],
        },
      ],
    });

    renderScheduledEventEditor("/scheduled-ops/events/event-9/questions"); await screen.findByRole("combobox", { name: /status publikasi/i });

    
    expect(screen.getByDisplayValue(/soal backend 4/i)).toBeInTheDocument();
    
    expect(screen.queryByDisplayValue(/soal draft lama 2/i)).not.toBeInTheDocument();
      });

  test("prefers newer backend event data over a legacy edit draft rewritten before hydration", async () => {
    window.localStorage.setItem(
      "scheduled-event-editor:draft:event-9",
      JSON.stringify({
        eventId: "event-9",
        updatedAt: "2024-06-05T07:00:00.000Z",
        formState: {
          
          editorialStatus: "draft",
          
          questions: [
            {
              id: "question-1",
              stem: "Soal legacy 1",
              correctOptionKey: "A",
              explanationText: "Pembahasan legacy 1",
              questionImagePath: null,
              questionImageUrl: null,
              explanationImagePath: null,
              explanationImageUrl: null,
              options: {
                A: "A1",
                B: "B1",
                C: "",
                D: "",
                E: "",
              },
            },
            {
              id: "question-2",
              stem: "Soal legacy 2",
              correctOptionKey: "B",
              explanationText: "Pembahasan legacy 2",
              questionImagePath: null,
              questionImageUrl: null,
              explanationImagePath: null,
              explanationImageUrl: null,
              options: {
                A: "A2",
                B: "B2",
                C: "",
                D: "",
                E: "",
              },
            },
          ],
        },
      }),
    );
    mockGetScheduledEventEditorData.mockResolvedValue({
      event: {
        id: "event-9",
        
        editorialStatus: "published",
        
        currentCycle: 2,
        updatedAt: "2025-06-05T08:30:00.000Z",
      },
      questions: [
        {
          id: "question-1",
          order: 1,
          stem: "Soal backend 1",
          questionImagePath: null,
          questionImageUrl: null,
          explanationText: "Pembahasan backend 1",
          explanationImagePath: null,
          explanationImageUrl: null,
          blockId: null,
          blockName: null,
          topicId: null,
          topicName: null,
          correctOptionKey: "A",
          options: [
            { id: "option-1a", key: "A", text: "A1", sortOrder: 1 },
            { id: "option-1b", key: "B", text: "B1", sortOrder: 2 },
          ],
        },
        {
          id: "question-2",
          order: 2,
          stem: "Soal backend 2",
          questionImagePath: null,
          questionImageUrl: null,
          explanationText: "Pembahasan backend 2",
          explanationImagePath: null,
          explanationImageUrl: null,
          blockId: null,
          blockName: null,
          topicId: null,
          topicName: null,
          correctOptionKey: "B",
          options: [
            { id: "option-2a", key: "A", text: "A2", sortOrder: 1 },
            { id: "option-2b", key: "B", text: "B2", sortOrder: 2 },
          ],
        },
        {
          id: "question-3",
          order: 3,
          stem: "Soal backend 3",
          questionImagePath: null,
          questionImageUrl: null,
          explanationText: "Pembahasan backend 3",
          explanationImagePath: null,
          explanationImageUrl: null,
          blockId: null,
          blockName: null,
          topicId: null,
          topicName: null,
          correctOptionKey: "C",
          options: [
            { id: "option-3a", key: "A", text: "A3", sortOrder: 1 },
            { id: "option-3b", key: "C", text: "C3", sortOrder: 2 },
          ],
        },
        {
          id: "question-4",
          order: 4,
          stem: "Soal backend 4",
          questionImagePath: null,
          questionImageUrl: null,
          explanationText: "Pembahasan backend 4",
          explanationImagePath: null,
          explanationImageUrl: null,
          blockId: null,
          blockName: null,
          topicId: null,
          topicName: null,
          correctOptionKey: "D",
          options: [
            { id: "option-4a", key: "A", text: "A4", sortOrder: 1 },
            { id: "option-4b", key: "D", text: "D4", sortOrder: 2 },
          ],
        },
      ],
    });

    renderScheduledEventEditor("/scheduled-ops/events/event-9/questions"); await screen.findByRole("combobox", { name: /status publikasi/i });

    
    expect(screen.getByDisplayValue(/soal backend 4/i)).toBeInTheDocument();
    
    expect(screen.queryByDisplayValue(/soal legacy 2/i)).not.toBeInTheDocument();
      });

  test("restores the matching edit draft even when the backend hydration fails", async () => {
    window.localStorage.setItem(
      "scheduled-event-editor:draft:event-9",
      JSON.stringify({
        eventId: "event-9",
        updatedAt: "2026-05-16T13:00:00.000Z",
        formState: {
          
          editorialStatus: "draft",
          
          questions: [
            {
              id: "question-1",
              stem: "Soal draft yang harus tetap pulih",
              correctOptionKey: "B",
              explanationText: "Pembahasan draft offline",
              questionImagePath: null,
              questionImageUrl: null,
              explanationImagePath: null,
              explanationImageUrl: null,
              options: {
                A: "A lokal",
                B: "B lokal",
                C: "",
                D: "",
                E: "",
              },
            },
          ],
        },
      }),
    );
    mockGetScheduledEventEditorData.mockRejectedValue(new Error("Backend operasional tidak tersedia."));

    renderScheduledEventEditor("/scheduled-ops/events/event-9/questions"); await screen.findByRole("combobox", { name: /status publikasi/i });

    
    expect(screen.getByDisplayValue(/soal draft yang harus tetap pulih/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/form event belum tersedia/i),
    ).not.toBeInTheDocument();
  });

  test("uploads scheduled question and explanation images through the scheduled helper", async () => {
    renderScheduledEventEditor(); await screen.findByRole("combobox", { name: /status publikasi/i });

    
    const questionFile = new File(["question"], "question.png", { type: "image/png" });
    const explanationFile = new File(["explanation"], "explanation.png", { type: "image/png" });

    fireEvent.change(screen.getByLabelText(/^gambar pertanyaan 1$/i), {
      target: { files: [questionFile] },
    });

    await waitFor(() => {
      expect(mockUploadScheduledQuestionMedia).toHaveBeenCalledWith({
        eventId: "draft",
        kind: "question",
        file: questionFile,
      });
    });

    fireEvent.change(screen.getByLabelText(/^gambar pembahasan 1$/i), {
      target: { files: [explanationFile] },
    });

    await waitFor(() => {
      expect(mockUploadScheduledQuestionMedia).toHaveBeenCalledWith({
        eventId: "draft",
        kind: "explanation",
        file: explanationFile,
      });
    });
  });

  test("renders each scheduled question image input between the stem field and option A", async () => {
    renderScheduledEventEditor(); await screen.findByRole("combobox", { name: /status publikasi/i });

    const stemField = await screen.findByLabelText(/^pertanyaan 1$/i);
    const questionImageInput = screen.getByLabelText(/^gambar pertanyaan 1$/i);
    const optionAField = screen.getByLabelText(/opsi a soal 1/i);

    expect(stemField.compareDocumentPosition(questionImageInput)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(questionImageInput.compareDocumentPosition(optionAField)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });


});
