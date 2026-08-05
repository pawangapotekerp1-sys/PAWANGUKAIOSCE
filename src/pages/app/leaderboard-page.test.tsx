import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { MemoryRouter } from "react-router";
import LeaderboardPage from "./leaderboard-page";

const mockUseSession = vi.fn();
const mockGetLeaderboard = vi.fn();
const mockGetCurrentProfile = vi.fn();

vi.mock("../../lib/auth/use-session", () => ({
  useSession: () => mockUseSession(),
}));

vi.mock("../../lib/api/leaderboard-api", () => ({
  getLeaderboard: (...args: unknown[]) => mockGetLeaderboard(...args),
}));

vi.mock("../../lib/api/profile-api", () => ({
  getCurrentProfile: (...args: unknown[]) => mockGetCurrentProfile(...args),
}));

function makeRows(count: number) {
  return Array.from({
    length: count,
  }, (_, index) => ({
    rank: index + 1,
    userId: `user-${index + 1}`,
    alias: `Peserta-${index + 1}`,
    score: 100 - index,
    timeUsedSeconds: 1000 + index,
    attemptId: `attempt-${index + 1}`,
    submittedAt: "2026-05-07T00:00:00.000Z",
    category: "overall" as const,
  }));
}

function renderLeaderboardPage(initialEntry = "/app/leaderboard") {
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
        <LeaderboardPage />
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
  mockGetLeaderboard.mockResolvedValue(makeRows(3));
  mockGetCurrentProfile.mockResolvedValue({
    id: "user-1",
    email: "student@example.com",
    fullName: "Peserta Aktif",
    avatarUrl: null,
    role: "pro",
  });
});

describe("LeaderboardPage", () => {
  test("switches categories and refetches leaderboard rows", async () => {
    renderLeaderboardPage();

    expect(
      (await screen.findAllByText(/^leaderboard$/i))[0],
    ).toBeInTheDocument();
    expect(screen.getByText(/pantau 10 besar untuk melihat posisimu di setiap kategori/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /overall/i })).toHaveAttribute("data-variant", "primary");
    expect(screen.getByRole("button", { name: /clinical science/i })).toHaveAttribute("data-variant", "outline");

    fireEvent.click(screen.getByRole("button", { name: /clinical science/i }));

    await waitFor(() => {
      expect(mockGetLeaderboard).toHaveBeenLastCalledWith({
        category: "clinical_science",
      });
    });
    expect(screen.getByRole("button", { name: /clinical science/i })).toHaveAttribute("data-variant", "primary");
  });

  test("renders shared ranks for exact ties", async () => {
    mockGetLeaderboard.mockResolvedValueOnce([
      {
        rank: 1,
        userId: "user-1",
        alias: "FarmasiNad",
        score: 90,
        timeUsedSeconds: 1200,
        attemptId: "attempt-1",
        submittedAt: "2026-05-07T00:00:00.000Z",
        category: "overall",
      },
      {
        rank: 1,
        userId: "user-2",
        alias: "Apoteker-AB12",
        score: 90,
        timeUsedSeconds: 1200,
        attemptId: "attempt-2",
        submittedAt: "2026-05-07T00:00:00.000Z",
        category: "overall",
      },
    ]);
    renderLeaderboardPage();

    expect(await screen.findAllByText(/^1$/)).toHaveLength(2);
  });

  test("shows at most 10 rows from the query result", async () => {
    mockGetLeaderboard.mockResolvedValueOnce(makeRows(10));
    renderLeaderboardPage();

    expect(await screen.findAllByTestId(/leaderboard-row-/)).toHaveLength(10);
  });

  test("shows shorter loading, error, and empty states", async () => {
    mockGetLeaderboard.mockImplementationOnce(() => new Promise(() => {}));
    renderLeaderboardPage();

    
    expect(screen.getByText(/peringkat sedang disiapkan/i)).toBeInTheDocument();

    cleanup();

    mockGetLeaderboard.mockRejectedValueOnce(new Error("failed"));
    renderLeaderboardPage();

    expect(await screen.findByText(/leaderboard belum bisa dimuat/i)).toBeInTheDocument();
    expect(screen.getByText(/coba ganti kategori atau muat ulang/i)).toBeInTheDocument();

    cleanup();

    mockGetLeaderboard.mockResolvedValueOnce([]);
    renderLeaderboardPage();

    expect(await screen.findByText(/leaderboard masih kosong/i)).toBeInTheDocument();
    expect(screen.getByText(/belum ada peringkat di kategori ini/i)).toBeInTheDocument();
  });
});
