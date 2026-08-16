import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import QuestionGeneratorReviewPage from "./question-generator-review-page";

const mockGetQuestionGenerationBatchDetail = vi.fn();
const mockUpdateGeneratedDraftItem = vi.fn();
const mockDeliverGeneratedItemToQuestionBank = vi.fn();
const mockDeliverGeneratedItemToScheduledEvent = vi.fn();
const mockListQuestionTaxonomy = vi.fn();
const mockListScheduledOpsEvents = vi.fn();

vi.mock("../../lib/api/question-generator-api", () => ({
  getQuestionGenerationBatchDetail: (...args: unknown[]) => mockGetQuestionGenerationBatchDetail(...args),
  updateGeneratedDraftItem: (...args: unknown[]) => mockUpdateGeneratedDraftItem(...args),
  deliverGeneratedItemToQuestionBank: (...args: unknown[]) => mockDeliverGeneratedItemToQuestionBank(...args),
  deliverGeneratedItemToScheduledEvent: (...args: unknown[]) => mockDeliverGeneratedItemToScheduledEvent(...args),
}));

vi.mock("../../lib/api/question-authoring-api", () => ({
  listQuestionTaxonomy: (...args: unknown[]) => mockListQuestionTaxonomy(...args),
}));

vi.mock("../../lib/api/scheduled-tryout-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api/scheduled-tryout-api")>();

  return {
    ...actual,
    listScheduledOpsEvents: (...args: unknown[]) => mockListScheduledOpsEvents(...args),
  };
});

function createBatchDetail() {
  return {
    batch: {
      id: "batch-1",
      model: "gemini-3.7-flash",
      status: "ready_for_review",
      statusLabel: "Siap direview",
      targetQuestionCount: 2,
      referenceCount: 1,
      generatedCount: 2,
      failedReason: null,
      createdAt: "2026-06-04T09:00:00.000Z",
      updatedAt: "2026-06-04T09:05:00.000Z",
    },
    references: [
      {
        id: "reference-1",
        order: 1,
        stem: "Pasien hipertensi dengan CKD membutuhkan terapi yang melindungi ginjal.",
        options: {
          A: "Amlodipin",
          B: "Lisinopril",
          C: "Parasetamol",
          D: "Metformin",
          E: "Omeprazol",
        },
        correctOptionKey: "B",
        explanationText: "ACE inhibitor membantu proteksi ginjal pada pasien ini.",
      },
    ],
    items: [
      {
        id: "item-1",
        draftQuestionId: "draft-1",
        order: 1,
        variationMode: "new_case_same_concept",
        variationModeLabel: "Kasus baru, konsep sama",
        status: "draft_generated",
        editedAt: null,
        stem: "Soal generator 1",
        options: {
          A: "Amlodipin",
          B: "Lisinopril",
          C: "Valsartan",
          D: "Furosemid",
          E: "Parasetamol",
        },
        correctOptionKey: "B",
        explanationText: "Proteksi ginjal tetap menjadi alasan utama.",
        referenceLabel: "KDIGO CKD guideline",
        referenceUrl: "https://kdigo.org/guidelines/ckd/",
        deliveries: [],
        deliverySummaryLabel: "Belum dikirim",
      },
      {
        id: "item-2",
        draftQuestionId: "draft-2",
        order: 2,
        variationMode: "reverse_reasoning",
        variationModeLabel: "Penalaran dibalik",
        status: "draft_generated",
        editedAt: null,
        stem: "Soal generator 2",
        options: {
          A: "Amlodipin",
          B: "Lisinopril",
          C: "Valsartan",
          D: "Furosemid",
          E: "Parasetamol",
        },
        correctOptionKey: "B",
        explanationText: "Topik tetap sama dengan referensi.",
        referenceLabel: "WHO hypertension publication",
        referenceUrl: "https://www.who.int/publications/example",
        deliveries: [
          {
            id: "delivery-1",
            destinationType: "question_bank",
            destinationQuestionId: "question-1",
            destinationEventId: null,
            destinationEventQuestionId: null,
            blockId: "block-1",
            topicId: "topic-1",
            deliveredBy: "user-1",
            createdAt: "2026-06-04T09:10:00.000Z",
          },
        ],
        deliverySummaryLabel: "Bank soal 1x",
      },
    ],
  };
}

function renderReviewPage(initialEntry = "/admin/question-generator/batch-1") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/admin/question-generator/:batchId" element={<QuestionGeneratorReviewPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  mockGetQuestionGenerationBatchDetail.mockResolvedValue(createBatchDetail());
  mockUpdateGeneratedDraftItem.mockResolvedValue({
    itemId: "item-2",
    status: "draft_edited",
  });
  mockDeliverGeneratedItemToQuestionBank.mockResolvedValue({
    deliveryId: "delivery-2",
    questionId: "question-2",
  });
  mockDeliverGeneratedItemToScheduledEvent.mockResolvedValue({
    deliveryId: "delivery-3",
    eventQuestionId: "event-question-1",
  });
  mockListQuestionTaxonomy.mockResolvedValue([
    {
      id: "block-1",
      name: "Clinical Science",
      slug: "clinical-science",
      topics: [{ id: "topic-1", name: "Kardiologi", slug: "kardiologi" }],
    },
  ]);
  mockListScheduledOpsEvents.mockResolvedValue([
    {
      id: "event-1",
      title: "TO Klinik Juni",
      status: "draft",
      statusLabel: "Draft",
      editorialStatus: "draft",
      accessStartAt: "2026-06-05T01:00:00.000Z",
      accessEndAt: "2026-06-05T03:00:00.000Z",
      currentCycle: 1,
      questionCount: 10,
      questionCountLabel: "10 soal",
      durationMinutes: 90,
      durationLabel: "90 menit",
      windowLabel: "05 Jun 08:00 - 05 Jun 10:00 WIB",
      description: "Event uji klinik.",
    },
  ]);
});

