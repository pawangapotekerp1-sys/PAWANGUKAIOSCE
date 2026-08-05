import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TryoutBlockSelectionPage from "./tryout-block-selection-page";
import * as api from "../../lib/api/tryout-api";

vi.mock("../../components/layout/product-shell", () => ({
  default: ({ children }: React.PropsWithChildren<{}>) => <div data-testid="product-shell">{children}</div>,
}));

vi.mock("../../lib/auth/use-session", () => ({
  useSession: () => ({ user: { id: "test-user" } }),
}));

vi.mock("./use-student-shell", () => ({
  useStudentShell: () => ({ tierLabel: "Pro", navItems: [] }),
}));

vi.mock("../../lib/api/tryout-api", () => ({
  listTryoutCatalogEntries: vi.fn(),
}));

describe("TryoutBlockSelectionPage", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <TryoutBlockSelectionPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it("renders block selection title and filters modes correctly", async () => {
    vi.mocked(api.listTryoutCatalogEntries).mockResolvedValue([
      { id: "1", title: "Clinical Science (CS)", blockId: "cs", mode: "block", isStartable: true, sessionTemplateId: "cs-1" } as any,
      { id: "2", title: "Pharmaceutical Science (PS)", blockId: "ps", mode: "block", isStartable: true, sessionTemplateId: "ps-1" } as any,
      { id: "3", title: "Social, Behavioral & Administrative", blockId: "sba", mode: "block", isStartable: true, sessionTemplateId: "sba-1" } as any,
      { id: "4", title: "Not a block", blockId: "none", mode: "exam", isStartable: true, sessionTemplateId: "exam-1" } as any,
      { id: "5", title: "Try Out Acak Seluruh Blok", blockId: "full-1", mode: "full", isStartable: true, sessionTemplateId: "full-1" } as any,
    ]);

    renderComponent();

    // Verify it doesn't crash and titles are displayed once data loads
    expect(screen.getByText("Latihan Try Out Per Blok")).toBeInTheDocument();
    
    // Check elements after loading
    expect(await screen.findByText("Clinical Science (CS)")).toBeInTheDocument();
    expect(screen.getByText("Pharmaceutical Science (PS)")).toBeInTheDocument();
    expect(screen.getByText("Social, Behavioral & Administrative")).toBeInTheDocument();
    expect(screen.getByText("Try Out Acak Seluruh Blok")).toBeInTheDocument();

    // Ensure non-block/non-full is filtered out
    expect(screen.queryByText("Not a block")).not.toBeInTheDocument();
  });

  it("renders loading state", () => {
    vi.mocked(api.listTryoutCatalogEntries).mockImplementation(() => new Promise(() => {}));

    renderComponent();

    expect(screen.getByText("Latihan Try Out Per Blok")).toBeInTheDocument();
    expect(screen.queryByText("Clinical Science (CS)")).not.toBeInTheDocument();
    expect(screen.queryByText("Belum ada data blok try out yang tersedia.")).not.toBeInTheDocument();
  });

  it("renders error state", async () => {
    vi.mocked(api.listTryoutCatalogEntries).mockRejectedValue(new Error("API Error"));

    renderComponent();

    expect(await screen.findByText("Gagal Memuat Data")).toBeInTheDocument();
    expect(screen.getByText("Terjadi kesalahan saat memuat pilihan blok try out. Silakan coba beberapa saat lagi.")).toBeInTheDocument();
  });

  it("renders empty state", async () => {
    vi.mocked(api.listTryoutCatalogEntries).mockResolvedValue([]);

    renderComponent();

    expect(await screen.findByText("Belum ada data blok try out yang tersedia.")).toBeInTheDocument();
  });
});
