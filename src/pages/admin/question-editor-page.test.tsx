import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import QuestionEditorPage from "./question-editor-page";

const mockListQuestionTaxonomy = vi.fn();
const mockGetQuestionEditorData = vi.fn();
const mockCreateQuestion = vi.fn();
const mockUpdateQuestion = vi.fn();
const mockUploadQuestionMedia = vi.fn();
const mockCreateManualQuestionDraft = vi.fn();

vi.mock("../../lib/api/question-authoring-api", () => ({
  createManualQuestionDraft: (...args: unknown[]) => mockCreateManualQuestionDraft(...args),
  listQuestionTaxonomy: (...args: unknown[]) => mockListQuestionTaxonomy(...args),
  getQuestionEditorData: (...args: unknown[]) => mockGetQuestionEditorData(...args),
  createQuestion: (...args: unknown[]) => mockCreateQuestion(...args),
  updateQuestion: (...args: unknown[]) => mockUpdateQuestion(...args),
  uploadQuestionMedia: (...args: unknown[]) => mockUploadQuestionMedia(...args),
}));

function renderQuestionEditorPage(initialEntry = "/app/questions/new") {
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
          <Route path="/admin/questions" element={<div>Admin bank soal</div>} />
          <Route path="/admin/questions/new" element={<QuestionEditorPage />} />
          <Route path="/admin/questions/:questionId/edit" element={<QuestionEditorPage />} />
          <Route path="/app/questions" element={<div>Mentor bank soal</div>} />
          <Route path="/app/questions/new" element={<QuestionEditorPage />} />
          <Route path="/app/questions/:questionId/edit" element={<QuestionEditorPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
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
        { id: "topic-9", name: "Sediaan Liquid dan Sediaan steril", slug: "sediaan-liquid" },
      ],
    },
  ]);
  mockGetQuestionEditorData.mockResolvedValue(null);
  mockCreateQuestion.mockResolvedValue({ id: "question-1" });
  mockUpdateQuestion.mockResolvedValue({ id: "question-9" });
  mockCreateManualQuestionDraft.mockResolvedValue({
    batchId: "batch-manual",
    itemId: "item-manual",
    workflowStatus: "draft_ready",
  });
  mockUploadQuestionMedia.mockResolvedValue({
    path: "question/questions/draft-image.png",
    signedUrl: "https://example.com/question/questions/draft-image.png",
  });
});

