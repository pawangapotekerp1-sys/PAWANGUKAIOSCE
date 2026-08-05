import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { BookOpenCheck, CircleGauge, FileCheck2 } from "lucide-react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import ScheduledTryoutLeaderboardPage from "./scheduled-tryout-leaderboard-page";

const mockGetScheduledEventLeaderboard = vi.fn();
const mockUseStudentShell = vi.fn();

vi.mock("../../lib/api/scheduled-tryout-api", () => ({
  getScheduledEventLeaderboard: (...args: unknown[]) => mockGetScheduledEventLeaderboard(...args),
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

function renderScheduledLeaderboardPage(
  initialEntry = "/app/scheduled-tryout/leaderboard?event=event-1",
) {
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
        <ScheduledTryoutLeaderboardPage />
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
      { href: "/app/tryout-selection", label: "Try Out", icon: FileCheck2, active: true },
      { href: "/app/review", label: "Review", icon: BookOpenCheck, active: false },
    ],
    tierLabel: "Pro",
    role: "pro",
  });
  mockGetScheduledEventLeaderboard.mockResolvedValue({
    state: "live",
    eventId: "event-1",
    eventTitle: "TO Klinik Juni",
    eventCycle: 2,
    rows: [
      {
        rank: 1,
        eventId: "event-1",
        eventCycle: 2,
        userId: "user-1",
        alias: "FarmasiNad",
        bestScore: 92,
        bestScoreAttemptNumber: 2,
        attemptId: "attempt-2",
        submittedAt: "2026-06-16T01:00:00.000Z",
      },
      {
        rank: 1,
        eventId: "event-1",
        eventCycle: 2,
        userId: "user-2",
        alias: "Apoteker-Rani",
        bestScore: 92,
        bestScoreAttemptNumber: 2,
        attemptId: "attempt-9",
        submittedAt: "2026-06-16T01:05:00.000Z",
      },
    ],
  });
});

describe("Scheduled tryout leaderboard page", () => {
  test("renders a live scheduled leaderboard for one event", async () => {
    mockGetScheduledEventLeaderboard.mockResolvedValueOnce({
      state: "live",
      eventId: "event-1",
      eventTitle: "TO Klinik Juni",
      eventCycle: 2,
      rows: [
        {
          rank: 1,
          eventId: "event-1",
          eventCycle: 2,
          userId: "user-1",
          alias: "FarmasiNad",
          bestScore: 92,
          bestScoreAttemptNumber: 2,
          attemptId: "attempt-2",
          submittedAt: "2026-06-16T01:00:00.000Z",
        },
      ],
    });

    renderScheduledLeaderboardPage("/app/scheduled-tryout/leaderboard?event=event-1&cycle=2");

    expect(await screen.findByText(/peringkat event/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.getByText(/lihat skor terbaik dan peserta tercepat/i)).toBeInTheDocument();
    expect(mockGetScheduledEventLeaderboard).toHaveBeenCalledWith({
      eventId: "event-1",
      eventCycle: 2,
    });
  });

  test("renders shared ranks when score and best-score attempt number tie", async () => {
    renderScheduledLeaderboardPage();

    expect(await screen.findAllByText(/^1$/)).not.toHaveLength(0);
  });

  test("shows a live empty-state message when the event is still running without submissions", async () => {
    mockGetScheduledEventLeaderboard.mockResolvedValueOnce({
      state: "live",
      eventId: "event-1",
      eventTitle: "TO Klinik Juni",
      eventCycle: 2,
      rows: [],
    });

    renderScheduledLeaderboardPage();

    expect(
      await screen.findByText(/belum ada hasil untuk event ini/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/event masih berjalan, tetapi hasil belum masuk/i)).toBeInTheDocument();
  });

  test("shows a final empty-state message for historical cycles without leaderboard rows", async () => {
    mockGetScheduledEventLeaderboard.mockResolvedValueOnce({
      state: "final",
      eventId: "event-1",
      eventTitle: "TO Klinik Juni",
      eventCycle: 1,
      rows: [],
    });

    renderScheduledLeaderboardPage("/app/scheduled-tryout/leaderboard?event=event-1&cycle=1");

    expect(
      await screen.findByText(/belum ada hasil final untuk siklus ini/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/siklus ini selesai, tetapi hasil final belum tersedia/i)).toBeInTheDocument();
  });

  test("shows concise loading copy while the leaderboard is loading", async () => {
    mockGetScheduledEventLeaderboard.mockImplementationOnce(() => new Promise(() => {}));

    renderScheduledLeaderboardPage();

    expect(await screen.findByText(/leaderboard sedang dimuat/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.getByText(/peringkat sedang disiapkan/i)).toBeInTheDocument();
  });
});