describe("Admin question generator review page", () => {
  test("displays generation mode labels and delivery history badges", async () => {
    renderReviewPage();

    expect(screen.getByText(/periksa hasil soal sebelum disimpan ke bank soal atau sesi/i)).toBeInTheDocument();
    expect(await screen.findByText(/tinjau hasil soal/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.getByText(/soal acuan/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(await screen.findByText(/kasus baru, konsep sama/i)).toBeInTheDocument();
    expect(screen.getByText(/penalaran dibalik/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /kdigo ckd guideline/i })).toHaveAttribute(
      "href",
      "https://kdigo.org/guidelines/ckd/",
    );
    expect(screen.getByRole("article", { name: /soal 1/i })).toHaveTextContent(/belum dikirim/i);
    expect(screen.getByText(/bank soal 1x/i)).toBeInTheDocument();
    expect(screen.getByText(/clinical science \/ kardiologi/i)).toBeInTheDocument();
  });

  test("keeps an already-delivered item editable", async () => {
    renderReviewPage();

    const deliveredDraft = await screen.findByRole("article", { name: /soal 2/i });
    const explanationField = within(deliveredDraft).getByLabelText(/pembahasan/i);

    fireEvent.change(explanationField, {
      target: { value: "Pembahasan revisi setelah distribusi pertama." },
    });
    await waitFor(() => {
      expect(explanationField).toHaveValue("Pembahasan revisi setelah distribusi pertama.");
    });
    fireEvent.click(within(deliveredDraft).getByRole("button", { name: /simpan perubahan/i }));

    await waitFor(() => {
      expect(mockUpdateGeneratedDraftItem).toHaveBeenCalledWith({
        generationItemId: "item-2",
        stem: "Soal generator 2",
        options: {
          A: "Amlodipin",
          B: "Lisinopril",
          C: "Valsartan",
          D: "Furosemid",
          E: "Parasetamol",
        },
        correctOptionKey: "B",
        explanationText: "Pembahasan revisi setelah distribusi pertama.",
      });
    });
  });

  test("delivers the same item once to bank soal and once to a scheduled event", async () => {
    renderReviewPage();

    const draftCard = await screen.findByRole("article", { name: /soal 1/i });

    fireEvent.click(within(draftCard).getByRole("button", { name: /kirim ke bank soal/i }));
    fireEvent.change(screen.getByLabelText(/blok/i), {
      target: { value: "block-1" },
    });
    fireEvent.change(screen.getByLabelText(/materi/i), {
      target: { value: "topic-1" },
    });
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: /kirim ke bank soal/i }),
    );

    await waitFor(() => {
      expect(mockDeliverGeneratedItemToQuestionBank).toHaveBeenCalledWith({
        generationItemId: "item-1",
        blockId: "block-1",
        topicId: "topic-1",
      });
    });

    fireEvent.click(within(draftCard).getByRole("button", { name: /kirim ke sesi/i }));
    fireEvent.change(screen.getByLabelText(/sesi tujuan/i), {
      target: { value: "event-1" },
    });
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: /kirim ke sesi/i }),
    );

    await waitFor(() => {
      expect(mockDeliverGeneratedItemToScheduledEvent).toHaveBeenCalledWith({
        generationItemId: "item-1",
        eventId: "event-1",
      });
    });

    expect(await screen.findByText(/bank soal 1x \+ sesi 1x/i)).toBeInTheDocument();
    expect(screen.getAllByText(/clinical science \/ kardiologi/i)).toHaveLength(2);
    expect(screen.getByText(/to klinik juni/i)).toBeInTheDocument();
  });

  test("opens scheduled-event delivery even while taxonomy is still unavailable", async () => {
    mockListQuestionTaxonomy.mockImplementation(() => new Promise(() => undefined));
    renderReviewPage();

    const draftCard = await screen.findByRole("article", { name: /soal 1/i });
    fireEvent.click(within(draftCard).getByRole("button", { name: /kirim ke sesi/i }));

    expect(await screen.findByRole("dialog", { name: /kirim ke sesi/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/sesi tujuan/i)).toBeInTheDocument();
  });

  test("opens question-bank delivery even while events are still unavailable", async () => {
    mockListScheduledOpsEvents.mockImplementation(() => new Promise(() => undefined));
    renderReviewPage();

    const draftCard = await screen.findByRole("article", { name: /soal 1/i });
    fireEvent.click(within(draftCard).getByRole("button", { name: /kirim ke bank soal/i }));

    expect(await screen.findByRole("dialog", { name: /kirim ke bank soal/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/blok/i)).toBeInTheDocument();
  });

  test("keeps question-bank delivery available when scheduled-event loading fails", async () => {
    mockListScheduledOpsEvents.mockRejectedValueOnce(new Error("Event service gagal dimuat."));
    renderReviewPage();

    const draftCard = await screen.findByRole("article", { name: /soal 1/i });

    fireEvent.click(within(draftCard).getByRole("button", { name: /kirim ke sesi/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /kirim ke sesi/i })).not.toBeInTheDocument();
    });

    fireEvent.click(within(draftCard).getByRole("button", { name: /kirim ke bank soal/i }));

    expect(await screen.findByRole("dialog", { name: /kirim ke bank soal/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/blok/i)).toBeInTheDocument();
  });
});
