import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import { BookOpenCheck, CircleGauge, FileCheck2 } from "lucide-react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import ScheduledTryoutResultPage from "./scheduled-tryout-result-page";

const mockGetScheduledAttemptResultPageData = vi.fn();
const mockUseStudentShell = vi.fn();

vi.mock("../../lib/api/scheduled-tryout-api", () => ({
  getScheduledAttemptResultPageData: (...args: unknown[]) => mockGetScheduledAttemptResultPageData(...args),
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

function renderScheduledResult(initialEntry = "/app/scheduled-tryout/result?attempt=scheduled-attempt-1") {
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
        <ScheduledTryoutResultPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function expectNodeToAppearBefore(first: HTMLElement, second: HTMLElement) {
  expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
}

async function getResultPageScope() {
  const heading = await screen.findByText(/^hasil sesi terjadwal$/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' });
  const section = heading.closest("section");

  expect(section).not.toBeNull();

  return within(section as HTMLElement);
}

function getActionGroupScope(action: HTMLElement) {
  const group = action.parentElement;

  expect(group).not.toBeNull();

  return within(group as HTMLElement);
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
  mockUseStudentShell.mockReturnValue({
    navItems: [
      { href: "/app", label: "Ringkasan", icon: CircleGauge, active: false },
      { href: "/app/tryout-selection", label: "Try Out", icon: FileCheck2, active: true },
      { href: "/app/review", label: "Review", icon: BookOpenCheck, active: false },
    ],
    tierLabel: "Pro",
    role: "pro",
  });
  mockGetScheduledAttemptResultPageData.mockResolvedValue({
    attemptId: "scheduled-attempt-1",
    eventId: "event-1",
    eventCycle: 2,
    score: 82,
    correctAnswers: 33,
    wrongAnswers: 7,
    unansweredCount: 0,
    timeUsedSeconds: 2280,
    blocks: [
      {
        blockLabel: "Clinical Science",
        correct: 19,
        wrong: 5,
      },
      {
        blockLabel: "Pharmaceutical Science",
        correct: 14,
        wrong: 2,
      },
    ],
  });
});

describe("Scheduled tryout result page", () => {
  test("renders a hero-first result summary with review jawaban as the single primary action", async () => {
    renderScheduledResult();

    const resultSection = await getResultPageScope();
    const scoreAnchor = await resultSection.findByText(/^82$/);

    expect(resultSection.getByText("Hasil tryout sudah siap ditinjau")).toBeInTheDocument();
    expect(
      resultSection.getByText(/Tinjau jawaban untuk melihat bagian yang perlu diperbaiki/i),
    ).toBeInTheDocument();
    expect(resultSection.getByText(/^33$/)).toBeInTheDocument();
    expect(resultSection.getByText(/00:38:00/i)).toBeInTheDocument();
    expect(resultSection.getByText(/19 benar, 5 salah/i)).toBeInTheDocument();
    expect(resultSection.getByText(/14 benar, 2 salah/i)).toBeInTheDocument();

    const reviewLink = resultSection.getByRole("link", { name: /^review jawaban$/i });
    const leaderboardLink = resultSection.getByRole("link", { name: /lihat leaderboard/i });
    const actionGroup = getActionGroupScope(reviewLink);
    const actionLinks = actionGroup.getAllByRole("link");

    expect(reviewLink).toHaveAttribute(
      "href",
      "/app/review/scheduled-attempt-1?source=scheduled",
    );
    expect(leaderboardLink).toHaveAttribute(
      "href",
      "/app/scheduled-tryout/leaderboard?event=event-1&cycle=2",
    );
    expect(actionLinks).toEqual([reviewLink]);

    expectNodeToAppearBefore(scoreAnchor, resultSection.getByText(/^jawaban benar$/i));
    expectNodeToAppearBefore(scoreAnchor, resultSection.getByText(/waktu terpakai/i));
    expectNodeToAppearBefore(scoreAnchor, resultSection.getByText(/distribusi hasil/i));
    expectNodeToAppearBefore(reviewLink, resultSection.getByText(/waktu terpakai/i));
    expectNodeToAppearBefore(reviewLink, resultSection.getByText(/^jawaban benar$/i));
    expectNodeToAppearBefore(reviewLink, resultSection.getByText(/distribusi hasil/i));
    expectNodeToAppearBefore(reviewLink, leaderboardLink);
    expectNodeToAppearBefore(resultSection.getByText(/distribusi hasil/i), leaderboardLink);
    expect(resultSection.queryByText(/langkah berikutnya/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).not.toBeInTheDocument();
  });

  test("omits leaderboard when eventId is absent but keeps the hero-first review CTA", async () => {
    mockGetScheduledAttemptResultPageData.mockResolvedValueOnce({
      attemptId: "scheduled-attempt-1",
      eventId: null,
      eventCycle: null,
      score: 82,
      correctAnswers: 33,
      wrongAnswers: 7,
      unansweredCount: 0,
      timeUsedSeconds: 2280,
      blocks: [
        {
          blockLabel: "Clinical Science",
          correct: 19,
          wrong: 5,
        },
      ],
    });

    renderScheduledResult();

    const resultSection = await getResultPageScope();

    expect(await resultSection.findByText("Hasil tryout sudah siap ditinjau")).toBeInTheDocument();

    const reviewLink = resultSection.getByRole("link", { name: /^review jawaban$/i });
    const actionGroup = getActionGroupScope(reviewLink);
    const actionLinks = actionGroup.getAllByRole("link");

    expect(reviewLink).toHaveAttribute(
      "href",
      "/app/review/scheduled-attempt-1?source=scheduled",
    );
    expect(actionLinks).toEqual([reviewLink]);
    expect(resultSection.queryByRole("link", { name: /lihat leaderboard/i })).not.toBeInTheDocument();
  });

  test("hides review and leaderboard actions when the attempt query param is missing", async () => {
    renderScheduledResult("/app/scheduled-tryout/result");

    expect(screen.getByText(/belum ada hasil sesi terjadwal/i)).toBeInTheDocument();
    expect(screen.getByText(/pilih hasil dari riwayat untuk melihat detail/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^review jawaban$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /lihat leaderboard/i })).not.toBeInTheDocument();
  });

  test("hides review and leaderboard actions while the result is loading", async () => {
    mockGetScheduledAttemptResultPageData.mockImplementationOnce(() => new Promise(() => {}));
    renderScheduledResult();

    expect(screen.getByText(/hasil sesi sedang dimuat/i)).toBeInTheDocument();
    expect(screen.getByText(/hasil sesi sedang disiapkan/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^review jawaban$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /lihat leaderboard/i })).not.toBeInTheDocument();
  });

  test("hides review and leaderboard actions when the result request fails", async () => {
    mockGetScheduledAttemptResultPageData.mockRejectedValueOnce(new Error("failed"));
    renderScheduledResult();

    expect(await screen.findByText(/hasil sesi belum bisa dimuat/i)).toBeInTheDocument();
    expect(screen.getByText(/coba buka lagi event ini atau cek riwayat terbaru/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^review jawaban$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /lihat leaderboard/i })).not.toBeInTheDocument();
  });

  test("hides review and leaderboard actions when the attempt exists but no result data is returned", async () => {
    mockGetScheduledAttemptResultPageData.mockResolvedValueOnce(null);
    renderScheduledResult();

    expect(await screen.findByText(/belum ada hasil sesi terjadwal/i)).toBeInTheDocument();
    expect(screen.getByText(/belum ada hasil untuk sesi ini/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^review jawaban$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /lihat leaderboard/i })).not.toBeInTheDocument();
  });
});
