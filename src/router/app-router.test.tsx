import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Session } from "@supabase/supabase-js";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import App from "../App";
import type { SubscriptionState, UserRole } from "../lib/auth/permissions";

const mockUseSession = vi.fn();
const mockBootstrapProfile = vi.fn();
const mockGetUserSubscription = vi.fn();
const mockGetSubscriptionOverview = vi.fn();
const mockGetDashboardSummary = vi.fn();
const mockListQuestionBank = vi.fn();
const mockListQuestionTaxonomy = vi.fn();
const mockGetQuestionEditorData = vi.fn();
const mockCreateQuestion = vi.fn();
const mockUpdateQuestion = vi.fn();
const mockUploadQuestionMedia = vi.fn();
const mockListSubmittedAttemptHistory = vi.fn();
const mockGetAttemptReviewPageData = vi.fn();
const mockListScheduledSubmittedAttemptHistory = vi.fn();
const mockGetScheduledAttemptReviewPageData = vi.fn();
const mockListScheduledTryoutCatalogEntries = vi.fn();
const mockFindActiveScheduledAttemptForUser = vi.fn();
const mockGetScheduledEventLeaderboard = vi.fn();
const mockGetLeaderboard = vi.fn();
const mockGetCurrentProfile = vi.fn();
const mockGetProfileAvatarSignedUrl = vi.fn();
const mockUpdateCurrentProfileName = vi.fn();
const mockUpdateCurrentLeaderboardAlias = vi.fn();
const mockUpdateCurrentUserPassword = vi.fn();
const mockUploadCurrentUserAvatar = vi.fn();
const mockGetQuestionGeneratorStatus = vi.fn();
const mockGenerateQuestionBatch = vi.fn();
const mockListPublishedFlashCardSubtopics = vi.fn();
const mockGetPublishedFlashCardDeck = vi.fn();
const mockListMentorFlashCardMaterials = vi.fn();
const mockGetFlashCardMaterialDetail = vi.fn();

vi.mock("../lib/auth/use-session", () => ({
  useSession: () => mockUseSession(),
}));

vi.mock("../lib/api/auth-api", () => ({
  bootstrapProfile: (...args: unknown[]) => mockBootstrapProfile(...args),
  logout: vi.fn(),
  requestPasswordReset: vi.fn(),
  updatePasswordAfterRecovery: vi.fn(),
}));

vi.mock("../lib/api/profile-api", () => ({
  getCurrentProfile: (...args: unknown[]) => mockGetCurrentProfile(...args),
  getProfileAvatarSignedUrl: (...args: unknown[]) => mockGetProfileAvatarSignedUrl(...args),
  updateCurrentProfileName: (...args: unknown[]) => mockUpdateCurrentProfileName(...args),
  updateCurrentLeaderboardAlias: (...args: unknown[]) => mockUpdateCurrentLeaderboardAlias(...args),
  updateCurrentUserPassword: (...args: unknown[]) => mockUpdateCurrentUserPassword(...args),
  uploadCurrentUserAvatar: (...args: unknown[]) => mockUploadCurrentUserAvatar(...args),
}));

vi.mock("../lib/api/subscription-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/api/subscription-api")>();

  return {
    ...actual,
    getUserSubscription: (...args: unknown[]) => mockGetUserSubscription(...args),
    getSubscriptionOverview: (...args: unknown[]) => mockGetSubscriptionOverview(...args),
  };
});

vi.mock("../lib/api/analytics-api", () => ({
  getDashboardSummary: (...args: unknown[]) => mockGetDashboardSummary(...args),
  getStudentAnalytics: vi.fn(),
}));

vi.mock("../lib/api/tryout-api", () => ({
  listSubmittedAttemptHistory: (...args: unknown[]) => mockListSubmittedAttemptHistory(...args),
  getAttemptReviewPageData: (...args: unknown[]) => mockGetAttemptReviewPageData(...args),
  listTryoutCatalogEntries: vi.fn().mockResolvedValue([]),
  listPublishedExamTemplates: vi.fn().mockResolvedValue([]),
  getAttemptResultPageData: vi.fn(),
  getAttemptSessionPageData: vi.fn(),
  createAttempt: vi.fn(),
  saveAnswer: vi.fn(),
  submitAttempt: vi.fn(),
}));

vi.mock("../lib/api/scheduled-tryout-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/api/scheduled-tryout-api")>();

  return {
    ...actual,
    listScheduledSubmittedAttemptHistory: (...args: unknown[]) =>
      mockListScheduledSubmittedAttemptHistory(...args),
    getScheduledAttemptReviewPageData: (...args: unknown[]) =>
      mockGetScheduledAttemptReviewPageData(...args),
    listScheduledTryoutCatalogEntries: (...args: unknown[]) =>
      mockListScheduledTryoutCatalogEntries(...args),
    findActiveScheduledAttemptForUser: (...args: unknown[]) =>
      mockFindActiveScheduledAttemptForUser(...args),
    getScheduledEventLeaderboard: (...args: unknown[]) =>
      mockGetScheduledEventLeaderboard(...args),
  };
});

