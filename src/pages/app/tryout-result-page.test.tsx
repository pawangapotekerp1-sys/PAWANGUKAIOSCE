import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import { BookOpenCheck, CircleGauge, FileCheck2 } from "lucide-react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import TryoutResultPage from "./tryout-result-page";

const mockFindLatestSubmittedAttemptId = vi.fn();
const mockGetAttemptResultPageData = vi.fn();
const mockUseStudentShell = vi.fn();
const defaultResultBlocks = [
  {
    blockLabel: "Clinical Science",
    correct: 17,
    wrong: 5,
  },
  {
    blockLabel: "Pharmaceutical Science",
    correct: 14,
    wrong: 4,
  },
];

vi.mock("../../lib/api/tryout-api", () => ({
  findLatestSubmittedAttemptId: (...args: unknown[]) => mockFindLatestSubmittedAttemptId(...args),
  getAttemptResultPageData: (...args: unknown[]) => mockGetAttemptResultPageData(...args),
}));

vi.mock("./use-student-shell", () => ({
  useStudentShell: (...args: unknown[]) => mockUseStudentShell(...args),
}));

vi.mock("../../lib/auth/use-session", () => ({
  useSession: () => ({
    user: {
      id: "user-1",
    },
  }),
}));

function renderTryoutResult(initialEntry = "/app/tryout/result?attempt=attempt-1") {
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
        <TryoutResultPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
  mockUseStudentShell.mockReturnValue({
    navItems: [
      { href: "/app", label: "Ringkasan", icon: CircleGauge, active: false },
      { href: "/app/tryout", label: "Try Out", icon: FileCheck2, active: true },
      { href: "/app/review", label: "Review", icon: BookOpenCheck, active: false },
    ],
    tierLabel: "Pro",
    role: "pro",
  });
  mockFindLatestSubmittedAttemptId.mockResolvedValue("attempt-1");
  mockGetAttemptResultPageData.mockResolvedValue({
    attemptId: "attempt-1",
    score: 78,
    correctAnswers: 31,
    wrongAnswers: 9,
    unansweredCount: 0,
    timeUsedSeconds: 2100,
    blocks: defaultResultBlocks,
  });
});

