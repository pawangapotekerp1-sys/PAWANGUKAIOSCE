import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BookOpenCheck, CircleGauge, FileCheck2 } from "lucide-react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import ScheduledTryoutSessionPage from "./scheduled-tryout-session-page";

const mockCreateScheduledTryoutAttempt = vi.fn();
const mockGetScheduledAttemptSessionPageData = vi.fn();
const mockPauseScheduledTryoutAttempt = vi.fn();
const mockResumeScheduledTryoutAttempt = vi.fn();
const mockSaveScheduledTryoutAnswer = vi.fn();
const mockSubmitScheduledTryoutAttempt = vi.fn();
const mockFindActiveScheduledAttemptForUser = vi.fn();
const mockUseStudentShell = vi.fn();

vi.mock("../../lib/api/scheduled-tryout-api", () => ({
  createScheduledTryoutAttempt: (...args: unknown[]) => mockCreateScheduledTryoutAttempt(...args),
  findActiveScheduledAttemptForUser: (...args: unknown[]) => mockFindActiveScheduledAttemptForUser(...args),
  getScheduledAttemptSessionPageData: (...args: unknown[]) => mockGetScheduledAttemptSessionPageData(...args),
  pauseScheduledTryoutAttempt: (...args: unknown[]) => mockPauseScheduledTryoutAttempt(...args),
  resumeScheduledTryoutAttempt: (...args: unknown[]) => mockResumeScheduledTryoutAttempt(...args),
  saveScheduledTryoutAnswer: (...args: unknown[]) => mockSaveScheduledTryoutAnswer(...args),
  submitScheduledTryoutAttempt: (...args: unknown[]) => mockSubmitScheduledTryoutAttempt(...args),
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

function renderScheduledSession(initialEntry = "/app/scheduled-tryout/session?attempt=scheduled-attempt-1") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const renderResult = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <ScheduledTryoutSessionPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );

  return {
    ...renderResult,
    queryClient,
  };
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
  mockGetScheduledAttemptSessionPageData.mockResolvedValue({
    view: "ready",
    attempt: {
      id: "scheduled-attempt-1",
      status: "in_progress",
      totalQuestions: 2,
      timeRemainingSeconds: 2400,
    },
    questions: [
      {
        id: "scheduled-item-1",
        order: 1,
        blockLabel: "Clinical Science",
        stem: "Pasien masuk dengan hipertensi emergensi. Apa langkah awal?",
        questionImageUrl: "https://example.com/questions/scheduled-1.png",
        options: [
          { key: "A", text: "Pilihan A" },
          { key: "B", text: "Pilihan B" },
        ],
        selectedOptionKey: null,
        isDoubtful: false,
      },
      {
        id: "scheduled-item-2",
        order: 2,
        blockLabel: "Pharmaceutical Science",
        stem: "Parameter sterilitas mana yang diprioritaskan lebih dulu?",
        questionImageUrl: null,
        options: [
          { key: "A", text: "Pilihan A" },
          { key: "B", text: "Pilihan B" },
        ],
        selectedOptionKey: null,
        isDoubtful: false,
      },
    ],
  });
  mockSaveScheduledTryoutAnswer.mockResolvedValue({
    attemptId: "scheduled-attempt-1",
    attemptItemId: "scheduled-item-1",
    selectedOptionKey: "A",
    isDoubtful: false,
    answeredAt: "2026-06-10T10:05:00.000Z",
  });
  mockPauseScheduledTryoutAttempt.mockResolvedValue({
    id: "scheduled-attempt-1",
    status: "paused",
    totalQuestions: 2,
    timeLimitSeconds: 2400,
    elapsedSeconds: 300,
    startedAt: "2026-06-10T10:00:00.000Z",
    submittedAt: null,
    lastResumedAt: null,
    pausedAt: "2026-06-10T10:05:00.000Z",
    eventId: "event-1",
    eventCycle: 2,
    userId: "user-1",
  });
  mockResumeScheduledTryoutAttempt.mockResolvedValue({
    id: "scheduled-attempt-1",
    status: "in_progress",
    totalQuestions: 2,
    timeLimitSeconds: 2400,
    elapsedSeconds: 300,
    startedAt: "2026-06-10T10:00:00.000Z",
    submittedAt: null,
    lastResumedAt: "2026-06-10T10:06:00.000Z",
    pausedAt: null,
    eventId: "event-1",
    eventCycle: 2,
    userId: "user-1",
  });
  mockSubmitScheduledTryoutAttempt.mockResolvedValue({
    attemptId: "scheduled-attempt-1",
    score_percentage: 82,
    correct_count: 33,
    wrong_count: 7,
    unanswered_count: 0,
  });
  mockFindActiveScheduledAttemptForUser.mockResolvedValue(null);
});