vi.mock("../lib/api/leaderboard-api", () => ({
  getLeaderboard: (...args: unknown[]) => mockGetLeaderboard(...args),
}));

vi.mock("../lib/api/question-authoring-api", () => ({
  listQuestionBank: (...args: unknown[]) => mockListQuestionBank(...args),
  listQuestionTaxonomy: (...args: unknown[]) => mockListQuestionTaxonomy(...args),
  getQuestionEditorData: (...args: unknown[]) => mockGetQuestionEditorData(...args),
  createQuestion: (...args: unknown[]) => mockCreateQuestion(...args),
  updateQuestion: (...args: unknown[]) => mockUpdateQuestion(...args),
  uploadQuestionMedia: (...args: unknown[]) => mockUploadQuestionMedia(...args),
}));

vi.mock("../lib/api/question-generator-api", () => ({
  getQuestionGeneratorStatus: (...args: unknown[]) => mockGetQuestionGeneratorStatus(...args),
  generateQuestionBatch: (...args: unknown[]) => mockGenerateQuestionBatch(...args),
}));

vi.mock("../lib/api/flash-card-api", () => ({
  listPublishedFlashCardSubtopics: (...args: unknown[]) => mockListPublishedFlashCardSubtopics(...args),
  getPublishedFlashCardDeck: (...args: unknown[]) => mockGetPublishedFlashCardDeck(...args),
  listMentorFlashCardMaterials: (...args: unknown[]) => mockListMentorFlashCardMaterials(...args),
  getFlashCardMaterialDetail: (...args: unknown[]) => mockGetFlashCardMaterialDetail(...args),
  createFlashCardMaterialDraft: vi.fn(),
  retryFlashCardMaterialProcessing: vi.fn(),
  saveFlashCardMaterialReview: vi.fn(),
  publishFlashCardMaterial: vi.fn(),
  saveStudentFlashCardDifficulty: vi.fn(),
}));

function createSession(email = "student@example.com"): Session {
  return {
    access_token: "token",
    refresh_token: "refresh",
    expires_in: 3600,
    expires_at: 1_777_700_000,
    token_type: "bearer",
    user: {
      id: "user-1",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: "2026-05-01T00:00:00.000Z",
      email,
    },
  } as Session;
}

function setAnonymousSession() {
  mockUseSession.mockReturnValue({
    status: "anonymous",
    session: null,
    user: null,
  });
}

