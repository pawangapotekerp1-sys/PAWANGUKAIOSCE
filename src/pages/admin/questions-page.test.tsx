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
    deletedIds: ["question-1", "question-2"],
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
  ]);
});

describe("Questions page", () => {
  test("renders the admin question bank surface without the removed legacy upload workflow", async () => {
    renderQuestionsPage("/admin/questions");

    expect(await screen.findByRole("heading", {
      name: /bank soal/i,
      level: 1,
    })).toBeInTheDocument();
    expect(await screen.findByText(/daftar soal/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.getByText(/filter soal/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(await screen.findByText(/apa target tekanan darah pada ckd/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /tambah soal/i })).toHaveAttribute(
      "href",
      "/admin/questions/new",
    );
    expect(screen.getByRole("link", { name: /tambah soal/i })).toHaveAttribute("data-variant", "primary");
    expect(screen.getAllByRole("link", { name: /edit soal/i })[0]).toHaveAttribute(
      "href",
      "/admin/questions/question-1/edit",
    );
    expect(screen.queryByText(/upload soal terstruktur/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).not.toBeInTheDocument();
    expect(screen.queryByText(/riwayat batch terbaru/i)).not.toBeInTheDocument();
  });

  test("renders the mentor question bank with final curated questions", async () => {
    renderQuestionsPage();

    expect(await screen.findByRole("heading", {
      name: /bank soal/i,
      level: 1,
    })).toBeInTheDocument();
    expect(await screen.findByText(/daftar soal/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.getByText(/filter soal/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.queryByText(/upload soal terstruktur/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).not.toBeInTheDocument();
    expect(screen.queryByText(/riwayat batch terbaru/i)).not.toBeInTheDocument();
    expect(await screen.findByText(/apa target tekanan darah pada ckd/i)).toBeInTheDocument();
    expect(screen.getByText(/pada evaluasi sediaan steril/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /tambah soal/i })).toHaveAttribute(
      "href",
      "/app/questions/new",
    );
    expect(screen.getByRole("link", { name: /tambah soal/i })).toHaveAttribute("data-variant", "primary");
  });

  test("filters the list by blok and materi", async () => {
    renderQuestionsPage();

    await screen.findByText(/apa target tekanan darah pada ckd/i);

    fireEvent.change(screen.getByLabelText(/blok/i), {
      target: { value: "Clinical Science" },
    });

    await waitFor(() => {
      expect(screen.getByText(/apa target tekanan darah pada ckd/i)).toBeInTheDocument();
      expect(screen.queryByText(/pada evaluasi sediaan steril/i)).not.toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/materi/i), {
      target: { value: "Kardiologi" },
    });

    expect(screen.getByText(/apa target tekanan darah pada ckd/i)).toBeInTheDocument();
  });

  test("clears bulk selections that are no longer visible after changing filters", async () => {
    renderQuestionsPage("/admin/questions");

    expect(await screen.findByText(/apa target tekanan darah pada ckd/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: /pilih soal pada evaluasi sediaan steril/i }));
    expect(screen.getByText(/1 soal dipilih/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/blok/i), {
      target: { value: "Clinical Science" },
    });

    await waitFor(() => {
      expect(screen.queryByText(/pada evaluasi sediaan steril/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(/pilih soal untuk dihapus/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /hapus terpilih/i })).toHaveAttribute("data-variant", "destructive");
    expect(screen.getByRole("button", { name: /hapus terpilih/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /hapus terpilih/i })).toHaveTextContent(/hapus terpilih/i);
  });

  test("keeps mentor edit actions on the app question routes", async () => {
    renderQuestionsPage("/app/questions");

    expect(await screen.findByRole("heading", {
      name: /bank soal/i,
      level: 1,
    })).toBeInTheDocument();
    expect(await screen.findByText(/apa target tekanan darah pada ckd/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /tambah soal/i })).toHaveAttribute(
      "href",
      "/app/questions/new",
    );
    expect(screen.getAllByRole("link", { name: /edit soal/i })[0]).toHaveAttribute(
      "href",
      "/app/questions/question-1/edit",
    );
  });

  test("confirms through an accessible dialog before deleting a single question from the bank", async () => {
    renderQuestionsPage("/app/questions");

    expect(await screen.findByText(/apa target tekanan darah pada ckd/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /hapus soal/i })[0]).toHaveAttribute("data-variant", "destructive");

    fireEvent.click(screen.getAllByRole("button", { name: /hapus soal/i })[0]);

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent(/hapus soal ini/i);
    expect(dialog).toHaveTextContent(/soal ini akan dihapus dari bank soal/i);

    fireEvent.click(within(dialog).getByRole("button", { name: /hapus soal/i }));

    await waitFor(() => {
      expect(mockDeleteQuestion).toHaveBeenCalledWith({
        questionId: "question-1",
      });
    });
  });

  test("bulk deletes the selected questions after confirmation in a dialog", async () => {
    renderQuestionsPage("/admin/questions");

    expect(await screen.findByText(/apa target tekanan darah pada ckd/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: /pilih soal apa target tekanan darah pada ckd/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /pilih soal pada evaluasi sediaan steril/i }));
    fireEvent.click(screen.getByRole("button", { name: /hapus terpilih/i }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent(/2 soal/i);

    fireEvent.click(within(dialog).getByRole("button", { name: /hapus 2 soal/i }));

    await waitFor(() => {
      expect(mockDeleteQuestions).toHaveBeenCalledWith({
        questionIds: ["question-1", "question-2"],
      });
    });
  });

  test("refreshes the question bank even when bulk delete fails", async () => {
    mockDeleteQuestions.mockRejectedValueOnce(new Error("Sebagian soal gagal dihapus."));
    renderQuestionsPage("/admin/questions");

    expect(await screen.findByText(/apa target tekanan darah pada ckd/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: /pilih soal apa target tekanan darah pada ckd/i }));
    fireEvent.click(screen.getByRole("button", { name: /hapus terpilih/i }));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: /hapus 1 soal/i }));

    expect(await screen.findByText(/sebagian soal gagal dihapus/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(mockListQuestionBank).toHaveBeenCalledTimes(2);
    });
  });
});
