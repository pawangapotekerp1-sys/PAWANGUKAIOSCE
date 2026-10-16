import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import QuestionsPage from "./questions-page";

const mockListQuestionBank = vi.fn();
const mockDeleteQuestion = vi.fn();
const mockDeleteQuestions = vi.fn();

vi.mock("../../lib/api/question-authoring-api", () => ({
  listQuestionBank: (...args: unknown[]) => mockListQuestionBank(...args),
  deleteQuestion: (...args: unknown[]) => mockDeleteQuestion(...args),
  deleteQuestions: (...args: unknown[]) => mockDeleteQuestions(...args),
}));

function renderQuestionsPage(initialEntry = "/app/questions") {
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
          <Route path="/admin/questions" element={<QuestionsPage />} />
          <Route path="/app/questions" element={<QuestionsPage />} />
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
  mockDeleteQuestion.mockResolvedValue({
    deletedIds: ["question-1"],
  });
  mockDeleteQuestions.mockResolvedValue({
    deletedIds: ["question-1", "question-3"],
  });
  mockListQuestionBank.mockResolvedValue([
    {
      id: "question-1",
      stem: "Apa target tekanan darah pada CKD?",
      status: "draft",
      statusLabel: "Draft",
      blockId: "block-1",
      blockName: "Clinical Science",
      topicId: "topic-1",
      topicName: "Kardiologi",
      questionImageUrl: "https://example.com/questions/ckd.png",
      hasQuestionImage: true,
      hasExplanationText: true,
      hasExplanationImage: false,
      updatedAt: "2026-05-03T08:00:00.000Z",
    },
    {
      id: "question-2",
      stem: "Pada evaluasi sediaan steril, indikator apa yang paling langsung menunjukkan masalah proses aseptik?",
      status: "published",
      statusLabel: "Published",
      blockId: "block-2",
      blockName: "Pharmaceutical Science",
      topicId: "topic-9",
      topicName: "Sediaan Liquid dan Sediaan steril",
      questionImageUrl: null,
      hasQuestionImage: false,
      hasExplanationText: true,
      hasExplanationImage: true,
      updatedAt: "2026-05-03T09:00:00.000Z",
    },
    {
      id: "question-3",
      stem: "Berapa target HbA1c pada pasien diabetes lansia?",
      status: "published",
      statusLabel: "Published",
      blockId: "block-1",
      blockName: "Clinical Science",
      topicId: "topic-2",
      topicName: "Endokrin",
      questionImageUrl: null,
      hasQuestionImage: false,
      hasExplanationText: true,
      hasExplanationImage: false,
      updatedAt: "2026-05-03T10:00:00.000Z",
    },
    {
      id: "question-4",
      stem: "Kasus interpretasi laboratorium klinis tanpa materi spesifik.",
      status: "draft",
      statusLabel: "Draft",
      blockId: "block-1",
      blockName: "Clinical Science",
      topicId: null,
      topicName: null,
      questionImageUrl: null,
      hasQuestionImage: false,
      hasExplanationText: false,
      hasExplanationImage: false,
      updatedAt: "2026-05-03T11:00:00.000Z",
    },
    {
      id: "question-5",
      stem: "Berapa lama resep narkotika harus diarsipkan menurut regulasi?",
      status: "published",
      statusLabel: "Published",
      blockId: "block-3",
      blockName: "Social Behavioural Administration of Pharmacy",
      topicId: "topic-3",
      topicName: "Regulasi & Etika",
      questionImageUrl: null,
      hasQuestionImage: false,
      hasExplanationText: true,
      hasExplanationImage: false,
      updatedAt: "2026-05-03T12:00:00.000Z",
    },
  ]);
});

