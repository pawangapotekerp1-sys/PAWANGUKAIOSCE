import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import DashboardPage from "./dashboard-page";

const mockUseSession = vi.fn();
const mockGetDashboardSummary = vi.fn();

vi.mock("../lib/auth/use-session", () => ({
  useSession: () => mockUseSession(),
}));

vi.mock("../lib/api/analytics-api", () => ({
  getDashboardSummary: (...args: unknown[]) => mockGetDashboardSummary(...args),
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
        detail: "12 sesi submitted sudah masuk ke riwayat.",
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
});

describe("Dashboard page", () => {
  test("renders a hybrid dashboard with quick actions and performance analysis", async () => {
    renderDashboard();

    expect(
      await screen.findByRole(
        "heading",
        {
          name: /ringkasan hari ini/i,
        },
        {
          timeout: 10000,
        },
      ),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.queryByText(/ringkasan dashboard sedang disiapkan/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
      ).not.toBeInTheDocument();
    });
    expect(screen.getAllByText("Pawang Apoteker")[0]).toBeInTheDocument();
    expect(
      screen.getAllByRole("heading", {
        name: /try out besar/i,
      }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(/blok terlemah/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/dashboard belajar yang langsung siap dipakai/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/dorong clinical science di atas 70/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sprint hari ini/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(/target hari ini/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/tren 7 sesi terakhir/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /mulai sesi baru/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /buka review prioritas/i })).toBeInTheDocument();
    expect(
      screen.queryByText(/lulus profesi apoteker dengan analisis pintar/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).not.toBeInTheDocument();
  }, 15000);

  test("preserves the current dashboard render contract for the preview layout", async () => {
    const { container } = renderDashboard();
    await screen.findByRole(
      "heading",
      {
        name: /ringkasan hari ini/i,
      },
      {
        timeout: 10000,
      },
    );
    await waitFor(() => {
      expect(
        screen.queryByText(/ringkasan dashboard sedang disiapkan/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
      ).not.toBeInTheDocument();
    });
    const navLinks = Array.from(container.querySelectorAll("nav a"));
    const navTargets = navLinks.map((link) => link.getAttribute("href"));

    expect(container.querySelector("main")).toHaveClass("min-h-[100dvh]");
    expect(navLinks).toHaveLength(8);
    expect(navTargets).toEqual([
      "/app",
      "/app/tryout",
      "/app/scheduled-tryout",
      "/app/analytics",
      "/app/review",
      "/app/leaderboard",
      "/profile",
      "/app/flash-cards",
    ]);
    expect(container.querySelector("#ringkasan")).toBeInTheDocument();
    expect(container.querySelector("#tryout")).toBeInTheDocument();
    expect(container.querySelector("#analisis")).toBeInTheDocument();
    expect(container.querySelector("#review")).toBeInTheDocument();
    expect(screen.queryByText(/sprint hari ini/i)).not.toBeInTheDocument();
    expect(
      screen.getAllByText(/skor rata-rata|try out selesai|akurasi clinical/i),
    ).toHaveLength(3);
    expect(screen.getByText(/target blok lemah pekan ini: 70%/i)).toBeInTheDocument();
    expect(screen.getByText(/5 dari 7 sesi berada di atas 70/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /mulai sesi baru/i })).toHaveAttribute(
      "href",
      "/app/tryout",
    );
    expect(screen.getByRole("link", { name: "Mulai sesi" })).toHaveAttribute(
      "href",
      "/app/tryout",
    );
    expect(screen.getByRole("link", { name: /pilih blok/i })).toHaveAttribute(
      "href",
      "/app/tryout",
    );
    expect(screen.getByRole("link", { name: /buka review prioritas/i })).toHaveAttribute(
      "href",
      "/app/review/attempt-1",
    );
  }, 15000);

  test("shows the summary error fallback when requested through preview query params", () => {
    renderDashboard("/app?summaryView=error");

    expect(
      screen.getByText(/ringkasan belajar preview belum berhasil dimuat|ringkasan belajar belum berhasil dimuat|ringkasan belajar belum bisa dimuat/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /buka review terakhir/i })).toHaveAttribute(
      "href",
      "/app/review",
    );
  });
});
