import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import ReviewPage from "./review-page";

const mockUseSession = vi.fn();
const mockListReviewHistory = vi.fn();
const mockGetReviewDetailData = vi.fn();

vi.mock("../../lib/auth/use-session", () => ({
  useSession: () => mockUseSession(),
}));

vi.mock("../../lib/api/review-api", () => ({
  listReviewHistory: (...args: unknown[]) => mockListReviewHistory(...args),
  getReviewDetailData: (...args: unknown[]) => mockGetReviewDetailData(...args),
}));

function renderReviewPage(initialEntry = "/app/review/attempt-1") {
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
          <Route path="/app/review" element={<ReviewPage />} />
          <Route path="/app/review/:attemptId" element={<ReviewPage />} />
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
  mockUseSession.mockReturnValue({
    status: "authenticated",
    session: {
      user: {
        id: "user-1",
      },
    },
    user: {
      id: "user-1",
    },
  });
  mockListReviewHistory.mockResolvedValue([
    {
      attemptId: "scheduled-attempt-1",
      title: "TO Klinik Juni",
      submittedAt: "2026-05-04T08:00:00.000Z",
      score: 82,
      correctAnswers: 33,
      wrongAnswers: 7,
      source: "scheduled",
    },
    {
      attemptId: "attempt-1",
      title: "Try Out Besar",
      submittedAt: "2026-05-03T08:00:00.000Z",
      score: 78,
      correctAnswers: 156,
      wrongAnswers: 44,
      source: "tryout",
    },
    {
      attemptId: "attempt-2",
      title: "Clinical Science",
      submittedAt: "2026-05-02T08:00:00.000Z",
      score: 70,
      correctAnswers: 70,
      wrongAnswers: 30,
      source: "tryout",
    },
  ]);
  mockGetReviewDetailData.mockResolvedValue({
    summary: {
      title: "Try Out Besar",
      submittedAt: "2026-05-03T08:00:00.000Z",
      score: 78,
      correctAnswers: 156,
      wrongAnswers: 44,
      source: "tryout",
    },
    items: [
      {
        id: "item-1",
        blockLabel: "Clinical Science",
        question: "Apa target tekanan darah pada CKD?",
        questionImageUrl: "https://example.com/questions/question-1.png",
        userAnswer: "<140/90",
        correctAnswer: "<130/80",
        explanationText: "Target dipilih lebih ketat untuk proteksi ginjal.",
        explanationImageUrl: "https://example.com/explanations/question-1.png",
        isWrong: true,
      },
      {
        id: "item-2",
        blockLabel: "Pharmaceutical Science",
        question: "Parameter sterilitas apa yang paling kritikal?",
        questionImageUrl: null,
        userAnswer: "Pilihan A",
        correctAnswer: "Pilihan B",
        explanationText: "Kegagalan aseptik paling langsung terlihat pada hasil media fill.",
        explanationImageUrl: null,
        isWrong: false,
      },
      {
        id: "item-3",
        blockLabel: "Social, Behavioral & Administrative Pharmacy",
        question: "Diagram intervensi farmasis mana yang paling sesuai?",
        questionImageUrl: null,
        userAnswer: null,
        correctAnswer: "Pilihan C",
        explanationText: null,
        explanationImageUrl: "https://example.com/explanations/question-3.png",
        isWrong: true,
      },
    ],
  });
});

describe("Review page", () => {
  test("renders merged review history with scheduled labels and scheduled detail links", async () => {
    renderReviewPage("/app/review");

    expect(await screen.findByText(/riwayat pembahasan/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(await screen.findByText(/^terjadwal$/i)).toBeInTheDocument();
    const reviewLinks = await screen.findAllByRole("link", { name: /buka pembahasan/i });
    expect(reviewLinks[0]).toHaveAttribute(
      "href",
      "/app/review/scheduled-attempt-1?source=scheduled",
    );
    expect(screen.getAllByText(/^try out$/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /buka pembahasan try out besar/i })).toHaveAttribute(
      "href",
      "/app/review/attempt-1",
    );
  });

  test("uses scheduled detail source and renders question navigation grid with question details", async () => {
    mockGetReviewDetailData.mockResolvedValueOnce({
      summary: {
        title: "TO Klinik Juni",
        submittedAt: "2026-05-04T08:00:00.000Z",
        score: 82,
        correctAnswers: 33,
        wrongAnswers: 7,
        source: "scheduled",
      },
      items: [
        {
          id: "item-1",
          blockLabel: "Clinical Science",
          question: "Apa target tekanan darah pada CKD?",
          questionImageUrl: "https://example.com/questions/question-1.png",
          userAnswer: "<140/90",
          correctAnswer: "<130/80",
          explanationText: "Target dipilih lebih ketat untuk proteksi ginjal.",
          explanationImageUrl: "https://example.com/explanations/question-1.png",
          isWrong: true,
        },
        {
          id: "item-2",
          blockLabel: "Pharmaceutical Science",
          question: "Parameter sterilitas apa yang paling kritikal?",
          questionImageUrl: null,
          userAnswer: "Pilihan A",
          correctAnswer: "Pilihan B",
          explanationText: "Kegagalan aseptik paling langsung terlihat pada hasil media fill.",
          explanationImageUrl: null,
          isWrong: false,
        },
      ],
    });

    renderReviewPage("/app/review/scheduled-attempt-1?source=scheduled");

    expect(await screen.findByText(/navigasi soal/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Soal 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Soal 2" })).toBeInTheDocument();

    expect(screen.getByText(/apa target tekanan darah pada ckd/i)).toBeInTheDocument();
    expect(screen.getByText("Perlu diulang")).toBeInTheDocument();
    expect(screen.getByAltText(/gambar soal 1/i)).toHaveAttribute("src", "https://example.com/questions/question-1.png");

    // Click Soal 2 in navigation grid
    fireEvent.click(screen.getByRole("button", { name: "Soal 2" }));

    expect(await screen.findByText(/parameter sterilitas apa yang paling kritikal/i)).toBeInTheDocument();
    expect(screen.getByText("Sudah benar")).toBeInTheDocument();
  });

  test("renders the redesigned summary stats card at the bottom", async () => {
    renderReviewPage("/app/review/attempt-1");

    expect(await screen.findByText(/apa target tekanan darah pada ckd/i)).toBeInTheDocument();
    const summaryPanel = screen.getByLabelText(/ringkasan hasil sesi/i);
    expect(within(summaryPanel).getByText(/^skor akhir$/i)).toBeInTheDocument();
    expect(within(summaryPanel).getByText(/^jawaban benar$/i)).toBeInTheDocument();
    expect(within(summaryPanel).getByText(/^jawaban salah$/i)).toBeInTheDocument();
    expect(within(summaryPanel).getByText(/^tanggal submit$/i)).toBeInTheDocument();
    expect(within(summaryPanel).getByText("78")).toBeInTheDocument();
  });
});
