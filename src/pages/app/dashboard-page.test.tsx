import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import DashboardPage from "./dashboard-page";

const mockUseSession = vi.fn();
const mockGetDashboardSummary = vi.fn();
const mockGetCurrentProfile = vi.fn();

vi.mock("../../lib/auth/use-session", () => ({
  useSession: () => mockUseSession(),
}));

vi.mock("../../lib/api/analytics-api", () => ({
  getDashboardSummary: (...args: unknown[]) => mockGetDashboardSummary(...args),
}));

vi.mock("../../lib/api/profile-api", () => ({
  getCurrentProfile: (...args: unknown[]) => mockGetCurrentProfile(...args),
}));

function renderDashboard(initialEntry = "/app") {
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
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function createDeferredPromise<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return {
    promise,
    resolve,
  };
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
  mockGetDashboardSummary.mockResolvedValue({
    progressCards: [
      {
        label: "Skor rata-rata",
        value: "78",
        detail: "Clinical Science masih paling menahan skor keseluruhan.",
        tone: "teal",
      },
      {
        label: "Try out selesai",
        value: "12",
        detail: "12 sesi sudah masuk ke riwayat.",
        tone: "gold",
      },
      {
        label: "Akurasi Clinical",
        value: "64%",
        detail: "Pantau Clinical sebagai blok pembuka review saat akurasinya masih tertahan.",
        tone: "green",
      },
    ],
    blockPerformance: [
      { name: "Clinical Science", score: 64, status: "Blok terlemah" },
      { name: "Pharmaceutical Science", score: 81, status: "Paling stabil" },
      { name: "Social, Behavioral & Administrative", score: 76, status: "Naik perlahan" },
    ],
    recentAttempts: [
      {
        title: "Try Out Besar",
        meta: "01 Mei, 10.00",
        score: "74",
        note: "Blok yang paling menahan sesi ini: Clinical Science.",
      },
      {
        title: "Clinical Science",
        meta: "29 Apr, 10.00",
        score: "68",
        note: "Blok yang paling menahan sesi ini: Clinical Science.",
      },
    ],
    studyQueue: [
      {
        topic: "Farmakoterapi kardiovaskular",
        focus: "Clinical Science masih paling layak diulang dulu karena akurasinya baru 52%.",
      },
      {
        topic: "Teknik aseptik dan sterilitas",
        focus: "Pharmaceutical Science masih paling layak diulang dulu karena akurasinya baru 61%.",
      },
    ],
    weeklyTrend: [62, 68, 66, 74, 71, 78, 82],
    latestAttemptId: "attempt-1",
    primaryInsightTitle: "Clinical Science masih jadi rem utama.",
    primaryInsightBody: "Mulai dari Farmakoterapi kardiovaskular, lalu tutup sesi dengan review salah saja pada Clinical Science.",
    weakestBlockTarget: "Target blok lemah pekan ini: 70%",
    consistencyLabel: "5 dari 7 sesi berada di atas 70",
  });
  mockGetCurrentProfile.mockResolvedValue({
    id: "user-1",
    email: "student@example.com",
    fullName: "Peserta Aktif",
    avatarUrl: null,
    role: "pro",
  });
});