function renderApp(initialEntry: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function setAuthenticatedSession(role: UserRole, subscriptionState: SubscriptionState) {
  const session = createSession(
    role === "admin" ? "admin@example.com" : "student@example.com",
  );

  mockUseSession.mockReturnValue({
    status: "authenticated",
    session,
    user: session.user,
  });
  mockBootstrapProfile.mockResolvedValue({
    id: session.user.id,
    email: session.user.email ?? null,
    role,
    subscriptionState,
  });
  mockGetUserSubscription.mockResolvedValue({
    id: "subscription-1",
    userId: session.user.id,
    packageCode: "pro_30_hari",
    state: subscriptionState,
    startsAt: "2026-05-01T00:00:00.000Z",
    endsAt: "2026-06-01T00:00:00.000Z",
  });
  mockGetSubscriptionOverview.mockResolvedValue({
    subscription: {
      id: "subscription-1",
      userId: session.user.id,
      packageCode: "pro_30_hari",
      state: subscriptionState,
      startsAt: "2026-05-01T00:00:00.000Z",
      endsAt: "2026-06-01T00:00:00.000Z",
    },
    latestSubmission:
      subscriptionState === "pending_review" || subscriptionState === "rejected"
        ? {
          id: "submission-1",
          userId: session.user.id,
          packageCode: "pro_30_hari",
          paymentProofPath: `${session.user.id}/proof.png`,
          proofFileName: "proof.png",
          status: subscriptionState,
          reviewerId: null,
          reviewedAt: null,
          reviewerNotes: null,
          createdAt: "2026-05-01T08:00:00.000Z",
        }
        : null,
  });
  mockGetCurrentProfile.mockResolvedValue({
    id: session.user.id,
    email: session.user.email ?? null,
    fullName: role === "admin" ? "Admin Operasional" : "Peserta Aktif",
    avatarUrl: null,
    role,
  });
  mockGetProfileAvatarSignedUrl.mockResolvedValue("https://example.com/avatar.webp");
}

function setAuthenticatedSessionWithGuardError(message: string) {
  const session = createSession();

  mockUseSession.mockReturnValue({
    status: "authenticated",
    session,
    user: session.user,
  });
  mockBootstrapProfile.mockRejectedValue(new Error(message));
  mockGetUserSubscription.mockResolvedValue(null);
  mockGetSubscriptionOverview.mockResolvedValue({
    subscription: null,
    latestSubmission: null,
  });
  mockGetCurrentProfile.mockResolvedValue({
    id: session.user.id,
    email: session.user.email ?? null,
    fullName: "Peserta Aktif",
    avatarUrl: null,
    role: "pendaftar_baru",
  });
  mockGetProfileAvatarSignedUrl.mockResolvedValue("https://example.com/avatar.webp");
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  setAnonymousSession();
  mockGetSubscriptionOverview.mockResolvedValue({
    subscription: null,
    latestSubmission: null,
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
    ],
    weeklyTrend: [62, 68, 66, 74, 71, 78, 82],
    latestAttemptId: "attempt-1",
    primaryInsightTitle: "Clinical Science masih jadi rem utama.",
    primaryInsightBody: "Mulai dari Farmakoterapi kardiovaskular, lalu tutup sesi dengan review salah saja pada Clinical Science.",
    weakestBlockTarget: "Target blok lemah pekan ini: 70%",
    consistencyLabel: "5 dari 7 sesi berada di atas 70",
  });
  mockListQuestionBank.mockResolvedValue([
    {
      id: "question-1",
      stem: "Apa target tekanan darah pada CKD?",
      blockName: "Clinical Science",
      topicName: "Kardiologi",
      status: "draft",
      statusLabel: "Draft",
      hasQuestionImage: false,
      hasExplanationImage: false,
    },
  ]);
  mockListQuestionTaxonomy.mockResolvedValue([
    {
      id: "block-1",
      name: "Clinical Science",
      slug: "clinical-science",
      topics: [{ id: "topic-1", name: "Kardiologi", slug: "kardiologi" }],
    },
  ]);
  mockGetQuestionEditorData.mockResolvedValue(null);
  mockCreateQuestion.mockResolvedValue({ id: "question-1" });
  mockUpdateQuestion.mockResolvedValue({ id: "question-1" });
  mockUploadQuestionMedia.mockResolvedValue({
    path: "question/questions/draft-image.png",
    signedUrl: "https://example.com/question/questions/draft-image.png",
  });
  mockListSubmittedAttemptHistory.mockResolvedValue([
    {
      attemptId: "attempt-1",
      title: "Try Out Besar",
      submittedAt: "2026-05-03T08:00:00.000Z",
      score: 78,
      correctAnswers: 156,
      wrongAnswers: 44,
    },
  ]);
  mockGetAttemptReviewPageData.mockResolvedValue({
    items: [
      {
        id: "item-1",
        blockLabel: "Clinical Science",
        question: "Apa target tekanan darah pada CKD?",
        questionImageUrl: null,
        userAnswer: "Pilihan A",
        correctAnswer: "Pilihan B",
        explanationText: "Pembahasan singkat.",
        explanationImageUrl: null,
        isWrong: true,
      },
    ],
  });
  mockListScheduledSubmittedAttemptHistory.mockResolvedValue([
    {
      attemptId: "scheduled-attempt-1",
      title: "TO Klinik Juni",
      submittedAt: "2026-05-04T08:00:00.000Z",
      score: 82,
      correctAnswers: 33,
      wrongAnswers: 7,
      source: "scheduled",
    },
  ]);
  mockGetScheduledAttemptReviewPageData.mockResolvedValue({
    items: [
      {
        id: "scheduled-item-1",
        blockLabel: "Pharmaceutical Science",
        question: "Apa antidot utama pada overdosis parasetamol?",
        questionImageUrl: null,
        userAnswer: "Arang aktif",
        correctAnswer: "N-asetilsistein",
        explanationText: "N-asetilsistein membantu memulihkan cadangan glutathione.",
        explanationImageUrl: null,
        isWrong: true,
      },
    ],
  });
  mockListScheduledTryoutCatalogEntries.mockResolvedValue([]);
  mockFindActiveScheduledAttemptForUser.mockResolvedValue(null);
  mockGetScheduledEventLeaderboard.mockResolvedValue({
    state: "live",
    rows: [
      {
        rank: 1,
        eventId: "event-1",
        eventCycle: 2,
        userId: "user-1",
        alias: "FarmasiNad",
        bestScore: 92,
        bestScoreAttemptNumber: 2,
        attemptId: "attempt-1",
        submittedAt: "2026-06-16T01:00:00.000Z",
      },
    ],
  });
  mockGetLeaderboard.mockResolvedValue([
    {
      rank: 1,
      userId: "user-1",
      alias: "FarmasiNad",
      score: 92,
      timeUsedSeconds: 1180,
      attemptId: "attempt-1",
      submittedAt: "2026-05-07T00:00:00.000Z",
      category: "overall",
    },
  ]);
  mockGetCurrentProfile.mockResolvedValue({
    id: "user-1",
    email: "student@example.com",
    fullName: "Peserta Aktif",
    avatarUrl: null,
    role: "pro",
  });
  mockGetProfileAvatarSignedUrl.mockResolvedValue("https://example.com/avatar.webp");
  mockGetQuestionGeneratorStatus.mockResolvedValue({
    hasCredential: true,
    model: "gemini-2.5-flash",
    modelLabel: "gemini-2.5-flash",
    lastValidatedAt: "2026-06-04T09:00:00.000Z",
    lastError: null,
  });
  mockGenerateQuestionBatch.mockResolvedValue({
    batchId: "batch-1",
    generatedCount: 3,
  });
  mockListPublishedFlashCardSubtopics.mockResolvedValue([
    {
      subtopicId: "subtopic-1",
      materialId: "material-1",
      materialTitle: "Farmakoterapi Hipertensi",
      academicGroup: "clinical_science",
      academicGroupLabel: "Clinical Science",
      subtopicTitle: "ACE inhibitor pada CKD",
      subtopicSummary: "Fokus terapi awal, monitoring, dan target proteksi ginjal.",
      cardCount: 2,
      sortOrder: 1,
      publishedAt: "2026-06-06T12:00:00.000Z",
    },
  ]);
  mockGetPublishedFlashCardDeck.mockResolvedValue({
    subtopicId: "subtopic-1",
    materialId: "material-1",
    materialTitle: "Farmakoterapi Hipertensi",
    academicGroup: "clinical_science",
    academicGroupLabel: "Clinical Science",
    subtopicTitle: "ACE inhibitor pada CKD",
    subtopicSummary: "Fokus terapi awal, monitoring, dan target proteksi ginjal.",
    publishedAt: "2026-06-06T12:00:00.000Z",
    cards: [
      {
        id: "card-1",
        frontText: "Kapan ACE inhibitor dipilih?",
        backText: "Saat albuminuria atau CKD yang relevan.",
        sortOrder: 1,
        savedDifficulty: null,
        lastReviewedAt: null,
      },
    ],
  });
  mockListMentorFlashCardMaterials.mockResolvedValue([
    {
      materialId: "material-1",
      title: "Farmakoterapi Hipertensi",
      academicGroup: "clinical_science",
      academicGroupLabel: "Clinical Science",
      status: "ready_for_review",
      statusLabel: "Siap direview",
      subtopicCount: 1,
      cardCount: 2,
      processingError: null,
      updatedAt: "2026-06-06T10:05:00.000Z",
      publishedAt: null,
    },
  ]);
  mockGetFlashCardMaterialDetail.mockResolvedValue({
    material: {
      id: "material-1",
      title: "Farmakoterapi Hipertensi",
      academicGroup: "clinical_science",
      academicGroupLabel: "Clinical Science",
      status: "ready_for_review",
      statusLabel: "Siap direview",
      globalSummary: "Ringkasan materi utama yang layak direview mentor.",
      processingError: null,
      publishedAt: null,
      createdAt: "2026-06-06T10:00:00.000Z",
      updatedAt: "2026-06-06T10:05:00.000Z",
    },
    sourceFiles: [],
    subtopics: [],
  });
});

