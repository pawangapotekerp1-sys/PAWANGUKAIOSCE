import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { PersonalWeaknessDiagnosisViewModel } from "../../lib/mappers/analytics-mappers";
import AnalyticsPage from "./analytics-page";

const mockUseSession = vi.fn();
const mockGetPersonalWeaknessDiagnosis = vi.fn();

vi.mock("../../lib/auth/use-session", () => ({
  useSession: () => mockUseSession(),
}));

vi.mock("../../lib/api/analytics-api", () => ({
  getPersonalWeaknessDiagnosis: (...args: unknown[]) => mockGetPersonalWeaknessDiagnosis(...args),
  getStudentAnalytics: vi.fn(),
  generateStudentAiRangeInsight: vi.fn().mockResolvedValue({
    source: "ai",
    generatedAt: "2026-08-14T00:00:00.000Z",
    summary: "Mock AI insight",
  }),
}));

vi.mock("../../lib/api/global-ai-credential-api", () => ({
  getGlobalAiCredentialStatus: vi.fn().mockResolvedValue({
    hasCredential: true,
    model: "gemini-3.6-flash",
  }),
}));

vi.mock("../../lib/diagnosis-date-range", () => ({
  createDefaultDiagnosisRange: () => ({
    preset: "7d",
    dateFrom: "2026-05-03",
    dateTo: "2026-05-09",
  }),
  createPresetDiagnosisRange: (preset: "7d" | "14d" | "30d") => {
    if (preset === "14d") {
      return {
        preset,
        dateFrom: "2026-04-26",
        dateTo: "2026-05-09",
      };
    }

    if (preset === "30d") {
      return {
        preset,
        dateFrom: "2026-04-10",
        dateTo: "2026-05-09",
      };
    }

    return {
      preset,
      dateFrom: "2026-05-03",
      dateTo: "2026-05-09",
    };
  },
  toAppliedDiagnosisRange: (input: { preset: string; dateFrom: string; dateTo: string }) => {
    if (!input.dateFrom || !input.dateTo || input.dateFrom > input.dateTo) {
      return null;
    }

    return input;
  },
  resolveUserTimezone: () => "Asia/Jakarta",
}));

