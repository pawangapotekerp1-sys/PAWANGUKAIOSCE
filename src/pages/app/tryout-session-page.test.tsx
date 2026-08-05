import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import TryoutSessionPage from "./tryout-session-page";

const mockCreateAttempt = vi.fn();
const mockFindActiveAttemptForUser = vi.fn();
const mockGetAttemptSessionPageData = vi.fn();
const mockPauseAttempt = vi.fn();
const mockResumeAttempt = vi.fn();
const mockSaveAnswer = vi.fn();
const mockSubmitAttempt = vi.fn();
const mockUseStudentShell = vi.fn();

vi.mock("../../lib/api/tryout-api", () => ({
  createAttempt: (...args: unknown[]) => mockCreateAttempt(...args),
  findActiveAttemptForUser: (...args: unknown[]) => mockFindActiveAttemptForUser(...args),
  getAttemptSessionPageData: (...args: unknown[]) => mockGetAttemptSessionPageData(...args),
  pauseAttempt: (...args: unknown[]) => mockPauseAttempt(...args),
  resumeAttempt: (...args: unknown[]) => mockResumeAttempt(...args),
  saveAnswer: (...args: unknown[]) => mockSaveAnswer(...args),
  submitAttempt: (...args: unknown[]) => mockSubmitAttempt(...args),
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

function renderTryoutSession(initialEntry = "/app/tryout/session?attempt=attempt-1") {
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
        <TryoutSessionPage />
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
    navItems: [],
    tierLabel: "Pro",
  });
  mockFindActiveAttemptForUser.mockResolvedValue(null);
  mockGetAttemptSessionPageData.mockResolvedValue({
    view: "ready",
    attempt: {
      id: "attempt-1",
      status: "in_progress",
      totalQuestions: 4,
      timeRemainingSeconds: 10740,
    },
    questions: [
      {
        id: "item-1",
        order: 1,
        blockLabel: "Clinical Science",
        stem: "Apa terapi awal?",
        questionImageUrl: "https://example.com/questions/item-1.png",
        options: [
          { key: "A", text: "Pilihan A" },
          { key: "B", text: "Pilihan B" },
        ],
        selectedOptionKey: null,
        isDoubtful: false,
      },
      {
        id: "item-2",
        order: 2,
        blockLabel: "Pharmaceutical Science",
        stem: "Apa indikator proses aseptik?",
        questionImageUrl: null,
        options: [
          { key: "A", text: "Pilihan A" },
          { key: "B", text: "Pilihan B" },
        ],
        selectedOptionKey: null,
        isDoubtful: false,
      },
      {
        id: "item-3",
        order: 3,
        blockLabel: "Social, Behavioral & Administrative Pharmacy",
        stem: "Dokumentasi intervensi farmasis?",
        questionImageUrl: null,
        options: [
          { key: "A", text: "Pilihan A" },
          { key: "B", text: "Pilihan B" },
        ],
        selectedOptionKey: null,
        isDoubtful: false,
      },
      {
        id: "item-4",
        order: 4,
        blockLabel: "Clinical Science",
        stem: "Apa yang dipantau lebih dulu?",
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
  mockSaveAnswer.mockResolvedValue({
    attemptId: "attempt-1",
    attemptItemId: "item-1",
    selectedOptionKey: "B",
    isDoubtful: false,
    answeredAt: "2026-05-01T10:05:00.000Z",
  });
  mockPauseAttempt.mockResolvedValue({
    id: "attempt-1",
    status: "paused",
    elapsedSeconds: 600,
  });
  mockResumeAttempt.mockResolvedValue({
    id: "attempt-1",
    status: "in_progress",
    elapsedSeconds: 600,
    lastResumedAt: "2026-05-01T10:10:00.000Z",
  });
  mockSubmitAttempt.mockResolvedValue({
    attemptId: "attempt-1",
    score: 74,
    correctAnswers: 148,
    wrongAnswers: 52,
    unansweredCount: 0,
    timeUsedSeconds: 9672,
    blockSummary: [{ name: "Clinical Science", correct: 42, wrong: 18 }],
    generatedAt: "2026-05-01T13:00:00.000Z",
  });
});

describe("Tryout session page", () => {
  test("can hide and show the question navigation sidebar", async () => {
    renderTryoutSession();

    expect(await screen.findByText(/timer sesi 02:59:00/i)).toBeInTheDocument();
    expect(screen.getByText(/pilih nomor soal untuk berpindah dan kirim hasil saat selesai/i)).toBeInTheDocument();
    expect(screen.getByText(/^navigasi soal$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sembunyikan navigasi soal/i })).toHaveAttribute("data-variant", "outline");

    fireEvent.click(screen.getByRole("button", { name: /sembunyikan navigasi soal/i }));

    expect(screen.queryByText(/^nomor soal$/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tampilkan navigasi soal/i })).toHaveAttribute("data-variant", "outline");

    fireEvent.click(screen.getByRole("button", { name: /tampilkan navigasi soal/i }));

    expect(screen.getByText(/^navigasi soal$/i)).toBeInTheDocument();
  });

  test("uses the requested timer and answer-state colors", async () => {
    mockGetAttemptSessionPageData.mockResolvedValueOnce({
      view: "ready",
      attempt: {
        id: "attempt-1",
        status: "in_progress",
        totalQuestions: 3,
        timeRemainingSeconds: 299,
      },
      questions: [
        {
          id: "item-1",
          order: 1,
          blockLabel: "Clinical Science",
          stem: "Apa terapi awal?",
          questionImageUrl: null,
          options: [
            { key: "A", text: "Pilihan A" },
            { key: "B", text: "Pilihan B" },
          ],
          selectedOptionKey: "A",
          isDoubtful: true,
        },
        {
          id: "item-2",
          order: 2,
          blockLabel: "Pharmaceutical Science",
          stem: "Apa indikator proses aseptik?",
          questionImageUrl: null,
          options: [
            { key: "A", text: "Pilihan A" },
            { key: "B", text: "Pilihan B" },
          ],
          selectedOptionKey: "B",
          isDoubtful: false,
        },
        {
          id: "item-3",
          order: 3,
          blockLabel: "Clinical Science",
          stem: "Apa yang dipantau lebih dulu?",
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

    renderTryoutSession();

    const timerPill = (await screen.findByText(/timer sesi 00:04:59/i)).closest("[data-variant]");
    expect(timerPill).toHaveAttribute("data-variant", "destructive");

    const submitStatusPill = screen.getByText(/belum submit/i).closest("[data-variant]");
    expect(submitStatusPill).toHaveAttribute("data-variant", "secondary");
    expect(screen.getByRole("button", { name: /batal ragu-ragu/i }).className).toContain(
      "border-amber-500/50",
    );
    expect(screen.getByRole("button", { name: /batal ragu-ragu/i }).className).toContain(
      "bg-amber-500/10",
    );

    fireEvent.click(screen.getByRole("button", { name: /^3$/ }));

    expect(screen.getByRole("button", { name: /^3$/ })).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("button", { name: /^1$/ }).className).toContain("bg-amber-500");
    expect(screen.getByRole("button", { name: /^2$/ }).className).toContain("bg-emerald-600");
  });

  test("keeps the timer green before the final five minutes", async () => {
    renderTryoutSession();

    const timerPill = (await screen.findByText(/timer sesi 02:59:00/i)).closest("[data-variant]");
    expect(timerPill).toHaveAttribute("data-variant", "secondary");
  });

  test("renders timer, saves answer timing, flushes on navigation, and shows submit action on the last step", async () => {
    renderTryoutSession();

    expect(await screen.findByText(/timer sesi 02:59:00/i)).toBeInTheDocument();
    expect(screen.getByAltText(/gambar soal 1/i)).toHaveAttribute(
      "src",
      "https://example.com/questions/item-1.png",
    );
    expect(
      screen.getByRole("button", {
        name: /^1$/,
      }),
    ).toHaveAttribute("data-variant", "outline");
    expect(screen.getByRole("button", { name: /A Pilihan A/i })).toHaveAttribute("data-variant", "outline");
    expect(
      screen.getByRole("button", {
        name: /selanjutnya/i,
      }),
    ).toHaveAttribute("data-variant", "default");
    expect(
      screen.getByRole("button", {
        name: /sebelumnya/i,
      }),
    ).toHaveAttribute("data-variant", "outline");

    const optionAButton = screen.getByRole("button", { name: /A Pilihan A/i });
    fireEvent.click(optionAButton);

    await waitFor(() => {
      expect(optionAButton).toHaveAttribute("aria-pressed", "true");
    });

    await waitFor(() => {
      expect(mockSaveAnswer).toHaveBeenCalledWith({
        attemptId: "attempt-1",
        attemptItemId: "item-1",
        selectedOptionKey: "A",
        isDoubtful: false,
        timeSpentDeltaSeconds: expect.any(Number),
      });
    });

    mockSaveAnswer.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /selanjutnya/i }));

    await waitFor(() => {
      expect(mockSaveAnswer).toHaveBeenCalledWith({
        attemptId: "attempt-1",
        attemptItemId: "item-1",
        selectedOptionKey: "A",
        isDoubtful: false,
        timeSpentDeltaSeconds: expect.any(Number),
      });
    });
    await screen.findByText(/soal 2/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' });

    fireEvent.click(screen.getByRole("button", { name: /selanjutnya/i }));
    await screen.findByText(/soal 3/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' });
    fireEvent.click(screen.getByRole("button", { name: /selanjutnya/i }));
    await screen.findByText(/soal 4/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' });

    expect(
      screen.getByRole("button", {
        name: /kirim hasil/i,
      }),
    ).toHaveAttribute("data-variant", "default");
  }, 10000);

  test("enables ragu-ragu after an answer is selected and saves doubtful state", async () => {
    renderTryoutSession();

    const doubtfulButton = await screen.findByRole("button", { name: /ragu-ragu/i });
    expect(doubtfulButton).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /A Pilihan A/i }));

    await waitFor(() => {
      expect(mockSaveAnswer).toHaveBeenCalledWith({
        attemptId: "attempt-1",
        attemptItemId: "item-1",
        selectedOptionKey: "A",
        isDoubtful: false,
        timeSpentDeltaSeconds: expect.any(Number),
      });
    });

    fireEvent.click(await screen.findByRole("button", { name: /ragu-ragu/i }));

    await waitFor(() => {
      expect(mockSaveAnswer).toHaveBeenCalledWith({
        attemptId: "attempt-1",
        attemptItemId: "item-1",
        selectedOptionKey: "A",
        isDoubtful: true,
        timeSpentDeltaSeconds: expect.any(Number),
      });
    });
  }, 10000);

  test("updates the timer locally and auto-submits when time reaches zero", async () => {
    mockGetAttemptSessionPageData.mockResolvedValueOnce({
      view: "ready",
      attempt: {
        id: "attempt-1",
        status: "in_progress",
        totalQuestions: 1,
        timeRemainingSeconds: 2,
      },
      questions: [
        {
          id: "item-1",
          order: 1,
          blockLabel: "Clinical Science",
          stem: "Apa terapi awal?",
          questionImageUrl: null,
          options: [
            { key: "A", text: "Pilihan A" },
            { key: "B", text: "Pilihan B" },
          ],
          selectedOptionKey: "A",
          isDoubtful: true,
        },
      ],
    });

    renderTryoutSession();

    expect(await screen.findByText(/timer sesi 00:00:02/i)).toBeInTheDocument();
    expect(await screen.findByText(/timer sesi 00:00:(01|00)/i, {}, { timeout: 4000 })).toBeInTheDocument();

    await waitFor(() => {
      expect(mockSubmitAttempt).toHaveBeenCalledTimes(1);
    }, { timeout: 3500 });
  }, 10000);

  test("does not reset the local countdown when an answer update changes session query data", async () => {
    mockGetAttemptSessionPageData.mockResolvedValueOnce({
      view: "ready",
      attempt: {
        id: "attempt-1",
        status: "in_progress",
        totalQuestions: 1,
        timeRemainingSeconds: 3,
      },
      questions: [
        {
          id: "item-1",
          order: 1,
          blockLabel: "Clinical Science",
          stem: "Apa terapi awal?",
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

    renderTryoutSession();

    expect(await screen.findByText(/timer sesi 00:00:03/i)).toBeInTheDocument();
    expect(await screen.findByText(/timer sesi 00:00:(02|01|00)/i, {}, { timeout: 7000 })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /A Pilihan A/i }));

    await waitFor(() => {
      expect(mockSaveAnswer).toHaveBeenCalledWith({
        attemptId: "attempt-1",
        attemptItemId: "item-1",
        selectedOptionKey: "A",
        isDoubtful: false,
        timeSpentDeltaSeconds: expect.any(Number),
      });
    });

    expect(screen.queryByText(/timer sesi 00:00:03/i)).not.toBeInTheDocument();
  }, 10000);

  test("flushes current question timing before submitting the final result", async () => {
    renderTryoutSession();

    await screen.findByText(/timer sesi 02:59:00/i);

    fireEvent.click(screen.getByRole("button", { name: /A Pilihan A/i }));
    await waitFor(() => {
      expect(mockSaveAnswer).toHaveBeenCalledWith({
        attemptId: "attempt-1",
        attemptItemId: "item-1",
        selectedOptionKey: "A",
        isDoubtful: false,
        timeSpentDeltaSeconds: expect.any(Number),
      });
    });

    mockSaveAnswer.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /selanjutnya/i }));
    await screen.findByText(/soal 2/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' });
    fireEvent.click(screen.getByRole("button", { name: /selanjutnya/i }));
    await screen.findByText(/soal 3/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' });
    fireEvent.click(screen.getByRole("button", { name: /selanjutnya/i }));
    await screen.findByText(/soal 4/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /kirim hasil/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /kirim hasil/i }));

    await waitFor(() => {
      expect(mockSaveAnswer).toHaveBeenCalledWith({
        attemptId: "attempt-1",
        attemptItemId: "item-4",
        selectedOptionKey: null,
        isDoubtful: false,
        timeSpentDeltaSeconds: expect.any(Number),
      });
      expect(mockSubmitAttempt).toHaveBeenCalledWith({
        attemptId: "attempt-1",
      });
    });
  }, 10000);

  test("clears cached active-attempt resume data after a successful submit", async () => {
    mockGetAttemptSessionPageData.mockResolvedValueOnce({
      view: "ready",
      attempt: {
        id: "attempt-1",
        status: "in_progress",
        totalQuestions: 1,
        timeRemainingSeconds: 60,
      },
      questions: [
        {
          id: "item-1",
          order: 1,
          blockLabel: "Clinical Science",
          stem: "Apa terapi awal?",
          questionImageUrl: null,
          options: [
            { key: "A", text: "Pilihan A" },
            { key: "B", text: "Pilihan B" },
          ],
          selectedOptionKey: "A",
          isDoubtful: false,
        },
      ],
    });

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

    queryClient.setQueryData(["active-tryout-attempt", "user-1"], {
      attemptId: "attempt-1",
      status: "in_progress",
      title: "Try Out Besar",
      mode: "full",
      answeredCount: 2,
      totalQuestions: 50,
      timeRemainingSeconds: 0,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/app/tryout/session?attempt=attempt-1"]}>
          <TryoutSessionPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await screen.findByText(/timer sesi 00:01:00/i);

    fireEvent.click(screen.getByRole("button", { name: /kirim hasil/i }));

    await waitFor(() => {
      expect(mockSubmitAttempt).toHaveBeenCalledWith({
        attemptId: "attempt-1",
      });
    });

    await waitFor(() => {
      expect(queryClient.getQueryData(["active-tryout-attempt", "user-1"])).toBeUndefined();
    });
  }, 10000);

  test("renders the question load error state from preview query params", () => {
    renderTryoutSession("/app/tryout/session?questionView=error");

    expect(
      screen.getByText(/soal try out belum bisa dimuat/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /buka katalog lagi/i })).toHaveAttribute(
      "href",
      "/app/tryout",
    );
    expect(screen.getByRole("link", { name: /buka katalog lagi/i })).toHaveAttribute("data-variant", "primary");
    expect(screen.getByText(/^buka katalog lalu coba lagi\.$/i)).toBeInTheDocument();
  });

  test("renders concise empty copy from preview query params", () => {
    renderTryoutSession("/app/tryout/session?questionView=empty");

    expect(
      screen.getByText(/belum ada soal untuk sesi ini/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/pilih sesi lain atau kembali nanti/i)).toBeInTheDocument();
  });

  test("shows shorter setup, empty, and loading states", async () => {
    mockCreateAttempt.mockReturnValueOnce(new Promise(() => undefined));
    renderTryoutSession("/app/tryout/session?template=template-topic-1");

    expect(await screen.findByText(/sesi try out sedang dimuat/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.getByText(/sesi baru sedang disiapkan/i)).toBeInTheDocument();

    cleanup();

    renderTryoutSession("/app/tryout/session");

    expect(screen.getByText(/belum ada sesi aktif/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.getByText(/pilih sesi dari katalog untuk mulai/i)).toBeInTheDocument();

    cleanup();

    mockGetAttemptSessionPageData.mockImplementationOnce(() => new Promise(() => undefined));
    renderTryoutSession();

    expect(await screen.findByText(/soal try out sedang dimuat/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.getByText(/soal sedang disiapkan/i)).toBeInTheDocument();
  });

  test("surfaces an insufficient published-bank error when attempt creation fails", async () => {
    mockCreateAttempt.mockRejectedValueOnce(
      new Error("Template try out ini belum memiliki cukup soal published."),
    );

    renderTryoutSession("/app/tryout/session?template=template-topic-1");

    expect(
      await screen.findByText(/sesi try out belum berhasil dibuka/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/template try out ini belum memiliki cukup soal published/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /kembali ke katalog try out/i })).toHaveAttribute("data-variant", "primary");
  }, 10000);

  test("shows shorter fallback copy when a new session cannot be started", async () => {
    mockCreateAttempt.mockRejectedValueOnce("failed");
    renderTryoutSession("/app/tryout/session?template=template-topic-1");

    expect(
      await screen.findByText(/sesi try out belum berhasil dibuka/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/sesi baru belum bisa dibuka\. coba lagi sebentar\./i)).toBeInTheDocument();
  }, 10000);

  test("retries template attempt creation after a stuck request is abandoned by a remount", async () => {
    mockCreateAttempt.mockReturnValueOnce(new Promise(() => undefined));

    const firstRender = renderTryoutSession("/app/tryout/session?template=template-full-1");

    await waitFor(() => {
      expect(mockCreateAttempt).toHaveBeenCalledTimes(1);
    });

    firstRender.unmount();
    renderTryoutSession("/app/tryout/session?template=template-full-1");

    await waitFor(() => {
      expect(mockCreateAttempt).toHaveBeenCalledTimes(2);
    });
  }, 10000);

  test("resumes a paused attempt from the same session instead of creating a new one", async () => {
    mockGetAttemptSessionPageData.mockResolvedValueOnce({
      view: "ready",
      attempt: {
        id: "attempt-1",
        status: "paused",
        totalQuestions: 1,
        timeRemainingSeconds: 120,
      },
      questions: [
        {
          id: "item-1",
          order: 1,
          blockLabel: "Clinical Science",
          stem: "Apa terapi awal?",
          questionImageUrl: null,
          options: [
            { key: "A", text: "Pilihan A" },
            { key: "B", text: "Pilihan B" },
          ],
          selectedOptionKey: "B",
          isDoubtful: true,
        },
      ],
    });

    renderTryoutSession();

    expect(await screen.findByText(/timer sesi 00:02:00/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(mockResumeAttempt).toHaveBeenCalledWith({
        attemptId: "attempt-1",
      });
    });
    expect(mockCreateAttempt).not.toHaveBeenCalled();
  }, 10000);

  test("disables answer-changing controls while a paused attempt is waiting to resume", async () => {
    mockResumeAttempt.mockReturnValueOnce(new Promise(() => undefined));
    mockGetAttemptSessionPageData.mockResolvedValueOnce({
      view: "ready",
      attempt: {
        id: "attempt-1",
        status: "paused",
        totalQuestions: 1,
        timeRemainingSeconds: 120,
      },
      questions: [
        {
          id: "item-1",
          order: 1,
          blockLabel: "Clinical Science",
          stem: "Apa terapi awal?",
          questionImageUrl: null,
          options: [
            { key: "A", text: "Pilihan A" },
            { key: "B", text: "Pilihan B" },
          ],
          selectedOptionKey: "B",
          isDoubtful: true,
        },
      ],
    });

    renderTryoutSession();

    expect(await screen.findByRole("button", { name: /A Pilihan A/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /B Pilihan B/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /batal ragu-ragu/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /kirim hasil/i })).toBeDisabled();
    await waitFor(() => {
      expect(mockResumeAttempt).toHaveBeenCalledWith({
        attemptId: "attempt-1",
      });
    });
  }, 10000);

  test("shows a retry path when auto-resume fails temporarily", async () => {
    mockResumeAttempt
      .mockRejectedValueOnce(new Error("Jaringan sempat putus."))
      .mockResolvedValueOnce({
        id: "attempt-1",
        status: "in_progress",
        elapsedSeconds: 600,
        lastResumedAt: "2026-05-01T10:10:00.000Z",
      });
    mockGetAttemptSessionPageData.mockResolvedValue({
      view: "ready",
      attempt: {
        id: "attempt-1",
        status: "paused",
        totalQuestions: 1,
        timeRemainingSeconds: 120,
      },
      questions: [
        {
          id: "item-1",
          order: 1,
          blockLabel: "Clinical Science",
          stem: "Apa terapi awal?",
          questionImageUrl: null,
          options: [
            { key: "A", text: "Pilihan A" },
            { key: "B", text: "Pilihan B" },
          ],
          selectedOptionKey: "B",
          isDoubtful: true,
        },
      ],
    });

    renderTryoutSession();

    expect(await screen.findByText(/timer sesi 00:02:00/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(mockResumeAttempt).toHaveBeenCalledTimes(1);
    });
    expect(
      await screen.findByRole("button", {
        name: /coba lanjutkan sesi/i,
      }),
    ).toHaveAttribute("data-variant", "default");

    fireEvent.click(screen.getByRole("button", { name: /coba lanjutkan sesi/i }));

    await waitFor(() => {
      expect(mockResumeAttempt).toHaveBeenCalledTimes(2);
    });
  }, 10000);

  test("auto-pauses an in-progress attempt once when the page is hidden after flushing current progress", async () => {
    renderTryoutSession();

    await screen.findByText(/timer sesi 02:59:00/i);
    fireEvent.click(screen.getByRole("button", { name: /A Pilihan A/i }));

    await waitFor(() => {
      expect(mockSaveAnswer).toHaveBeenCalledWith({
        attemptId: "attempt-1",
        attemptItemId: "item-1",
        selectedOptionKey: "A",
        isDoubtful: false,
        timeSpentDeltaSeconds: expect.any(Number),
      });
    });

    mockSaveAnswer.mockClear();

    window.dispatchEvent(new Event("pagehide"));

    await waitFor(() => {
      expect(mockSaveAnswer).toHaveBeenCalledWith({
        attemptId: "attempt-1",
        attemptItemId: "item-1",
        selectedOptionKey: "A",
        isDoubtful: false,
        timeSpentDeltaSeconds: expect.any(Number),
      });
      expect(mockPauseAttempt).toHaveBeenCalledTimes(1);
      expect(mockPauseAttempt).toHaveBeenCalledWith({
        attemptId: "attempt-1",
      });
    });

    expect(mockSaveAnswer.mock.invocationCallOrder[0]).toBeLessThan(
      mockPauseAttempt.mock.invocationCallOrder[0],
    );

    window.dispatchEvent(new Event("pagehide"));

    await waitFor(() => {
      expect(mockPauseAttempt).toHaveBeenCalledTimes(1);
    });
  }, 10000);

  test("waits for an in-flight answer save before auto-pausing so the same answer is not flushed twice in parallel", async () => {
    let resolveFirstSave:
      | ((value: {
        attemptId: string;
        attemptItemId: string;
        selectedOptionKey: string;
        isDoubtful: boolean;
        answeredAt: string;
      }) => void)
      | undefined;
    mockSaveAnswer.mockImplementationOnce(() => new Promise((resolve) => {
      resolveFirstSave = resolve;
    }));

    renderTryoutSession();

    await screen.findByText(/timer sesi 02:59:00/i);
    fireEvent.click(screen.getByRole("button", { name: /A Pilihan A/i }));

    await waitFor(() => {
      expect(mockSaveAnswer).toHaveBeenCalledTimes(1);
    });

    window.dispatchEvent(new Event("pagehide"));

    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    expect(mockSaveAnswer).toHaveBeenCalledTimes(1);
    expect(mockPauseAttempt).not.toHaveBeenCalled();

    if (!resolveFirstSave) {
      throw new Error("Expected the first answer save promise to stay pending.");
    }

    resolveFirstSave({
      attemptId: "attempt-1",
      attemptItemId: "item-1",
      selectedOptionKey: "A",
      isDoubtful: false,
      answeredAt: "2026-05-01T10:05:00.000Z",
    });

    await waitFor(() => {
      expect(mockPauseAttempt).toHaveBeenCalledTimes(1);
    });
  }, 10000);

  test("can resume again after a later auto-pause returns another paused payload", async () => {
    mockGetAttemptSessionPageData
      .mockResolvedValueOnce({
        view: "ready",
        attempt: {
          id: "attempt-1",
          status: "paused",
          totalQuestions: 1,
          timeRemainingSeconds: 120,
        },
        questions: [
          {
            id: "item-1",
            order: 1,
            blockLabel: "Clinical Science",
            stem: "Apa terapi awal?",
            questionImageUrl: null,
            options: [
              { key: "A", text: "Pilihan A" },
              { key: "B", text: "Pilihan B" },
            ],
            selectedOptionKey: "B",
            isDoubtful: true,
          },
        ],
      })
      .mockResolvedValueOnce({
        view: "ready",
        attempt: {
          id: "attempt-1",
          status: "in_progress",
          totalQuestions: 1,
          timeRemainingSeconds: 120,
        },
        questions: [
          {
            id: "item-1",
            order: 1,
            blockLabel: "Clinical Science",
            stem: "Apa terapi awal?",
            questionImageUrl: null,
            options: [
              { key: "A", text: "Pilihan A" },
              { key: "B", text: "Pilihan B" },
            ],
            selectedOptionKey: "B",
            isDoubtful: true,
          },
        ],
      })
      .mockResolvedValueOnce({
        view: "ready",
        attempt: {
          id: "attempt-1",
          status: "paused",
          totalQuestions: 1,
          timeRemainingSeconds: 119,
        },
        questions: [
          {
            id: "item-1",
            order: 1,
            blockLabel: "Clinical Science",
            stem: "Apa terapi awal?",
            questionImageUrl: null,
            options: [
              { key: "A", text: "Pilihan A" },
              { key: "B", text: "Pilihan B" },
            ],
            selectedOptionKey: "B",
            isDoubtful: true,
          },
        ],
      });

    renderTryoutSession();

    await waitFor(() => {
      expect(mockResumeAttempt).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(mockGetAttemptSessionPageData).toHaveBeenCalledTimes(2);
    });

    window.dispatchEvent(new Event("pagehide"));

    await waitFor(() => {
      expect(mockPauseAttempt).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(mockGetAttemptSessionPageData.mock.calls.length).toBeGreaterThanOrEqual(3);
    });
    await waitFor(() => {
      expect(mockResumeAttempt).toHaveBeenCalledTimes(2);
    });
  }, 10000);

  test("uses visibilitychange as a fallback auto-pause signal", async () => {
    renderTryoutSession();

    await screen.findByText(/timer sesi 02:59:00/i);

    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });

    document.dispatchEvent(new Event("visibilitychange"));

    await waitFor(() => {
      expect(mockPauseAttempt).toHaveBeenCalledWith({
        attemptId: "attempt-1",
      });
    });
  }, 10000);
});

