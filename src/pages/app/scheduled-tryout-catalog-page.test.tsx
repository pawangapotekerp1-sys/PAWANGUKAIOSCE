import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { BookOpenCheck, CircleGauge, FileCheck2 } from "lucide-react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import ScheduledTryoutCatalogPage from "./scheduled-tryout-catalog-page";

const mockUseSession = vi.fn();
const mockUseStudentShell = vi.fn();
const mockListScheduledTryoutCatalogEntries = vi.fn();
const mockFindActiveScheduledAttemptForUser = vi.fn();

vi.mock("../../lib/auth/use-session", () => ({
  useSession: () => mockUseSession(),
}));

vi.mock("./use-student-shell", () => ({
  useStudentShell: (...args: unknown[]) => mockUseStudentShell(...args),
}));

vi.mock("../../lib/api/scheduled-tryout-api", () => ({
  listScheduledTryoutCatalogEntries: (...args: unknown[]) => mockListScheduledTryoutCatalogEntries(...args),
  findActiveScheduledAttemptForUser: (...args: unknown[]) => mockFindActiveScheduledAttemptForUser(...args),
}));

function renderScheduledCatalog() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/app/scheduled-tryout"]}>
        <ScheduledTryoutCatalogPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function createDeferredPromise<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function getScheduledCatalogArticles() {
  const scheduledSection = screen.getByText(/^try out terjadwal$/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }).closest("section");

  expect(scheduledSection).not.toBeNull();

  const cards = scheduledSection!.querySelectorAll('[data-slot="card"]');
  if (cards.length === 0) {
    throw new Error('Unable to find an element with data-slot="card"');
  }
  return Array.from(cards) as HTMLElement[];
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
  mockUseStudentShell.mockReturnValue({
    navItems: [
      { href: "/app", label: "Ringkasan", icon: CircleGauge, active: false },
      { href: "/app/tryout-selection", label: "Try Out", icon: FileCheck2, active: true },
      { href: "/app/review", label: "Review", icon: BookOpenCheck, active: false },
    ],
    tierLabel: "Pro",
    role: "pro",
  });
  mockFindActiveScheduledAttemptForUser.mockResolvedValue(null);
  mockListScheduledTryoutCatalogEntries.mockResolvedValue([
    {
      id: "event-1",
      title: "TO Klinik Juni",
      description: "Jendela aktif untuk peserta pro.",
      accessStartAt: "2026-06-09T00:00:00.000Z",
      accessEndAt: "2026-06-10T12:00:00.000Z",
      currentCycle: 2,
      questionCount: 40,
      durationMinutes: 40,
      remainingAttempts: 2,
      submittedAttemptCount: 1,
      hasActiveAttempt: false,
    },
    {
      id: "event-2",
      title: "TO Farmasi Klinik",
      description: "Simulasi farmasi klinik yang aktif bersamaan.",
      accessStartAt: "2026-06-09T02:00:00.000Z",
      accessEndAt: "2026-06-10T14:00:00.000Z",
      currentCycle: 1,
      questionCount: 25,
      durationMinutes: 25,
      remainingAttempts: 3,
      submittedAttemptCount: 0,
      hasActiveAttempt: false,
    },
  ]);
});