function renderAnalytics(initialEntry = "/app/analytics") {
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
        <AnalyticsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function createDiagnosisFixture(): PersonalWeaknessDiagnosisViewModel {
  return {
    summary: {
      rangeStart: "2026-05-03",
      rangeEnd: "2026-05-09",
      timezone: "Asia/Jakarta",
      eligibleAttemptCount: 3,
      minimumAttemptsMet: true,
      diagnosisMode: "full",
      overallAccuracy: 61,
      overallAverageTimePerQuestion: 88,
      overallQuestionCount: 150,
    },
    globalBehaviorPatterns: [
      {
        code: "frequent_ragu",
        label: "Sering ragu-ragu",
        severity: "high",
        evidence: "Banyak soal ditandai ragu selama rentang ini.",
        description: "Keraguan masih sering mengganggu keputusan akhir.",
      },
      {
        code: "slow_pacing",
        label: "Terlalu lama",
        severity: "medium",
        evidence: "Rata-rata waktu lebih lambat dari baseline pribadi.",
        description: "Pacing masih tertahan di sejumlah subtopik.",
      },
    ],
    subtopicRankings: [
      {
        topicId: "topic-1",
        topicName: "Kardiologi",
        blockId: "block-1",
        blockName: "Clinical Science",
        rank: 1,
        weaknessScore: 84,
        confidence: "high",
        questionCount: 18,
        attemptCoverageCount: 3,
        accuracy: 42,
        averageTimePerQuestion: 92,
        behaviorFlags: ["frequent_ragu", "slow_pacing"],
        summary: "Akurasi paling rendah dan sering disertai pola terlalu lama.",
      },
    ],
    basicSummary: null,
    narrative: {
      headline: "Kelemahan paling konsisten muncul di Kardiologi.",
      body: "Rentang ini menunjukkan pola yang stabil pada subtopik yang sama.",
      nextReadiness: "Diagnosis penuh sudah aktif.",
    },
  };
}

function createBasicDiagnosisFixture(): PersonalWeaknessDiagnosisViewModel {
  return {
    summary: {
      rangeStart: "2026-05-03",
      rangeEnd: "2026-05-09",
      timezone: "Asia/Jakarta",
      eligibleAttemptCount: 2,
      minimumAttemptsMet: false,
      diagnosisMode: "basic",
      overallAccuracy: 58,
      overallAverageTimePerQuestion: 91,
      overallQuestionCount: 100,
    },
    globalBehaviorPatterns: [
      {
        code: "slow_pacing",
        label: "Terlalu lama",
        severity: "medium",
        evidence: "Rata-rata waktu masih di atas baseline pribadi.",
        description: "Pengerjaan masih melambat di banyak soal.",
      },
    ],
    subtopicRankings: [],
    basicSummary: {
      message: "Diagnosis penuh terbuka setelah minimal 3 try out besar yang eligible.",
      eligibleAttemptCount: 2,
      overallAccuracy: 58,
      observedTopics: ["Kardiologi", "Farmakoekonomi"],
      globalBehaviorPatterns: [
        {
          code: "slow_pacing",
          label: "Terlalu lama",
          severity: "medium",
          evidence: "Rata-rata waktu masih di atas baseline pribadi.",
          description: "Pengerjaan masih melambat di banyak soal.",
        },
      ],
    },
    narrative: {
      headline: "Data diagnosis belum penuh.",
      body: "Rentang ini baru memiliki dua try out eligible.",
      nextReadiness: "Tambahkan satu try out besar lagi untuk membuka diagnosis penuh.",
    },
  };
}

function createEmptyDiagnosisFixture(): PersonalWeaknessDiagnosisViewModel {
  return {
    summary: {
      rangeStart: "2026-05-03",
      rangeEnd: "2026-05-09",
      timezone: "Asia/Jakarta",
      eligibleAttemptCount: 0,
      minimumAttemptsMet: false,
      diagnosisMode: "empty",
      overallAccuracy: 0,
      overallAverageTimePerQuestion: 0,
      overallQuestionCount: 0,
    },
    globalBehaviorPatterns: [],
    subtopicRankings: [],
    basicSummary: null,
    narrative: {
      headline: "Belum ada diagnosis untuk rentang ini.",
      body: "Belum ada try out besar yang eligible pada rentang ini.",
      nextReadiness: "Mulai try out besar baru untuk membuka diagnosis.",
    },
  };
}

describe("Analytics page", () => {
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
    mockGetPersonalWeaknessDiagnosis.mockResolvedValue(createDiagnosisFixture());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  test("loads the default diagnosis range and renders the diagnosis heading", async () => {
    renderAnalytics();

    await waitFor(() =>
      expect(mockGetPersonalWeaknessDiagnosis).toHaveBeenCalledWith({
        dateFrom: "2026-05-03",
        dateTo: "2026-05-09",
        timezone: "Asia/Jakarta",
      }),
    );

    expect(
      await screen.findByText(/area yang perlu diperbaiki/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/lihat topik dan materi yang paling sering menahan/i)).toBeInTheDocument();
    expect(screen.queryByText(/analisis pola belajar/i)).not.toBeInTheDocument();
  });

  test("shows preset controls and re-runs the diagnosis query when the user picks 14 days", async () => {
    renderAnalytics();

    expect(screen.getByRole("button", { name: /7 hari/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /14 hari/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /30 hari/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /14 hari/i }));

    await waitFor(() =>
      expect(mockGetPersonalWeaknessDiagnosis).toHaveBeenLastCalledWith({
        dateFrom: "2026-04-26",
        dateTo: "2026-05-09",
        timezone: "Asia/Jakarta",
      }),
    );
  });

  test("keeps custom dates as draft values until the user applies the range", async () => {
    renderAnalytics();

    fireEvent.change(document.querySelectorAll('input[type="date"]')[0], { target: { value: "2026-05-01" } });
    fireEvent.change(document.querySelectorAll('input[type="date"]')[1], { target: { value: "2026-05-07" } });

    await waitFor(() =>
      expect(mockGetPersonalWeaknessDiagnosis).toHaveBeenCalledTimes(1),
    );

    fireEvent.click(screen.getByRole("button", { name: /^terapkan$/i }));

    await waitFor(() =>
      expect(mockGetPersonalWeaknessDiagnosis).toHaveBeenLastCalledWith({
        dateFrom: "2026-05-01",
        dateTo: "2026-05-07",
        timezone: "Asia/Jakarta",
      }),
    );
  });

  test("disables the custom apply button when the draft range is invalid", async () => {
    renderAnalytics();

    const applyButton = screen.getByRole("button", { name: /^terapkan$/i });

    expect(applyButton).toBeEnabled();

    fireEvent.change(document.querySelectorAll('input[type="date"]')[0], { target: { value: "2026-05-10" } });
    fireEvent.change(document.querySelectorAll('input[type="date"]')[1], { target: { value: "2026-05-07" } });

    await waitFor(() => expect(applyButton).toBeDisabled());
  });

  test("shows the empty diagnosis state when the selected range has no eligible attempts", async () => {
    mockGetPersonalWeaknessDiagnosis.mockResolvedValueOnce(createEmptyDiagnosisFixture());

    renderAnalytics();

    expect(
      await screen.findByText(/belum ada data untuk rentang ini/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/belum ada try out besar di rentang ini/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /mulai try out besar/i }),
    ).toHaveAttribute("href", "/app/tryout-selection");
    expect(screen.getByRole("link", { name: /mulai try out besar/i })).toHaveAttribute("data-variant", "primary");
  });

  test("shows the basic diagnosis summary without rendering the full ranking section", async () => {
    mockGetPersonalWeaknessDiagnosis.mockResolvedValueOnce(createBasicDiagnosisFixture());

    renderAnalytics();

    expect(
      await screen.findByText(/diagnosis penuh terbuka setelah minimal 3 try out/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/ringkasan awal/i)).toBeInTheDocument();
    expect(screen.getByText(/analisis lengkap belum tersedia/i)).toBeInTheDocument();
    expect(screen.getByText(/terlalu lama/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/5 subtopik/i),
    ).not.toBeInTheDocument();
  });

  test("shows a diagnosis-specific error state when the diagnosis query fails", async () => {
    mockGetPersonalWeaknessDiagnosis.mockRejectedValueOnce(new Error("network down"));

    renderAnalytics();

    expect(
      await screen.findByText(/analisis belum bisa dimuat/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/coba buka review dulu/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /buka review/i })).toHaveAttribute("data-variant", "primary");
  });

  test("shows concise loading copy from preview state", async () => {
    renderAnalytics("/app/analytics?analyticsView=loading");

    expect(
      await screen.findByText(/analisis sedang dimuat/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/data analisis sedang disiapkan/i)).toBeInTheDocument();
  });

  test("shows the weakest subtopic hero and the global behavior panel in full mode", async () => {
    renderAnalytics();

    expect(await screen.findByText(/topik paling perlu perhatian/i)).toBeInTheDocument();
    expect(screen.getAllByText(/kardiologi/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/akurasi 42%/i)).not.toHaveLength(0);
    expect(screen.getAllByText(/keyakinan tinggi/i)).not.toHaveLength(0);
    expect(screen.getAllByText(/dibahas di 3 sesi, total 18 soal/i)).not.toHaveLength(0);
    expect(screen.getAllByText(/sering ragu-ragu/i)).not.toHaveLength(0);
    expect(screen.getByText(/^tinggi$/i)).toBeInTheDocument();
    expect(screen.getByText(/pola yang paling sering muncul/i)).toBeInTheDocument();
    expect(
      screen.getByText(/5 topik yang paling perlu perhatian/i),
    ).toBeInTheDocument();
  });

  test("does not render any legacy analytics sections", async () => {
    renderAnalytics();

    await screen.findByText(/area yang perlu diperbaiki/i);

    expect(screen.queryByText(/analisis pola belajar/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/akurasi per blok/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/peringkat topik yang perlu diulang/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/cara pakai hasil ini/i),
    ).not.toBeInTheDocument();
  });
});
