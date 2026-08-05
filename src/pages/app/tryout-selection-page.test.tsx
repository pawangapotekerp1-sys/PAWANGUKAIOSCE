import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import TryoutSelectionPage from "./tryout-selection-page";
import { findActiveAttemptForUser } from "../../lib/api/tryout-api";

// Mock ProductShell and auth hooks to simplify testing
vi.mock("../../components/layout/product-shell", () => ({
  default: ({ children }: React.PropsWithChildren<{}>) => <div data-testid="product-shell">{children}</div>,
}));
vi.mock("../../lib/auth/use-session", () => ({
  useSession: vi.fn(() => ({ user: { id: "test-user" } })),
}));
vi.mock("./use-student-shell", () => ({
  useStudentShell: () => ({ tierLabel: "Pro", navItems: [] }),
}));
vi.mock("../../lib/api/tryout-api", () => ({
  findActiveAttemptForUser: vi.fn(),
}));

describe("TryoutSelectionPage", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const renderWithProviders = () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <TryoutSelectionPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it("renders selection cards", () => {
    vi.mocked(findActiveAttemptForUser).mockResolvedValue(null);

    renderWithProviders();
    expect(screen.getByText("Pilih Mode Try Out")).toBeInTheDocument();
    expect(screen.getByText("Unlimited")).toBeInTheDocument();
    expect(screen.getByText("Terjadwal")).toBeInTheDocument();
  });

  it("shows active tryout card if there is an active session", async () => {
    vi.mocked(findActiveAttemptForUser).mockResolvedValue({
      attemptId: "attempt-1",
      status: "in_progress",
      title: "TO Nasional #1",
      mode: "full",
      answeredCount: 15,
      totalQuestions: 50,
      timeRemainingSeconds: 3600,
    });

    renderWithProviders();
    
    expect(await screen.findByText("Lanjutkan Try Out")).toBeInTheDocument();
    expect(screen.getByText("TO Nasional #1")).toBeInTheDocument();
    expect(screen.getByText(/15/)).toBeInTheDocument();
    expect(screen.getByText(/50 Soal/)).toBeInTheDocument();
  });

  it("hides active tryout card if there is no active session", async () => {
    vi.mocked(findActiveAttemptForUser).mockResolvedValue(null);

    renderWithProviders();

    expect(await screen.findByText("Pilih Mode Try Out")).toBeInTheDocument();
    expect(screen.queryByText("Lanjutkan Try Out")).not.toBeInTheDocument();
  });

  it("hides active tryout card if session status is completed", async () => {
    vi.mocked(findActiveAttemptForUser).mockResolvedValue({
      attemptId: "attempt-1",
      // @ts-expect-error Mocking a completed status even though the type might only allow in_progress or paused depending on definition, but API might return it
      status: "completed",
      title: "TO Nasional #1",
      mode: "full",
      answeredCount: 50,
      totalQuestions: 50,
      timeRemainingSeconds: 0,
    });

    renderWithProviders();

    expect(await screen.findByText("Pilih Mode Try Out")).toBeInTheDocument();
    expect(screen.queryByText("Lanjutkan Try Out")).not.toBeInTheDocument();
  });
});