describe("Question editor page", () => {
  test("keeps the back link on the admin question bank surface", async () => {
    renderQuestionEditorPage("/admin/questions/new");

    expect(await screen.findByText(/editor soal/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    await screen.findByLabelText(/blok/i);
    expect(screen.getByRole("link", { name: /kembali ke bank soal/i })).toHaveAttribute(
      "href",
      "/admin/questions",
    );
    expect(screen.getByRole("link", { name: /kembali ke bank soal/i })).toHaveAttribute("data-variant", "outline");
  });

  test("preselects the first taxonomy pair on a new question form", async () => {
    renderQuestionEditorPage();

    const blockSelect = await screen.findByLabelText(/blok/i);
    const topicSelect = screen.getByLabelText(/materi/i);

    await waitFor(() => {
      expect(blockSelect).toHaveValue("block-1");
      expect(topicSelect).toHaveValue("topic-1");
    });
  });

  test("validates the required manual fields before saving", async () => {
    renderQuestionEditorPage();

    await screen.findByLabelText(/blok/i);
    expect(screen.queryByText(/ringkasan soal/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /simpan soal/i })).toHaveAttribute("data-variant", "primary");
    expect(screen.getAllByRole("link", { name: /kembali ke bank soal/i })[1]).toHaveAttribute("data-variant", "outline");

    fireEvent.click(screen.getByRole("button", { name: /simpan soal/i }));

    expect(await screen.findByText(/lengkapi soal, minimal dua opsi jawaban/i)).toBeInTheDocument();
    expect(mockCreateQuestion).not.toHaveBeenCalled();
  }, 10_000);

  test("filters materi by blok and saves a new manual question with uploaded media", async () => {
    renderQuestionEditorPage();

    await screen.findByLabelText(/blok/i);

    fireEvent.change(screen.getByLabelText(/^soal$/i), {
      target: { value: "Apa target tekanan darah pada CKD?" },
    });
    fireEvent.change(screen.getByLabelText(/opsi a/i), {
      target: { value: "<140/90" },
    });
    fireEvent.change(screen.getByLabelText(/opsi b/i), {
      target: { value: "<130/80" },
    });
    fireEvent.change(screen.getByLabelText(/opsi c/i), {
      target: { value: "<120/70" },
    });
    fireEvent.change(screen.getByLabelText(/opsi d/i), {
      target: { value: "<150/100" },
    });
    fireEvent.change(screen.getByLabelText(/opsi e/i), {
      target: { value: "<160/110" },
    });
    fireEvent.change(screen.getByLabelText(/blok/i), {
      target: { value: "block-1" },
    });

    await waitFor(() => {
      expect(screen.getByRole("option", { name: /kardiologi/i })).toBeInTheDocument();
      expect(screen.queryByRole("option", { name: /sediaan liquid dan sediaan steril/i })).not.toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/materi/i), {
      target: { value: "topic-1" },
    });
    fireEvent.change(screen.getByLabelText(/kunci jawaban/i), {
      target: { value: "B" },
    });
    fireEvent.change(screen.getByLabelText(/^pembahasan$/i), {
      target: { value: "Target dipilih lebih ketat untuk proteksi ginjal." },
    });

    const imageFile = new File(["image"], "question.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText(/^gambar soal$/i), {
      target: { files: [imageFile] },
    });

    await waitFor(() => {
      expect(mockUploadQuestionMedia).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: /simpan soal/i }));

    await waitFor(() => {
      expect(mockCreateQuestion).toHaveBeenCalledWith({
        input: expect.objectContaining({
          stem: "Apa target tekanan darah pada CKD?",
          blockId: "block-1",
          topicId: "topic-1",
          questionImagePath: "question/questions/draft-image.png",
          explanationText: "Target dipilih lebih ketat untuk proteksi ginjal.",
        }),
      });
    });
  });

  test("renders question image input between the stem field and option A", async () => {
    renderQuestionEditorPage();

    const stemField = await screen.findByLabelText(/^soal$/i);
    const questionImageInput = screen.getByLabelText(/^gambar soal$/i);
    const optionAField = screen.getByLabelText(/opsi a/i);

    expect(stemField.compareDocumentPosition(questionImageInput)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(questionImageInput.compareDocumentPosition(optionAField)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  test("saves a new question with the default taxonomy selection when the user leaves taxonomy untouched", async () => {
    renderQuestionEditorPage();

    await screen.findByLabelText(/blok/i);

    fireEvent.change(screen.getByLabelText(/^soal$/i), {
      target: { value: "Seorang pasien hipertensi diberikan obat X. Mekanisme kerja utama obat X adalah..." },
    });
    fireEvent.change(screen.getByLabelText(/opsi a/i), {
      target: { value: "Vasodilatasi arteri melalui blok kanal kalsium" },
    });
    fireEvent.change(screen.getByLabelText(/opsi b/i), {
      target: { value: "Diuretik yang meningkatkan ekskresi natrium" },
    });
    fireEvent.change(screen.getByLabelText(/opsi c/i), {
      target: { value: "Inhibitor ACE yang menurunkan produksi angiotensin II" },
    });
    fireEvent.change(screen.getByLabelText(/opsi d/i), {
      target: { value: "Penghambat reseptor beta yang menurunkan denyut jantung" },
    });
    fireEvent.change(screen.getByLabelText(/kunci jawaban/i), {
      target: { value: "A" },
    });

    fireEvent.click(screen.getByRole("button", { name: /simpan soal/i }));

    await waitFor(() => {
      expect(mockCreateQuestion).toHaveBeenCalledWith({
        input: expect.objectContaining({
          blockId: "block-1",
          topicId: "topic-1",
          options: [
            {
              key: "A",
              text: "Vasodilatasi arteri melalui blok kanal kalsium",
              isCorrect: true,
            },
            {
              key: "B",
              text: "Diuretik yang meningkatkan ekskresi natrium",
              isCorrect: false,
            },
            {
              key: "C",
              text: "Inhibitor ACE yang menurunkan produksi angiotensin II",
              isCorrect: false,
            },
            {
              key: "D",
              text: "Penghambat reseptor beta yang menurunkan denyut jantung",
              isCorrect: false,
            },
          ],
        }),
      });
    });
  });

  test("renders option E and allows saving a question with E as the correct answer", async () => {
    renderQuestionEditorPage();

    await screen.findByLabelText(/blok/i);

    expect(screen.getByLabelText(/opsi e/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^soal$/i), {
      target: { value: "Pilihan antibiotik lini terakhir pada kasus ini adalah?" },
    });
    fireEvent.change(screen.getByLabelText(/opsi a/i), {
      target: { value: "Amoksisilin" },
    });
    fireEvent.change(screen.getByLabelText(/opsi b/i), {
      target: { value: "Ampisilin" },
    });
    fireEvent.change(screen.getByLabelText(/opsi c/i), {
      target: { value: "Sefadroksil" },
    });
    fireEvent.change(screen.getByLabelText(/opsi d/i), {
      target: { value: "Siprofloksasin" },
    });
    fireEvent.change(screen.getByLabelText(/opsi e/i), {
      target: { value: "Meropenem" },
    });
    fireEvent.change(screen.getByLabelText(/blok/i), {
      target: { value: "block-1" },
    });
    fireEvent.change(screen.getByLabelText(/materi/i), {
      target: { value: "topic-1" },
    });
    fireEvent.change(screen.getByLabelText(/kunci jawaban/i), {
      target: { value: "E" },
    });

    fireEvent.click(screen.getByRole("button", { name: /simpan soal/i }));

    await waitFor(() => {
      expect(mockCreateQuestion).toHaveBeenCalledWith({
        input: expect.objectContaining({
          stem: "Pilihan antibiotik lini terakhir pada kasus ini adalah?",
          options: [
            { key: "A", text: "Amoksisilin", isCorrect: false },
            { key: "B", text: "Ampisilin", isCorrect: false },
            { key: "C", text: "Sefadroksil", isCorrect: false },
            { key: "D", text: "Siprofloksasin", isCorrect: false },
            { key: "E", text: "Meropenem", isCorrect: true },
          ],
        }),
      });
    });
  });

  test("loads existing question data in edit mode and saves updates", async () => {
    mockGetQuestionEditorData.mockResolvedValue({
      id: "question-9",
      stem: "Dokumentasi intervensi farmasis paling berguna bila ditautkan dengan apa?",
      status: "published",
      statusLabel: "Published",
      blockId: "block-2",
      blockName: "Pharmaceutical Science",
      topicId: "topic-9",
      topicName: "Sediaan Liquid dan Sediaan steril",
      questionImagePath: "question/questions/question-9.png",
      questionImageUrl: "https://example.com/question/questions/question-9.png",
      explanationText: "Tujuan klinis dan hasil monitoring memudahkan tindak lanjut.",
      explanationImagePath: null,
      explanationImageUrl: null,
      options: [
        { id: "option-1", key: "A", text: "Promo produk", isCorrect: false, sortOrder: 1 },
        { id: "option-2", key: "B", text: "Tujuan klinis", isCorrect: true, sortOrder: 2 },
        { id: "option-3", key: "C", text: "Riwayat stok mingguan", isCorrect: false, sortOrder: 3 },
        { id: "option-4", key: "D", text: "Warna kemasan", isCorrect: false, sortOrder: 4 },
      ],
      correctOptionKey: "B",
      updatedAt: "2026-05-03T09:15:00.000Z",
    });

    renderQuestionEditorPage("/app/questions/question-9/edit");

    expect(await screen.findByDisplayValue(/dokumentasi intervensi farmasis/i)).toBeInTheDocument();
    expect(screen.getByAltText(/pratinjau gambar soal/i)).toHaveAttribute(
      "src",
      "https://example.com/question/questions/question-9.png",
    );

    fireEvent.change(screen.getByLabelText(/^soal$/i), {
      target: { value: "Dokumentasi intervensi farmasis akan paling berguna bila ditautkan dengan tujuan klinis apa?" },
    });

    fireEvent.click(screen.getByRole("button", { name: /simpan soal/i }));

    await waitFor(() => {
      expect(mockUpdateQuestion).toHaveBeenCalledWith({
        questionId: "question-9",
        input: expect.objectContaining({
          stem: "Dokumentasi intervensi farmasis akan paling berguna bila ditautkan dengan tujuan klinis apa?",
          status: "published",
          blockId: "block-2",
          topicId: "topic-9",
          options: [
            { key: "A", text: "Promo produk", isCorrect: false },
            { key: "B", text: "Tujuan klinis", isCorrect: true },
            { key: "C", text: "Riwayat stok mingguan", isCorrect: false },
            { key: "D", text: "Warna kemasan", isCorrect: false },
          ],
        }),
      });
    });
  });

  test("redirects back to the mentor question bank after saving a new question", async () => {
    renderQuestionEditorPage("/app/questions/new");

    await screen.findByLabelText(/blok/i);

    fireEvent.change(screen.getByLabelText(/^soal$/i), {
      target: { value: "Apa target tekanan darah pada CKD?" },
    });
    fireEvent.change(screen.getByLabelText(/opsi a/i), {
      target: { value: "<140/90" },
    });
    fireEvent.change(screen.getByLabelText(/opsi b/i), {
      target: { value: "<130/80" },
    });
    fireEvent.change(screen.getByLabelText(/kunci jawaban/i), {
      target: { value: "A" },
    });

    fireEvent.click(screen.getByRole("button", { name: /simpan soal/i }));

    expect(await screen.findByText(/mentor bank soal/i)).toBeInTheDocument();
  });

  test("redirects back to the admin question bank after saving an edited question", async () => {
    mockGetQuestionEditorData.mockResolvedValue({
      id: "question-9",
      stem: "Dokumentasi intervensi farmasis paling berguna bila ditautkan dengan apa?",
      status: "published",
      statusLabel: "Published",
      blockId: "block-2",
      blockName: "Pharmaceutical Science",
      topicId: "topic-9",
      topicName: "Sediaan Liquid dan Sediaan steril",
      questionImagePath: null,
      questionImageUrl: null,
      explanationText: null,
      explanationImagePath: null,
      explanationImageUrl: null,
      options: [
        { id: "option-1", key: "A", text: "Promo produk", isCorrect: false, sortOrder: 1 },
        { id: "option-2", key: "B", text: "Tujuan klinis", isCorrect: true, sortOrder: 2 },
      ],
      correctOptionKey: "B",
      updatedAt: "2026-05-03T09:15:00.000Z",
    });

    renderQuestionEditorPage("/admin/questions/question-9/edit");

    expect(await screen.findByDisplayValue(/dokumentasi intervensi farmasis/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /simpan soal/i }));

    expect(await screen.findByText(/admin bank soal/i)).toBeInTheDocument();
  });

  test("keeps the back link on the mentor question bank surface", async () => {
    renderQuestionEditorPage("/app/questions/new");

    await screen.findByLabelText(/blok/i);
    const backLinks = screen.getAllByRole("link", { name: /kembali ke bank soal/i });
    expect(backLinks[0]).toHaveAttribute("href", "/app/questions");
    expect(backLinks[1]).toHaveAttribute("data-variant", "outline");
  });
});