describe("QuestionsPage - Block selection and list integration", () => {
  test("renders 3 block cards and primary Tambah soal button by default on /admin/questions and /app/questions", async () => {
    const { unmount } = renderQuestionsPage("/admin/questions");

    expect(
      await screen.findByRole("heading", { name: /bank soal/i, level: 1 }),
    ).toBeInTheDocument();

    // Verify 3 block cards are rendered with their titles
    expect(screen.getByRole("article", { name: "Clinical Science" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Pharmaceutical Science" })).toBeInTheDocument();
    expect(
      screen.getByRole("article", {
        name: "Social Behavioural Administration of Pharmacy",
      }),
    ).toBeInTheDocument();

    // Verify question counts on cards
    expect(screen.getByText("3 Soal")).toBeInTheDocument(); // Clinical Science has 3 questions

    // Verify primary "Tambah soal" button on admin
    const tambahSoalAdmin = screen.getByRole("link", { name: /tambah soal/i });
    expect(tambahSoalAdmin).toHaveAttribute("href", "/admin/questions/new");
    expect(tambahSoalAdmin).toHaveAttribute("data-variant", "primary");

    unmount();

    // Test /app/questions surface
    renderQuestionsPage("/app/questions");

    expect(
      await screen.findByRole("heading", { name: /bank soal/i, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Clinical Science" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Pharmaceutical Science" })).toBeInTheDocument();
    expect(
      screen.getByRole("article", {
        name: "Social Behavioural Administration of Pharmacy",
      }),
    ).toBeInTheDocument();

    const tambahSoalMentor = screen.getByRole("link", { name: /tambah soal/i });
    expect(tambahSoalMentor).toHaveAttribute("href", "/app/questions/new");
    expect(tambahSoalMentor).toHaveAttribute("data-variant", "primary");
  });

  test("clicking a block card enters the block questions list", async () => {
    renderQuestionsPage("/admin/questions");

    expect(
      await screen.findByRole("article", { name: "Clinical Science" }),
    ).toBeInTheDocument();

    // Click Clinical Science card
    fireEvent.click(screen.getByRole("article", { name: "Clinical Science" }));

    // Verify block questions view displays
    expect(
      await screen.findByRole("heading", { name: "Clinical Science", level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /kembali ke pilihan blok/i }),
    ).toBeInTheDocument();

    // Only Clinical Science questions should be present
    expect(screen.getByText(/apa target tekanan darah pada ckd/i)).toBeInTheDocument();
    expect(screen.getByText(/berapa target hba1c pada pasien diabetes lansia/i)).toBeInTheDocument();
    expect(
      screen.getByText(/kasus interpretasi laboratorium klinis tanpa materi spesifik/i),
    ).toBeInTheDocument();

    // Other blocks' questions must NOT be present
    expect(
      screen.queryByText(/pada evaluasi sediaan steril/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/berapa lama resep narkotika harus diarsipkan/i),
    ).not.toBeInTheDocument();

    // "Tambah soal" link includes the active block parameter
    expect(screen.getByRole("link", { name: /tambah soal/i })).toHaveAttribute(
      "href",
      "/admin/questions/new?block=clinical-science",
    );
  });

  test("clicking 'Kembali ke Pilihan Blok' navigates back to the 3 block cards", async () => {
    renderQuestionsPage("/admin/questions?block=clinical-science");

    expect(
      await screen.findByRole("heading", { name: "Clinical Science", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/apa target tekanan darah pada ckd/i)).toBeInTheDocument();

    // Click back button
    fireEvent.click(screen.getByRole("button", { name: /kembali ke pilihan blok/i }));

    // Should return to 3 cards view
    expect(
      await screen.findByRole("article", { name: "Clinical Science" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Pharmaceutical Science" })).toBeInTheDocument();
    expect(
      screen.getByRole("article", {
        name: "Social Behavioural Administration of Pharmacy",
      }),
    ).toBeInTheDocument();

    // Block questions list should no longer be visible
    expect(screen.queryByText(/apa target tekanan darah pada ckd/i)).not.toBeInTheDocument();
  });

  test("inside a block, block dropdown is absent, only materi dropdown exists, and filtering strictly applies", async () => {
    renderQuestionsPage("/admin/questions?block=clinical-science");

    expect(
      await screen.findByText(/apa target tekanan darah pada ckd/i),
    ).toBeInTheDocument();

    // Verify block select dropdown does NOT exist
    expect(screen.queryByLabelText(/^blok$/i)).not.toBeInTheDocument();

    // Verify materi select dropdown exists
    const materiSelect = screen.getByLabelText(/^materi$/i);
    expect(materiSelect).toBeInTheDocument();

    // Filter strictly to "Kardiologi"
    fireEvent.change(materiSelect, {
      target: { value: "Kardiologi" },
    });

    await waitFor(() => {
      expect(screen.getByText(/apa target tekanan darah pada ckd/i)).toBeInTheDocument();
      expect(
        screen.queryByText(/berapa target hba1c pada pasien diabetes lansia/i),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/kasus interpretasi laboratorium klinis tanpa materi spesifik/i),
      ).not.toBeInTheDocument();
    });
  });

  test("'Tanpa materi' filter strictly displays unassigned questions", async () => {
    renderQuestionsPage("/admin/questions?block=clinical-science");

    expect(
      await screen.findByText(/apa target tekanan darah pada ckd/i),
    ).toBeInTheDocument();

    const materiSelect = screen.getByLabelText(/^materi$/i);

    // Filter by "unassigned" (Tanpa materi)
    fireEvent.change(materiSelect, {
      target: { value: "unassigned" },
    });

    await waitFor(() => {
      expect(
        screen.getByText(/kasus interpretasi laboratorium klinis tanpa materi spesifik/i),
      ).toBeInTheDocument();
      expect(
        screen.queryByText(/apa target tekanan darah pada ckd/i),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/berapa target hba1c pada pasien diabetes lansia/i),
      ).not.toBeInTheDocument();
    });
  });

  test("deletes a single question and bulk deletes questions within block question list", async () => {
    renderQuestionsPage("/admin/questions?block=clinical-science");

    expect(
      await screen.findByText(/apa target tekanan darah pada ckd/i),
    ).toBeInTheDocument();

    // 1. Single delete
    const deleteButtons = screen.getAllByRole("button", { name: /hapus soal/i });
    fireEvent.click(deleteButtons[0]);

    const singleDialog = await screen.findByRole("alertdialog");
    expect(singleDialog).toHaveTextContent(/hapus soal ini/i);

    fireEvent.click(within(singleDialog).getByRole("button", { name: /hapus soal/i }));

    await waitFor(() => {
      expect(mockDeleteQuestion).toHaveBeenCalledWith({
        questionId: "question-1",
      });
    });

    // 2. Bulk delete
    fireEvent.click(
      screen.getByRole("checkbox", { name: /pilih soal apa target tekanan darah pada ckd/i }),
    );
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /pilih soal berapa target hba1c pada pasien diabetes lansia/i,
      }),
    );

    expect(screen.getByText("2 soal dipilih.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /hapus terpilih/i }));

    const bulkDialog = await screen.findByRole("alertdialog");
    expect(bulkDialog).toHaveTextContent(/hapus 2 soal/i);

    fireEvent.click(within(bulkDialog).getByRole("button", { name: /hapus 2 soal/i }));

    await waitFor(() => {
      expect(mockDeleteQuestions).toHaveBeenCalledWith({
        questionIds: ["question-1", "question-3"],
      });
    });
  });

  test("clears selections that are hidden after changing topic filter", async () => {
    renderQuestionsPage("/admin/questions?block=clinical-science");

    expect(
      await screen.findByText(/apa target tekanan darah pada ckd/i),
    ).toBeInTheDocument();

    // Select question-1 (Kardiologi)
    fireEvent.click(
      screen.getByRole("checkbox", { name: /pilih soal apa target tekanan darah pada ckd/i }),
    );
    expect(screen.getByText("1 soal dipilih.")).toBeInTheDocument();

    // Change topic filter to "Endokrin"
    fireEvent.change(screen.getByLabelText(/^materi$/i), {
      target: { value: "Endokrin" },
    });

    await waitFor(() => {
      expect(
        screen.queryByText(/apa target tekanan darah pada ckd/i),
      ).not.toBeInTheDocument();
    });

    // Selection should be cleared
    expect(screen.getByText("0 soal dipilih.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /hapus terpilih/i })).toBeDisabled();
  });

  test("renders loading and error states properly", async () => {
    mockListQuestionBank.mockImplementationOnce(
      () => new Promise(() => {}), // Never resolves
    );

    const { unmount } = renderQuestionsPage("/admin/questions");

    expect(screen.getByText(/daftar soal sedang dimuat/i)).toBeInTheDocument();

    unmount();

    mockListQuestionBank.mockRejectedValueOnce(new Error("Network failure"));
    renderQuestionsPage("/admin/questions");

    expect(await screen.findByText(/bank soal belum tersedia/i)).toBeInTheDocument();
    expect(screen.getByText(/daftar soal belum bisa dimuat/i)).toBeInTheDocument();
  });
});