describe("App dashboard page", () => {
  test("renders the live student dashboard shell with quick actions and study priorities", async () => {
    renderDashboard();

    expect(
      await screen.findByText(/kunci ulang blok lemah/i, { selector: 'h1' }),
    ).toBeInTheDocument();
    
    await waitFor(() => {
      expect(
        screen.queryByText(/menyiapkan ringkasan belajarmu/i),
      ).not.toBeInTheDocument();
    });
    
    expect(screen.getAllByText(/pawang apoteker/i)[0]).toBeInTheDocument();
    expect(
      screen.getByText(/materi terlemah/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/riwayat sesi terakhir/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
    
    expect(screen.getByRole("link", { name: /riwayat terakhir/i })).toHaveAttribute("data-variant", "outline");
    expect(screen.getByRole("link", { name: /mulai belajar/i })).toHaveAttribute("data-variant", "primary");
  }, 15000);

  test("uses route-aware navigation targets for the routed product shell", async () => {
    const { container } = renderDashboard();
    
    await screen.findByText(/kunci ulang blok lemah/i, { selector: 'h1' }, { timeout: 10000 });
    
    await waitFor(() => {
      expect(
        screen.queryByText(/menyiapkan ringkasan belajarmu/i),
      ).not.toBeInTheDocument();
    });
    
    const navLinks = Array.from(container.querySelectorAll("nav a"));
    const navTargets = navLinks.map((link) => link.getAttribute("href"));

    expect(container.querySelector("main")?.parentElement).toHaveClass("min-h-[100dvh]");
    expect(navLinks).toHaveLength(6);
    expect(navTargets).toEqual([
      "/app/tryout-selection",
      "/app/analytics",
      "/app/review",
      "/app/leaderboard",
      "/profile",
      "/app/flash-cards",
    ]);
  }, 15000);

  test("shows the dashboard empty state when no completed attempts exist", async () => {
    mockGetDashboardSummary.mockResolvedValueOnce(null);
    renderDashboard();

    expect(
      await screen.findByText(/belum ada aktivitas/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/selesaikan sesi pertamamu untuk melihat analisis performa di sini/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /mulai sesi pertama/i })).toHaveAttribute(
      "href",
      "/app/tryout-selection",
    );
  });

  test("renders the dashboard summary loading state from preview query params", () => {
    renderDashboard("/app?summaryView=loading");

    expect(
      screen.getByText(/menyiapkan ringkasan belajarmu/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/mohon tunggu sebentar/i)).toBeInTheDocument();
  });

  test("shows shorter dashboard error copy from preview query params", () => {
    renderDashboard("/app?summaryView=error");

    expect(
      screen.getByText(/gagal memuat data/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/coba muat ulang halaman atau lihat riwayat terakhir/i)).toBeInTheDocument();
  });

  test("shows a question bank entrypoint for mentor users", async () => {
    mockGetCurrentProfile.mockResolvedValueOnce({
      id: "user-1",
      email: "mentor@example.com",
      fullName: "Mentor Klinis",
      avatarUrl: null,
      role: "mentor",
    });

    renderDashboard();

    await screen.findByText(/kunci ulang blok lemah/i, { selector: 'h1' });
    expect(await screen.findByRole("link", { name: /bank soal/i })).toHaveAttribute(
      "href",
      "/app/questions",
    );
  });

  test("does not show a question bank entrypoint for pro users", async () => {
    renderDashboard();

    await screen.findByText(/kunci ulang blok lemah/i, { selector: 'h1' });
    expect(screen.queryByRole("link", { name: /bank soal/i })).not.toBeInTheDocument();
  });

  test("keeps the mentor shell stable during rapid focus refreshes", async () => {
    const mentorProfile = {
      id: "user-1",
      email: "mentor@example.com",
      fullName: "Mentor Klinis",
      avatarUrl: null,
      role: "mentor" as const,
    };
    const deferredProfile = createDeferredPromise<typeof mentorProfile>();

    mockGetCurrentProfile.mockResolvedValue(mentorProfile);
    mockGetCurrentProfile
      .mockResolvedValueOnce(mentorProfile)
      .mockImplementationOnce(() => deferredProfile.promise);

    renderDashboard();

    fireEvent(document, new Event("visibilitychange"));
    fireEvent(window, new Event("focus"));

    await waitFor(() => {
      expect(mockGetCurrentProfile).toHaveBeenCalledTimes(2);
    });

    deferredProfile.resolve(mentorProfile);

    await waitFor(() => {
      expect(mockGetCurrentProfile).toHaveBeenCalledTimes(2);
    });
  });
});