describe("Tryout result page", () => {
  test("renders the result summary with a single primary review CTA", async () => {
    const { container } = renderTryoutResult();
    const resultSection = container.querySelector("#tryout");

    expect(await screen.findByText(/^hasil try out$/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.getByText(/skor akhir, hasil per blok, dan akses pembahasan/i)).toBeInTheDocument();
    expect(await screen.findByText(/^78$/)).toBeInTheDocument();
    expect(screen.getByText(/^31$/)).toBeInTheDocument();
    expect(screen.getByText(/00:35:00/i)).toBeInTheDocument();
    expect(screen.getByText(/17 benar, 5 salah/i)).toBeInTheDocument();
    expect(screen.getByText(/14 benar, 4 salah/i)).toBeInTheDocument();
    expect(screen.getByText("31 dari 40 soal terjawab benar pada sesi ini.")).toBeInTheDocument();
    expect(screen.getByText("Review jawaban Clinical Science yang masih salah lebih dulu.")).toBeInTheDocument();

    expect(resultSection).not.toBeNull();
    const successRegion = resultSection as HTMLElement;
    const reviewCtas = within(successRegion).getAllByRole("link", { name: /review jawaban/i });
    const primaryActions = successRegion.querySelectorAll('[data-variant="primary"]');
    const legacyReviewLinks = within(successRegion)
      .queryAllByRole("link", { name: /buka pembahasan/i })
      .filter((link) => link.getAttribute("data-variant") === "primary");

    expect(reviewCtas).toHaveLength(1);
    expect(primaryActions).toHaveLength(1);
    expect(reviewCtas[0]).toHaveAttribute("href", "/app/review/attempt-1");
    expect(reviewCtas[0]).toHaveAttribute("data-variant", "primary");
    expect(legacyReviewLinks).toHaveLength(0);
  });

  test("keeps the hero content before the supporting detail sections", async () => {
    const { container } = renderTryoutResult();

    const scoreAnchor = await screen.findByText(/^78$/);
    const heroPanel = scoreAnchor.closest("div.rounded-xl");
    const supportingLabel = screen.getByText(/jawaban benar/i);
    const distributionHeading = screen.getByText(/distribusi hasil/i);

    expect(heroPanel).not.toBeNull();
    const heroRegion = heroPanel as HTMLElement;
    const reviewLink = within(heroRegion).getByRole("link", { name: /review jawaban/i });
    const resultSection = container.querySelector("#tryout");

    expect(resultSection).not.toBeNull();
    expect(resultSection).toContainElement(reviewLink);
    expect(heroRegion).toContainElement(reviewLink);
    expect(scoreAnchor.compareDocumentPosition(distributionHeading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(reviewLink.compareDocumentPosition(supportingLabel)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(reviewLink.compareDocumentPosition(distributionHeading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  test("renders short actionable insight copy for the weakest block", async () => {
    renderTryoutResult();

    expect(await screen.findByText(/^hasil try out$/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(await screen.findByText("Review jawaban Clinical Science yang masih salah lebih dulu.")).toBeInTheDocument();
  });

  test("falls back to a generic review prompt when the highest wrong count is tied", async () => {
    mockGetAttemptResultPageData.mockResolvedValueOnce({
      attemptId: "attempt-1",
      score: 78,
      correctAnswers: 31,
      wrongAnswers: 10,
      unansweredCount: 0,
      timeUsedSeconds: 2100,
      blocks: [
        {
          blockLabel: "Clinical Science",
          correct: 17,
          wrong: 5,
        },
        {
          blockLabel: "Pharmaceutical Science",
          correct: 14,
          wrong: 5,
        },
      ],
    });

    renderTryoutResult();

    expect(await screen.findByText("Review jawaban yang masih salah lebih dulu.")).toBeInTheDocument();
    expect(screen.queryByText(/review jawaban clinical science/i)).not.toBeInTheDocument();
  });

  test("falls back to a generic review prompt when block data is empty", async () => {
    mockGetAttemptResultPageData.mockResolvedValueOnce({
      attemptId: "attempt-1",
      score: 78,
      correctAnswers: 31,
      wrongAnswers: 9,
      unansweredCount: 0,
      timeUsedSeconds: 2100,
      blocks: [],
    });

    renderTryoutResult();

    expect(await screen.findByText("Review jawaban yang masih salah lebih dulu.")).toBeInTheDocument();
  });

  test("uses zero-wrong insight copy when every block has no wrong answers", async () => {
    mockGetAttemptResultPageData.mockResolvedValueOnce({
      attemptId: "attempt-1",
      score: 100,
      correctAnswers: 40,
      wrongAnswers: 0,
      unansweredCount: 0,
      timeUsedSeconds: 1800,
      blocks: [
        {
          blockLabel: "Clinical Science",
          correct: 20,
          wrong: 0,
        },
        {
          blockLabel: "Pharmaceutical Science",
          correct: 20,
          wrong: 0,
        },
      ],
    });

    renderTryoutResult();

    expect(await screen.findByText("Semua jawaban sudah tepat. Lanjut review untuk mengunci strategi ini.")).toBeInTheDocument();
    expect(screen.queryByText("Review jawaban yang masih salah lebih dulu.")).not.toBeInTheDocument();
  });

  test("uses the resolved latest attempt when no attempt query param is provided", async () => {
    mockFindLatestSubmittedAttemptId.mockResolvedValueOnce("attempt-latest");
    mockGetAttemptResultPageData.mockResolvedValueOnce({
      attemptId: "attempt-latest",
      score: 82,
      correctAnswers: 33,
      wrongAnswers: 7,
      unansweredCount: 0,
      timeUsedSeconds: 1980,
      blocks: defaultResultBlocks,
    });

    renderTryoutResult("/app/tryout/result");

    expect(await screen.findByText(/^82$/)).toBeInTheDocument();
    const reviewCta = screen.getByRole("link", { name: /review jawaban/i });
    expect(reviewCta).toHaveAttribute("href", "/app/review/attempt-latest");
    expect(reviewCta).toHaveAttribute("data-variant", "primary");
    expect(mockFindLatestSubmittedAttemptId).toHaveBeenCalledWith({ userId: "user-1" });
    expect(mockGetAttemptResultPageData).toHaveBeenCalledWith({ attemptId: "attempt-latest" });
  });

  test("shows concise loading copy while result data is loading", async () => {
    mockGetAttemptResultPageData.mockImplementationOnce(() => new Promise(() => {}));

    renderTryoutResult();

    expect(await screen.findByText(/menyiapkan hasil.../i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.getByText(/mohon tunggu sebentar/i)).toBeInTheDocument();
  });

  test("keeps loading, error, and empty states stable", async () => {
    mockGetAttemptResultPageData.mockImplementationOnce(() => new Promise(() => {}));

    renderTryoutResult();

    expect(await screen.findByText(/menyiapkan hasil.../i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.getByText(/mohon tunggu sebentar/i)).toBeInTheDocument();

    cleanup();

    mockGetAttemptResultPageData.mockRejectedValueOnce(new Error("failed"));
    renderTryoutResult();

    expect(await screen.findByText(/gagal memuat hasil/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.getByText(/coba muat ulang halaman/i)).toBeInTheDocument();

    cleanup();

    mockFindLatestSubmittedAttemptId.mockResolvedValue(null);
    renderTryoutResult("/app/tryout/result");

    expect(await screen.findByText(/belum ada hasil/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.getByText(/belum ada hasil try out untuk ditampilkan/i)).toBeInTheDocument();
  });
});