describe("App router", () => {
  test("redirects root to the login page", async () => {
    renderApp("/");

    expect(
      await screen.findByText(/selamat datang/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
  });

  test("renders the reset password route", async () => {
    renderApp("/auth/reset-password");

    expect(
      await screen.findByText(/buat kata sandi baru/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
  });

  test("redirects pendaftar_baru users from /app to the subscription UI", async () => {
    setAuthenticatedSession("pendaftar_baru", "pending_review");

    renderApp("/app");

    expect(await screen.findByText(/aktifkan akses belajar/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(
      await screen.findByText(/bukti transfer sedang ditinjau/i),
    ).toBeInTheDocument();
  });

  test("redirects unauthenticated users from /app to login", async () => {
    renderApp("/app");

    expect(
      await screen.findByText(/selamat datang/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
  });

  test("redirects anonymous users away from /profile to login", async () => {
    renderApp("/profile");

    expect(
      await screen.findByText(/selamat datang/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
  });

  test("ignores legacy preview-session storage and still redirects anonymous users from /app to login", async () => {
    window.localStorage.setItem(
      "preview-session",
      JSON.stringify({
        role: "pro",
        subscriptionState: "active",
      }),
    );

    renderApp("/app");

    expect(
      await screen.findByText(/selamat datang/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
  });

  test("renders the student dashboard for active pro users", async () => {
    setAuthenticatedSession("pro", "active");

    renderApp("/app");

    expect(await screen.findByText(/fokus hari ini|kunci ulang|ringkasan hari ini/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
  });

  test("keeps legacy pro users on the student dashboard when no subscription row exists yet", async () => {
    setAuthenticatedSession("pro", "active");
    mockGetUserSubscription.mockResolvedValueOnce(null);

    renderApp("/app");

    expect(await screen.findByText(/fokus hari ini|kunci ulang|ringkasan hari ini/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
  });

  test("refreshes app access and shell role data when the window regains focus", async () => {
    setAuthenticatedSession("pro", "active");
    mockBootstrapProfile
      .mockResolvedValueOnce({
        id: "user-1",
        email: "student@example.com",
        role: "pro",
      })
      .mockResolvedValueOnce({
        id: "user-1",
        email: "student@example.com",
        role: "mentor",
      });
    mockGetUserSubscription
      .mockResolvedValueOnce({
        id: "subscription-1",
        userId: "user-1",
        packageCode: "pro_30_hari",
        state: "active",
        startsAt: "2026-05-01T00:00:00.000Z",
        endsAt: "2026-06-01T00:00:00.000Z",
      })
      .mockResolvedValueOnce({
        id: "subscription-1",
        userId: "user-1",
        packageCode: "pro_30_hari",
        state: "expired",
        startsAt: "2026-05-01T00:00:00.000Z",
        endsAt: "2026-06-01T00:00:00.000Z",
      });
    mockGetCurrentProfile
      .mockResolvedValueOnce({
        id: "user-1",
        email: "student@example.com",
        fullName: "Peserta Aktif",
        avatarUrl: null,
        role: "pro",
      })
      .mockResolvedValueOnce({
        id: "user-1",
        email: "student@example.com",
        fullName: "Mentor Aktif",
        avatarUrl: null,
        role: "mentor",
      });

    renderApp("/app");

    expect(await screen.findByText(/fokus hari ini|kunci ulang|ringkasan hari ini/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /area mentor/i })).not.toBeInTheDocument();

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    fireEvent(document, new Event("visibilitychange"));
    fireEvent(window, new Event("focus"));

    await waitFor(() => {
      expect(mockBootstrapProfile).toHaveBeenCalledTimes(2);
      expect(mockGetCurrentProfile).toHaveBeenCalledTimes(2);
    });
    expect((await screen.findAllByRole("link", {
      name: /area mentor/i,
    }))[0]).toHaveAttribute("href", "/app/area-mentor");
  });

  test("renders the student dashboard for active mentor users", async () => {
    setAuthenticatedSession("mentor", "active");

    renderApp("/app");

    expect(await screen.findByText(/fokus hari ini|kunci ulang|ringkasan hari ini/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect((await screen.findAllByRole("link", {
      name: /area mentor/i,
    }))[0]).toHaveAttribute("href", "/app/area-mentor");
  });

  test("renders the student dashboard for mentor users even when no active subscription is attached", async () => {
    setAuthenticatedSession("mentor", "expired");

    renderApp("/app");

    expect(await screen.findByText(/fokus hari ini|kunci ulang|ringkasan hari ini/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect((await screen.findAllByRole("link", { name: /area mentor/i }))[0]).toHaveAttribute("href", "/app/area-mentor");
  });

  test("shows the question generator navigation entry for mentor users only", async () => {
    setAuthenticatedSession("mentor", "active");

    renderApp("/app/area-mentor");

    expect(await screen.findByRole("link", {
      name: /penyusun soal/i,
    })).toHaveAttribute("href", "/app/question-generator");
  });

  test("does not show the question generator navigation entry for pro users", async () => {
    setAuthenticatedSession("pro", "active");

    renderApp("/app");

    expect(await screen.findByText(/fokus hari ini|kunci ulang|ringkasan hari ini/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.queryByRole("link", {
      name: /penyusun soal/i,
    })).not.toBeInTheDocument();
  });

  test("student shell navigation links to /profile", async () => {
    setAuthenticatedSession("pro", "active");

    renderApp("/app");

    expect(await screen.findByRole("link", {
      name: /profil/i,
    })).toHaveAttribute("href", "/profile");
  });

  test("student navigation links to /app/leaderboard", async () => {
    setAuthenticatedSession("pro", "active");

    renderApp("/app");

    expect(await screen.findByRole("link", {
      name: /leaderboard/i,
    })).toHaveAttribute("href", "/app/leaderboard");
  });

  test("shows the tryout selection navigation entry for pro users", async () => {
    setAuthenticatedSession("pro", "active");

    renderApp("/app");

    expect(await screen.findByRole("link", {
      name: /^try out$/i,
    })).toHaveAttribute("href", "/app/tryout-selection");
  });

  test("shows the tryout selection navigation entry for mentor users", async () => {
    setAuthenticatedSession("mentor", "active");

    renderApp("/app");

    expect(await screen.findByRole("link", {
      name: /^try out$/i,
    })).toHaveAttribute("href", "/app/tryout-selection");
  });

  test("shows the scheduled event manager navigation entry for mentor users", async () => {
    setAuthenticatedSession("mentor", "active");

    renderApp("/app");

    expect(await screen.findByRole("link", {
      name: /event terjadwal/i,
    })).toHaveAttribute("href", "/scheduled-ops/events");
  });

  test("renders the review history hub for active pro users", async () => {
    setAuthenticatedSession("pro", "active");

    renderApp("/app/review");

    expect(await screen.findByText(/riwayat pembahasan/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
  });

  test("renders the tryout selection route for active pro users", async () => {
    setAuthenticatedSession("pro", "active");

    renderApp("/app/tryout-selection");

    expect(
      await screen.findByText(/pilih mode try out/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
  });

  test("renders the welcome tutorial route for active pro users", async () => {
    setAuthenticatedSession("pro", "active");

    renderApp("/app/welcome");

    expect(
      await screen.findByText(/panduan lengkap menuju kelulusan ukai/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
  });

  test("renders the scheduled tryout catalog route for active pro users", async () => {
    setAuthenticatedSession("pro", "active");

    renderApp("/app/scheduled-tryout");

    expect(await screen.findByText(/^try out terjadwal$/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
  });

  test("renders the scheduled tryout session route for active pro users", async () => {
    setAuthenticatedSession("pro", "active");

    renderApp("/app/scheduled-tryout/session");

    expect(await screen.findByText(/sesi try out terjadwal/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
  });

  test("renders the scheduled tryout result route for active pro users", async () => {
    setAuthenticatedSession("pro", "active");

    renderApp("/app/scheduled-tryout/result");

    expect(await screen.findByText(/^hasil sesi terjadwal$/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
  });

  test("renders the scheduled event leaderboard route for pro users", async () => {
    setAuthenticatedSession("pro", "active");

    renderApp("/app/scheduled-tryout/leaderboard?event=event-1");

    expect(await screen.findByText(/peringkat event/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
  });

  test("renders the leaderboard route for pro users", async () => {
    setAuthenticatedSession("pro", "active");

    renderApp("/app/leaderboard");

    expect(await screen.findByText(/leaderboard/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
  });

  test("renders the attempt-specific review detail route for active pro users", async () => {
    setAuthenticatedSession("pro", "active");

    renderApp("/app/review/attempt-1");

    expect(await screen.findByText(/jawaban dan pembahasan/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(await screen.findByText(/apa target tekanan darah pada ckd/i)).toBeInTheDocument();
  });

  test("routes scheduled review detail requests through the scheduled review contract", async () => {
    setAuthenticatedSession("pro", "active");

    renderApp("/app/review/scheduled-attempt-1?source=scheduled");

    expect(await screen.findByText(/jawaban dan pembahasan/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(await screen.findByText(/apa antidot utama pada overdosis parasetamol/i)).toBeInTheDocument();
    expect(mockGetScheduledAttemptReviewPageData).toHaveBeenCalledWith({
      attemptId: "scheduled-attempt-1",
    });
    expect(mockGetAttemptReviewPageData).not.toHaveBeenCalled();
    expect(screen.queryByText(/apa target tekanan darah pada ckd/i)).not.toBeInTheDocument();
  });

  test("keeps expired pro users on the student dashboard", async () => {
    setAuthenticatedSession("pro", "expired");

    renderApp("/app");

    expect(await screen.findByText(/fokus hari ini|kunci ulang|ringkasan hari ini/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
  });

  test("redirects admin users from /app to the admin dashboard", async () => {
    setAuthenticatedSession("admin", "active");

    renderApp("/app");

    expect(await screen.findByText(/ringkasan admin hari ini/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
  });

  test("renders the profile page for authenticated pendaftar_baru users", async () => {
    setAuthenticatedSession("pendaftar_baru", "pending_review");

    renderApp("/profile");

    expect(
      await screen.findByText(/kelola nama tampilan, password, foto profil/i),
    ).toBeInTheDocument();
  });

  test("shows a guard error state for authenticated users when app access hydration fails", async () => {
    setAuthenticatedSessionWithGuardError("Profil akses belum bisa dimuat.");

    renderApp("/app");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /profil akses belum bisa dimuat/i,
    );
    expect(screen.queryByText(/selamat datang/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).not.toBeInTheDocument();
  });

  test("renders the admin dashboard for admin users", async () => {
    setAuthenticatedSession("admin", "active");

    renderApp("/admin");

    expect(await screen.findByText(/ringkasan admin hari ini/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
  });

  test("admin shell navigation links to /profile", async () => {
    setAuthenticatedSession("admin", "active");

    renderApp("/admin");

    expect(await screen.findByRole("link", {
      name: /profil/i,
    })).toHaveAttribute("href", "/profile");
  });

  test("admin navigation links to /admin/users", async () => {
    setAuthenticatedSession("admin", "active");

    renderApp("/admin");

    expect(await screen.findByRole("link", {
      name: /pengguna/i,
    })).toHaveAttribute("href", "/admin/users");
  });

  test("admin navigation keeps question bank but hides the removed legacy modules", async () => {
    setAuthenticatedSession("admin", "active");

    renderApp("/admin");

    expect(await screen.findByText(/ringkasan admin hari ini/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(await screen.findByRole("link", {
      name: /bank soal/i,
    })).toHaveAttribute("href", "/admin/questions");
    expect(screen.queryByRole("link", {
      name: /review queue/i,
    })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", {
      name: /references/i,
    })).not.toBeInTheDocument();
  });

  test("shows the question generator navigation entry for admin users", async () => {
    setAuthenticatedSession("admin", "active");

    renderApp("/admin");

    expect(await screen.findByRole("link", {
      name: /penyusun soal/i,
    })).toHaveAttribute("href", "/admin/question-generator");
  });

  test("keeps mentor shell navigation consistent on analytics", async () => {
    setAuthenticatedSession("mentor", "active");

    renderApp("/app/analytics");

    expect(await screen.findByRole("heading", {
      name: /area yang perlu diperbaiki/i,
    }, {
      timeout: 10000,
    })).toBeInTheDocument();
    expect((await screen.findAllByRole("link", {
      name: /area mentor/i,
    }))[0]).toHaveAttribute("href", "/app/area-mentor");
  });

  test("keeps mentor shell navigation consistent on leaderboard", async () => {
    setAuthenticatedSession("mentor", "active");

    renderApp("/app/leaderboard");

    expect(await screen.findByText(/leaderboard/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect((await screen.findAllByRole("link", {
      name: /area mentor/i,
    }))[0]).toHaveAttribute("href", "/app/area-mentor");
  });

  test("keeps mentor shell navigation consistent on review", async () => {
    setAuthenticatedSession("mentor", "active");

    renderApp("/app/review");

    expect(await screen.findByText(/riwayat pembahasan/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect((await screen.findAllByRole("link", {
      name: /area mentor/i,
    }))[0]).toHaveAttribute("href", "/app/area-mentor");
  });

  test("renders the shared question bank route for mentor users", async () => {
    setAuthenticatedSession("mentor", "active");

    renderApp("/app/questions");

    expect(await screen.findByText(/bank soal/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(await screen.findByRole("link", {
      name: /tambah soal/i,
    })).toHaveAttribute("href", "/app/questions/new");
  });

  test("renders the scheduled ops events route for mentor users", async () => {
    setAuthenticatedSession("mentor", "active");

    renderApp("/scheduled-ops/events");

    expect(await screen.findByText(/kelola event terjadwal/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(await screen.findByRole("link", {
      name: /bank soal/i,
    })).toHaveAttribute("href", "/app/questions");
    expect(await screen.findByRole("link", {
      name: /daftar event/i,
    })).toHaveAttribute("href", "/scheduled-ops/events");
    expect(await screen.findByRole("link", {
      name: /daftar event/i,
    })).toHaveAttribute("href", "/scheduled-ops/events");
    expect(await screen.findByRole("link", {
      name: /buat event/i,
    })).toHaveAttribute("href", "/scheduled-ops/events/new?fresh=1");
  });

  test("renders the mentor question create route", async () => {
    setAuthenticatedSession("mentor", "active");

    renderApp("/app/questions/new");

    expect(await screen.findByRole("heading", {
      name: /editor soal/i,
      level: 1,
    })).toBeInTheDocument();
    expect(await screen.findByLabelText(/blok/i)).toBeInTheDocument();
  });

  test("renders the mentor question edit route", async () => {
    setAuthenticatedSession("mentor", "active");
    mockGetQuestionEditorData.mockResolvedValueOnce({
      id: "question-1",
      stem: "Apa target tekanan darah pada CKD?",
      status: "draft",
      statusLabel: "Draft",
      blockId: "block-1",
      blockName: "Clinical Science",
      topicId: "topic-1",
      topicName: "Kardiologi",
      questionImagePath: null,
      questionImageUrl: null,
      explanationText: "Pembahasan singkat.",
      explanationImagePath: null,
      explanationImageUrl: null,
      options: [
        { id: "option-1", key: "A", text: "Pilihan A", isCorrect: false, sortOrder: 1 },
        { id: "option-2", key: "B", text: "Pilihan B", isCorrect: true, sortOrder: 2 },
      ],
      correctOptionKey: "B",
      updatedAt: "2026-05-03T09:15:00.000Z",
    });

    renderApp("/app/questions/question-1/edit");

    expect(await screen.findByRole("heading", {
      name: /editor soal/i,
      level: 1,
    })).toBeInTheDocument();
    expect(await screen.findByDisplayValue(/apa target tekanan darah pada ckd/i)).toBeInTheDocument();
  });

  test("renders the users page for admin users", async () => {
    setAuthenticatedSession("admin", "active");

    renderApp("/admin/users");

    expect(await screen.findByText(/kelola pengguna/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
  });

  test("renders the admin question bank route for admin users", async () => {
    setAuthenticatedSession("admin", "active");

    renderApp("/admin/questions");

    expect(await screen.findByText(/bank soal/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(await screen.findByRole("link", {
      name: /tambah soal/i,
    })).toHaveAttribute("href", "/admin/questions/new");
  });

  test("renders the admin question generator route for admin users", async () => {
    setAuthenticatedSession("admin", "active");

    renderApp("/admin/question-generator");

    expect(await screen.findByRole("heading", {
      name: /penyusun soal/i,
      level: 1,
    })).toBeInTheDocument();
    expect(
      await screen.findByText(/gunakan 1-3 soal acuan, lalu cek hasilnya sebelum disimpan ke bank soal atau sesi/i),
    ).toBeInTheDocument();
  });

  test("renders the mentor question generator route for mentor users", async () => {
    setAuthenticatedSession("mentor", "active");

    renderApp("/app/question-generator");

    expect(await screen.findByRole("heading", {
      name: /penyusun soal/i,
      level: 1,
    })).toBeInTheDocument();
  });

  test("renders the student flash card library route for active pro users", async () => {
    setAuthenticatedSession("pro", "active");

    renderApp("/app/flash-cards");

    expect(await screen.findByRole("heading", {
      name: /kartu belajar/i,
      level: 1,
    })).toBeInTheDocument();
    expect(await screen.findByText(/clinical science/i)).toBeInTheDocument();
  });

  test("renders the mentor flash card generator route only for mentor users", async () => {
    setAuthenticatedSession("mentor", "active");

    renderApp("/app/flash-card-generator");

    expect(await screen.findByRole("heading", {
      name: /penyusun flash card/i,
      level: 1,
    })).toBeInTheDocument();
    expect(await screen.findByText(/farmakoterapi hipertensi/i)).toBeInTheDocument();
  });

  test("renders the admin question create route for admin users", async () => {
    setAuthenticatedSession("admin", "active");

    renderApp("/admin/questions/new");

    expect(await screen.findByRole("heading", {
      name: /editor soal/i,
      level: 1,
    })).toBeInTheDocument();
  });

  test("renders the admin question edit route for admin users", async () => {
    setAuthenticatedSession("admin", "active");

    renderApp("/admin/questions/question-1/edit");

    expect(await screen.findByRole("heading", {
      name: /editor soal/i,
      level: 1,
    })).toBeInTheDocument();
  });

  test("redirects pro users away from the mentor question bank route", async () => {
    setAuthenticatedSession("pro", "active");

    renderApp("/app/questions");

    expect(await screen.findByText(/fokus hari ini|kunci ulang|ringkasan hari ini/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.queryByText(/bank soal/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).not.toBeInTheDocument();
  });

  test("redirects pro users away from the mentor question generator route", async () => {
    setAuthenticatedSession("pro", "active");

    renderApp("/app/question-generator");

    expect(await screen.findByText(/fokus hari ini|kunci ulang|ringkasan hari ini/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.queryByText(/penyusun soal/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).not.toBeInTheDocument();
  });

  test("redirects pro users away from the mentor flash card generator route", async () => {
    setAuthenticatedSession("pro", "active");

    renderApp("/app/flash-card-generator");

    expect(await screen.findByText(/fokus hari ini|kunci ulang|ringkasan hari ini/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.queryByText(/penyusun flash card/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).not.toBeInTheDocument();
  });

  test("redirects pro users away from the scheduled ops route", async () => {
    setAuthenticatedSession("pro", "active");

    renderApp("/scheduled-ops/events");

    expect(await screen.findByText(/fokus hari ini|kunci ulang|ringkasan hari ini/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.queryByText(/kelola event terjadwal/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).not.toBeInTheDocument();
  });

  test("keeps pro users away from the mentor question bank route", async () => {
    setAuthenticatedSession("pro", "active");

    renderApp("/app/questions/new");

    expect(await screen.findByText(/fokus hari ini|kunci ulang|ringkasan hari ini/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.queryByText(/editor soal/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).not.toBeInTheDocument();
  });

  test("renders mentor question bank instead of redirecting away from the legacy mentor route", async () => {
    setAuthenticatedSession("mentor", "active");

    renderApp("/app/questions");

    expect(await screen.findByText(/bank soal/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /tambah soal/i })).toHaveAttribute(
      "href",
      "/app/questions/new",
    );
  });

  test.each([
    "/admin/questions/upload",
    "/admin/review-queue",
    "/admin/references",
  ])("redirects legacy admin module route %s back to the admin dashboard", async (legacyPath) => {
    setAuthenticatedSession("admin", "active");

    renderApp(legacyPath);

    expect(await screen.findByText(/ringkasan admin hari ini/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.queryByText(/bank soal/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).not.toBeInTheDocument();
    expect(screen.queryByText(/review queue/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).not.toBeInTheDocument();
    expect(screen.queryByText(/reference library/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).not.toBeInTheDocument();
  });

  test("redirects pro users from /admin to the student dashboard when the subscription is active", async () => {
    setAuthenticatedSession("pro", "active");

    renderApp("/admin");

    expect(await screen.findByText(/fokus hari ini|kunci ulang|ringkasan hari ini/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
  });

  test("shows a guard error state for authenticated users when admin access hydration fails", async () => {
    setAuthenticatedSessionWithGuardError("Akses admin belum bisa diverifikasi.");

    renderApp("/admin");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /akses admin belum bisa diverifikasi/i,
    );
    expect(screen.queryByText(/selamat datang/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).not.toBeInTheDocument();
  });

  test("redirects unknown routes to the login page", async () => {
    renderApp("/does-not-exist");

    expect(
      await screen.findByText(/selamat datang/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
  });
});