describe("Scheduled tryout session page", () => {
  test("can hide and show the question navigation sidebar", async () => {
    renderScheduledSession();

    expect(await screen.findByText(/timer sesi 00:40:00/i)).toBeInTheDocument();
    expect(screen.getByText(/^daftar soal$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sembunyikan daftar soal/i })).toHaveAttribute("data-variant", "outline");

    fireEvent.click(screen.getByRole("button", { name: /sembunyikan daftar soal/i }));

    expect(screen.queryByText(/^daftar soal$/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tampilkan daftar soal/i })).toHaveAttribute("data-variant", "outline");

    fireEvent.click(screen.getByRole("button", { name: /tampilkan daftar soal/i }));

    expect(screen.getByText(/^daftar soal$/i)).toBeInTheDocument();
  });

  test("uses the requested timer and answer-state colors", async () => {
    mockGetScheduledAttemptSessionPageData.mockResolvedValueOnce({
      view: "ready",
      attempt: {
        id: "scheduled-attempt-1",
        status: "in_progress",
        totalQuestions: 3,
        timeRemainingSeconds: 299,
      },
      questions: [
        {
          id: "scheduled-item-1",
          order: 1,
          blockLabel: "Clinical Science",
          stem: "Pasien masuk dengan hipertensi emergensi. Apa langkah awal?",
          questionImageUrl: null,
          options: [
            { key: "A", text: "Pilihan A" },
            { key: "B", text: "Pilihan B" },
          ],
          selectedOptionKey: "A",
          isDoubtful: true,
        },
        {
          id: "scheduled-item-2",
          order: 2,
          blockLabel: "Pharmaceutical Science",
          stem: "Parameter sterilitas mana yang diprioritaskan lebih dulu?",
          questionImageUrl: null,
          options: [
            { key: "A", text: "Pilihan A" },
            { key: "B", text: "Pilihan B" },
          ],
          selectedOptionKey: "B",
          isDoubtful: false,
        },
        {
          id: "scheduled-item-3",
          order: 3,
          blockLabel: "Clinical Science",
          stem: "Soal tambahan dari event terbaru.",
          questionImageUrl: null,
          options: [
            { key: "A", text: "Pilihan A" },
            { key: "B", text: "Pilihan B" },
          ],
          selectedOptionKey: null,
          isDoubtful: false,
        },
      ],
    });

    renderScheduledSession();

    const timerPill = (await screen.findByText(/timer sesi 00:04:59/i)).closest("span");
    expect(timerPill).toHaveClass("bg-destructive/10");

    const submitStatusPill = screen.getByText(/belum dikirim/i).closest("span");
    expect(submitStatusPill).toHaveClass("border-border");
    expect(screen.getByRole("button", { name: /batalkan tanda ragu/i }).className).toContain(
      "border-yellow-500/50",
    );
    expect(screen.getByRole("button", { name: /batalkan tanda ragu/i }).className).toContain(
      "bg-yellow-500/20",
    );

    fireEvent.click(screen.getByRole("button", { name: /^3$/ }));

    expect(screen.getByRole("button", { name: /^3$/ })).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("button", { name: /^1$/ }).className).toContain("bg-amber-500");
    expect(screen.getByRole("button", { name: /^2$/ }).className).toContain("bg-emerald-600");
  });

  test("keeps the timer green before the final five minutes", async () => {
    renderScheduledSession();

    const timerPill = (await screen.findByText(/timer sesi 00:40:00/i)).closest("span");
    expect(timerPill).toHaveClass("bg-secondary");
  });

  test("renders timer and options, then enables ragu-ragu after an answer is selected", async () => {
    renderScheduledSession();

    expect(await screen.findByText(/timer sesi 00:40:00/i)).toBeInTheDocument();
    expect(screen.getByAltText(/gambar soal 1/i)).toHaveAttribute(
      "src",
      "https://example.com/questions/scheduled-1.png",
    );
    expect(screen.getByRole("button", { name: /^1$/ })).toHaveAttribute("data-variant", "outline");
    expect(screen.getByRole("button", { name: /A Pilihan A/i })).toHaveAttribute("data-variant", "outline");
    expect(screen.getByRole("button", { name: /selanjutnya/i })).toHaveAttribute("data-variant", "primary");
    expect(screen.getByRole("button", { name: /sebelumnya/i })).toHaveAttribute("data-variant", "outline");
    expect(screen.getByRole("button", { name: /tandai ragu/i })).toBeDisabled();

    const optionAButton = screen.getByRole("button", { name: /A Pilihan A/i });
    fireEvent.click(optionAButton);

    await waitFor(() => {
      expect(optionAButton).toHaveAttribute("aria-pressed", "true");
    });

    await waitFor(() => {
      expect(mockSaveScheduledTryoutAnswer).toHaveBeenCalledWith({
        attemptId: "scheduled-attempt-1",
        attemptItemId: "scheduled-item-1",
        selectedOptionKey: "A",
        isDoubtful: false,
      });
    });

    fireEvent.click(await screen.findByRole("button", { name: /tandai ragu/i }));

    await waitFor(() => {
      expect(mockSaveScheduledTryoutAnswer).toHaveBeenCalledWith({
        attemptId: "scheduled-attempt-1",
        attemptItemId: "scheduled-item-1",
        selectedOptionKey: "A",
        isDoubtful: true,
      });
    });
  });

  test("auto-pauses the scheduled attempt on pagehide after flushing the current answer", async () => {
    renderScheduledSession();

    await screen.findByText(/timer sesi 00:40:00/i);
    fireEvent.click(screen.getByRole("button", { name: /A Pilihan A/i }));

    await waitFor(() => {
      expect(mockSaveScheduledTryoutAnswer).toHaveBeenCalledWith({
        attemptId: "scheduled-attempt-1",
        attemptItemId: "scheduled-item-1",
        selectedOptionKey: "A",
        isDoubtful: false,
      });
    });

    mockSaveScheduledTryoutAnswer.mockClear();
    window.dispatchEvent(new Event("pagehide"));

    await waitFor(() => {
      expect(mockSaveScheduledTryoutAnswer).toHaveBeenCalledWith({
        attemptId: "scheduled-attempt-1",
        attemptItemId: "scheduled-item-1",
        selectedOptionKey: "A",
        isDoubtful: false,
      });
      expect(mockPauseScheduledTryoutAttempt).toHaveBeenCalledWith({
        attemptId: "scheduled-attempt-1",
      });
    });

    expect(mockSaveScheduledTryoutAnswer.mock.invocationCallOrder[0]).toBeLessThan(
      mockPauseScheduledTryoutAttempt.mock.invocationCallOrder[0],
    );
  });

  test("shows a sync notice when the scheduled payload changes total question count", async () => {
    mockGetScheduledAttemptSessionPageData
      .mockResolvedValueOnce({
        view: "ready",
        attempt: {
          id: "scheduled-attempt-1",
          status: "in_progress",
          totalQuestions: 2,
          timeRemainingSeconds: 2400,
        },
        questions: [
          {
            id: "scheduled-item-1",
            order: 1,
            blockLabel: "Clinical Science",
            stem: "Pasien masuk dengan hipertensi emergensi. Apa langkah awal?",
            questionImageUrl: null,
            options: [
              { key: "A", text: "Pilihan A" },
              { key: "B", text: "Pilihan B" },
            ],
            selectedOptionKey: null,
            isDoubtful: false,
          },
          {
            id: "scheduled-item-2",
            order: 2,
            blockLabel: "Pharmaceutical Science",
            stem: "Parameter sterilitas mana yang diprioritaskan lebih dulu?",
            questionImageUrl: null,
            options: [
              { key: "A", text: "Pilihan A" },
              { key: "B", text: "Pilihan B" },
            ],
            selectedOptionKey: null,
            isDoubtful: false,
          },
        ],
      })
      .mockResolvedValueOnce({
        view: "ready",
        attempt: {
          id: "scheduled-attempt-1",
          status: "in_progress",
          totalQuestions: 3,
          timeRemainingSeconds: 2340,
        },
        questions: [
          {
            id: "scheduled-item-1",
            order: 1,
            blockLabel: "Clinical Science",
            stem: "Pasien masuk dengan hipertensi emergensi. Apa langkah awal?",
            questionImageUrl: null,
            options: [
              { key: "A", text: "Pilihan A" },
              { key: "B", text: "Pilihan B" },
            ],
            selectedOptionKey: null,
            isDoubtful: false,
          },
          {
            id: "scheduled-item-2",
            order: 2,
            blockLabel: "Pharmaceutical Science",
            stem: "Parameter sterilitas mana yang diprioritaskan lebih dulu?",
            questionImageUrl: null,
            options: [
              { key: "A", text: "Pilihan A" },
              { key: "B", text: "Pilihan B" },
            ],
            selectedOptionKey: null,
            isDoubtful: false,
          },
          {
            id: "scheduled-item-3",
            order: 3,
            blockLabel: "Clinical Science",
            stem: "Soal tambahan dari event terbaru.",
            questionImageUrl: null,
            options: [
              { key: "A", text: "Pilihan A" },
              { key: "B", text: "Pilihan B" },
            ],
            selectedOptionKey: null,
            isDoubtful: false,
          },
        ],
      });

    const { queryClient } = renderScheduledSession();

    expect(await screen.findByText(/soal 1 dari 2/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();

    await queryClient.invalidateQueries({
      queryKey: ["scheduled-tryout-session", "scheduled-attempt-1"],
    });

    await waitFor(() => {
      expect(mockGetScheduledAttemptSessionPageData).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText(/soal 1 dari 3/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(
      screen.getByRole("alert", {
        name: "",
      }),
    ).toHaveTextContent(/daftar soal diperbarui\. sesi kamu sudah menyesuaikan/i);
  });

  test("uses primary CTA styling for scheduled state actions", async () => {
    mockCreateScheduledTryoutAttempt.mockRejectedValueOnce(
      new Error("Event terjadwal belum bisa dibuka."),
    );

    renderScheduledSession("/app/scheduled-tryout/session?event=event-1");

    expect(
      await screen.findByText(/sesi belum bisa dibuka/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /kembali ke daftar sesi/i })).toHaveAttribute("data-variant", "primary");
  });

  test("shows concise empty copy when no scheduled attempt or event is selected", () => {
    renderScheduledSession("/app/scheduled-tryout/session");

    expect(
      screen.getByText(/belum ada sesi aktif/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/pilih sesi dari daftar untuk mulai/i)).toBeInTheDocument();
  });

  test("shows shorter setup and loading copy for scheduled sessions", async () => {
    mockCreateScheduledTryoutAttempt.mockReturnValueOnce(new Promise(() => undefined));

    renderScheduledSession("/app/scheduled-tryout/session?event=event-1");

    expect(await screen.findByText(/sesi sedang dimuat/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.getByText(/sesi baru sedang disiapkan/i)).toBeInTheDocument();

    cleanup();

    mockGetScheduledAttemptSessionPageData.mockImplementationOnce(() => new Promise(() => undefined));
    renderScheduledSession();

    expect(await screen.findByText(/soal sedang dimuat/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.getByText(/soal sesi sedang disiapkan/i)).toBeInTheDocument();
  });

  test("shows shorter error copy for scheduled session fetch failures", async () => {
    mockGetScheduledAttemptSessionPageData.mockRejectedValueOnce(new Error("failed"));

    renderScheduledSession();

    expect(await screen.findByText(/soal belum bisa dimuat/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.getByText(/buka daftar sesi lalu coba lagi/i)).toBeInTheDocument();
  });

  test("starting a different scheduled event does not redirect into another event's active attempt", async () => {
    mockFindActiveScheduledAttemptForUser.mockResolvedValueOnce({
      attemptId: "scheduled-attempt-1",
      eventId: "event-1",
      status: "paused",
      title: "TO Klinik Juni",
      answeredCount: 12,
      totalQuestions: 40,
      timeRemainingSeconds: 1800,
      accessEndAt: "2026-06-10T12:00:00.000Z",
    });
    mockCreateScheduledTryoutAttempt.mockResolvedValueOnce({
      id: "scheduled-attempt-2",
      status: "in_progress",
      totalQuestions: 2,
      timeLimitSeconds: 120,
      elapsedSeconds: 0,
      startedAt: "2026-06-10T10:00:00.000Z",
      submittedAt: null,
      lastResumedAt: "2026-06-10T10:00:00.000Z",
      pausedAt: null,
      eventId: "event-2",
      eventCycle: 1,
      userId: "user-1",
    });

    renderScheduledSession("/app/scheduled-tryout/session?event=event-2");

    await waitFor(() => {
      expect(mockCreateScheduledTryoutAttempt).toHaveBeenCalledWith({
        eventId: "event-2",
      });
    });

    expect(mockFindActiveScheduledAttemptForUser).not.toHaveBeenCalled();
    expect(mockGetScheduledAttemptSessionPageData).not.toHaveBeenCalledWith({
      attemptId: "scheduled-attempt-1",
    });
  });
});