describe("Scheduled tryout catalog page", () => {
  test("renders the scheduled heading and multiple active events together", async () => {
    renderScheduledCatalog();

    expect(await screen.findByText(/^try out terjadwal$/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.getByText(/pilih sesi yang sedang dibuka atau lanjutkan sesi yang tertunda/i)).toBeInTheDocument();
    expect(await screen.findByText(/to klinik juni/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.getByText(/to farmasi klinik/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.getByText("40 soal")).toBeInTheDocument();
    expect(screen.getByText("25 soal")).toBeInTheDocument();
    expect(screen.getByText("2 dari 5 attempt tersisa")).toBeInTheDocument();
    const startLinks = screen.getAllByRole("link", { name: /mulai sekarang/i });
    expect(startLinks[0]).toHaveAttribute(
      "href",
      "/app/scheduled-tryout/session?event=event-1",
    );
    expect(startLinks.every((link) => link.getAttribute("data-variant") === "primary")).toBe(true);
    expect(screen.getAllByRole("link", { name: /lihat leaderboard/i })[0]).toHaveAttribute(
      "href",
      "/app/scheduled-tryout/leaderboard?event=event-1",
    );
    expect(screen.getAllByRole("link", { name: /lihat leaderboard/i }).every((link) => link.getAttribute("data-variant") === "outline")).toBe(true);
  });

  test("shows a lanjutkan panel when an active scheduled attempt exists", async () => {
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

    renderScheduledCatalog();

    const resumeLink = await screen.findByRole("link", { name: /lanjutkan sesi/i });
    const [resumeSurface, ...remainingEventSurfaces] = getScheduledCatalogArticles();
    const remainingStartLinks = remainingEventSurfaces.flatMap((surface) =>
      within(surface).queryAllByRole("link", { name: /mulai sekarang/i }),
    );

    expect(
      resumeSurface.compareDocumentPosition(remainingEventSurfaces[0]) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByText(/lanjutkan sesi yang tertunda tanpa mulai dari awal/i)).toBeInTheDocument();
    expect(screen.getByText(/12 dari 40 soal terjawab/i)).toBeInTheDocument();
    expect(screen.getByText(/timer sesi 00:30:00/i)).toBeInTheDocument();
    expect(resumeLink).toHaveAttribute(
      "href",
      "/app/scheduled-tryout/session?attempt=scheduled-attempt-1",
    );
    expect(resumeLink).toHaveAttribute("data-variant", "primary");
    expect(screen.getAllByRole("link", { name: /lanjutkan sesi/i })).toHaveLength(1);
    expect(within(resumeSurface).getAllByRole("link", { name: /lanjutkan sesi/i })).toHaveLength(1);
    expect(remainingStartLinks).toHaveLength(1);
    expect(remainingStartLinks[0]).toHaveAttribute(
      "href",
      "/app/scheduled-tryout/session?event=event-2",
    );
  });

  test("filters the resumed event out of the remaining active event list without changing source order", async () => {
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
    mockListScheduledTryoutCatalogEntries.mockResolvedValueOnce([
      {
        id: "event-1",
        title: "TO Klinik Juni",
        description: "Jendela aktif untuk peserta pro.",
        accessStartAt: "2026-06-09T00:00:00.000Z",
        accessEndAt: "2026-06-10T12:00:00.000Z",
        currentCycle: 2,
        questionCount: 40,
        durationMinutes: 40,
        remainingAttempts: 2,
        submittedAttemptCount: 1,
        hasActiveAttempt: false,
      },
      {
        id: "event-2",
        title: "TO Farmasi Klinik",
        description: "Simulasi farmasi klinik yang aktif bersamaan.",
        accessStartAt: "2026-06-09T02:00:00.000Z",
        accessEndAt: "2026-06-10T14:00:00.000Z",
        currentCycle: 1,
        questionCount: 25,
        durationMinutes: 25,
        remainingAttempts: 3,
        submittedAttemptCount: 0,
        hasActiveAttempt: false,
      },
      {
        id: "event-3",
        title: "TO Profesi Komunitas",
        description: "Sesi lanjutan untuk bidang komunitas.",
        accessStartAt: "2026-06-09T04:00:00.000Z",
        accessEndAt: "2026-06-10T16:00:00.000Z",
        currentCycle: 1,
        questionCount: 30,
        durationMinutes: 30,
        remainingAttempts: 1,
        submittedAttemptCount: 0,
        hasActiveAttempt: false,
      },
    ]);

    renderScheduledCatalog();

    await screen.findByRole("link", { name: /lanjutkan sesi/i });
    const [resumeSurface, ...remainingEventSurfaces] = getScheduledCatalogArticles();

    expect(within(resumeSurface).getByText(/to klinik juni/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(
      remainingEventSurfaces.every(
        (surface) => within(surface).queryByText(/to klinik juni/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }) === null,
      ),
    ).toBe(true);

    const startLinks = screen.getAllByRole("link", { name: /mulai sekarang/i });
    expect(startLinks).toHaveLength(2);
    expect(startLinks[0]).toHaveAttribute(
      "href",
      "/app/scheduled-tryout/session?event=event-2",
    );
    expect(startLinks[1]).toHaveAttribute(
      "href",
      "/app/scheduled-tryout/session?event=event-3",
    );
    expect(
      startLinks.some(
        (link) => link.getAttribute("href") === "/app/scheduled-tryout/session?event=event-1",
      ),
    ).toBe(false);

    const event2Heading = within(remainingEventSurfaces[0]).getByText(/to farmasi klinik/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' });
    const event3Heading = within(remainingEventSurfaces[1]).getByText(/to profesi komunitas/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' });
    expect(
      event2Heading.compareDocumentPosition(event3Heading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  test("does not show a stale start CTA for the resumed event while active attempt state is still pending", async () => {
    const catalogDeferred = createDeferredPromise<
      Array<{
        id: string;
        title: string;
        description: string;
        accessStartAt: string;
        accessEndAt: string;
        currentCycle: number;
        questionCount: number;
        durationMinutes: number;
        remainingAttempts: number;
        submittedAttemptCount: number;
        hasActiveAttempt: boolean;
      }>
    >();
    const activeAttemptDeferred = createDeferredPromise<{
      attemptId: string;
      eventId: string;
      status: "paused";
      title: string;
      answeredCount: number;
      totalQuestions: number;
      timeRemainingSeconds: number;
      accessEndAt: string;
    } | null>();

    mockListScheduledTryoutCatalogEntries.mockReturnValueOnce(catalogDeferred.promise);
    mockFindActiveScheduledAttemptForUser.mockReturnValueOnce(activeAttemptDeferred.promise);

    renderScheduledCatalog();

    expect(await screen.findByText(/^try out terjadwal$/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.getByText(/daftar sesi sedang dimuat/i)).toBeInTheDocument();

    await act(async () => {
      catalogDeferred.resolve([
        {
          id: "event-1",
          title: "TO Klinik Juni",
          description: "Jendela aktif untuk peserta pro.",
          accessStartAt: "2026-06-09T00:00:00.000Z",
          accessEndAt: "2026-06-10T12:00:00.000Z",
          currentCycle: 2,
          questionCount: 40,
          durationMinutes: 40,
          remainingAttempts: 2,
          submittedAttemptCount: 1,
          hasActiveAttempt: false,
        },
        {
          id: "event-2",
          title: "TO Farmasi Klinik",
          description: "Simulasi farmasi klinik yang aktif bersamaan.",
          accessStartAt: "2026-06-09T02:00:00.000Z",
          accessEndAt: "2026-06-10T14:00:00.000Z",
          currentCycle: 1,
          questionCount: 25,
          durationMinutes: 25,
          remainingAttempts: 3,
          submittedAttemptCount: 0,
          hasActiveAttempt: false,
        },
      ]);
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByText(/daftar sesi sedang dimuat/i)).toBeInTheDocument();
    expect(
      screen
        .queryAllByRole("link", { name: /mulai sekarang/i })
        .some((link) => link.getAttribute("href") === "/app/scheduled-tryout/session?event=event-1"),
    ).toBe(false);

    activeAttemptDeferred.resolve({
      attemptId: "scheduled-attempt-1",
      eventId: "event-1",
      status: "paused",
      title: "TO Klinik Juni",
      answeredCount: 12,
      totalQuestions: 40,
      timeRemainingSeconds: 1800,
      accessEndAt: "2026-06-10T12:00:00.000Z",
    });

    const resumeLink = await screen.findByRole("link", { name: /lanjutkan sesi/i });
    const remainingStartLinks = screen.getAllByRole("link", { name: /mulai sekarang/i });

    expect(resumeLink).toHaveAttribute(
      "href",
      "/app/scheduled-tryout/session?attempt=scheduled-attempt-1",
    );
    expect(remainingStartLinks).toHaveLength(1);
    expect(remainingStartLinks[0]).toHaveAttribute(
      "href",
      "/app/scheduled-tryout/session?event=event-2",
    );
  });

  test("shows the catalog error state even while active attempt state is still pending", async () => {
    const activeAttemptDeferred = createDeferredPromise<{
      attemptId: string;
      eventId: string;
      status: "paused";
      title: string;
      answeredCount: number;
      totalQuestions: number;
      timeRemainingSeconds: number;
      accessEndAt: string;
    } | null>();

    mockListScheduledTryoutCatalogEntries.mockRejectedValueOnce(new Error("failed"));
    mockFindActiveScheduledAttemptForUser.mockReturnValueOnce(activeAttemptDeferred.promise);

    renderScheduledCatalog();

    expect(await screen.findByText(/daftar sesi belum bisa dimuat/i)).toBeInTheDocument();
    expect(screen.getByText(/coba lagi sebentar/i)).toBeInTheDocument();
    expect(screen.queryByText(/daftar sesi sedang dimuat/i)).not.toBeInTheDocument();
  });

  test("shows the catalog empty state even while active attempt state is still pending", async () => {
    const activeAttemptDeferred = createDeferredPromise<{
      attemptId: string;
      eventId: string;
      status: "paused";
      title: string;
      answeredCount: number;
      totalQuestions: number;
      timeRemainingSeconds: number;
      accessEndAt: string;
    } | null>();

    mockListScheduledTryoutCatalogEntries.mockResolvedValueOnce([]);
    mockFindActiveScheduledAttemptForUser.mockReturnValueOnce(activeAttemptDeferred.promise);

    renderScheduledCatalog();

    expect(await screen.findByText(/belum ada sesi aktif/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.getByText(/belum ada sesi yang bisa diikuti saat ini/i)).toBeInTheDocument();
    expect(screen.queryByText(/daftar sesi sedang dimuat/i)).not.toBeInTheDocument();
  });

  test("shows a disabled explanation when no attempts remain", async () => {
    mockListScheduledTryoutCatalogEntries.mockResolvedValueOnce([
      {
        id: "event-1",
        title: "TO Klinik Juni",
        description: "Jendela aktif untuk peserta pro.",
        accessStartAt: "2026-06-09T00:00:00.000Z",
        accessEndAt: "2026-06-10T12:00:00.000Z",
        currentCycle: 2,
        questionCount: 40,
        durationMinutes: 40,
        remainingAttempts: 0,
        submittedAttemptCount: 5,
        hasActiveAttempt: false,
      },
    ]);

    renderScheduledCatalog();

    const disabledStartButton = await screen.findByRole("button", { name: /mulai sesi/i });
    expect(disabledStartButton).toBeDisabled();
    expect(disabledStartButton).toHaveAttribute("data-variant", "secondary");
    expect(screen.getByText(/kesempatan event ini sudah habis/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /lihat leaderboard/i })).toHaveAttribute(
      "href",
      "/app/scheduled-tryout/leaderboard?event=event-1",
    );
    expect(screen.getByRole("link", { name: /lihat leaderboard/i })).toHaveAttribute("data-variant", "outline");
  });

  test("shows shorter loading, error, and empty states", async () => {
    mockListScheduledTryoutCatalogEntries.mockImplementationOnce(() => new Promise(() => {}));
    renderScheduledCatalog();

    expect(screen.getByText(/^try out terjadwal$/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.getByText(/daftar sesi sedang dimuat/i)).toBeInTheDocument();
    expect(screen.getByText(/sesi terjadwal sedang disiapkan/i)).toBeInTheDocument();

    cleanup();

    mockListScheduledTryoutCatalogEntries.mockRejectedValueOnce(new Error("failed"));
    renderScheduledCatalog();

    expect(screen.getByText(/^try out terjadwal$/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(await screen.findByText(/daftar sesi belum bisa dimuat/i)).toBeInTheDocument();
    expect(screen.getByText(/coba lagi sebentar/i)).toBeInTheDocument();

    cleanup();

    mockListScheduledTryoutCatalogEntries.mockResolvedValueOnce([]);
    renderScheduledCatalog();

    expect(screen.getByText(/^try out terjadwal$/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(await screen.findByText(/belum ada sesi aktif/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.getByText(/belum ada sesi yang bisa diikuti saat ini/i)).toBeInTheDocument();
  });
});
