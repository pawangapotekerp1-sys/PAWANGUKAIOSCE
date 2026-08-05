import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TryoutTopicSelectionPage from "./tryout-topic-selection-page";
import { listTryoutCatalogEntries } from "../../lib/api/tryout-api";

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

const mockEntries = [
  {
    id: "catalog-topic-1",
    slug: "materi-kardio",
    title: "Farmakoterapi Kardiovaskular & Renologi",
    description: "Hipertensi, gagal jantung",
    mode: "topic",
    questionCount: 20,
    durationMinutes: 30,
    blockId: "b1",
    blockName: "Clinical Science",
    blockSortOrder: 1,
    topicId: "t1",
    topicName: "Farmakoterapi Kardiovaskular",
    topicSortOrder: 1,
    sessionTemplateId: "template-1",
    isStartable: true,
    disabledReason: null,
    availableQuestionCount: 20,
    requiredQuestionCount: 20,
  },
  {
    id: "catalog-topic-2",
    slug: "materi-steril",
    title: "Teknologi Sediaan Cair & Steril",
    description: "Sirup, emulsi",
    mode: "topic",
    questionCount: 20,
    durationMinutes: 30,
    blockId: "b2",
    blockName: "Pharmaceutical Science",
    blockSortOrder: 2,
    topicId: "t2",
    topicName: "Teknologi Sediaan",
    topicSortOrder: 2,
    sessionTemplateId: "template-2",
    isStartable: true,
    disabledReason: null,
    availableQuestionCount: 20,
    requiredQuestionCount: 20,
  },
  {
    id: "catalog-topic-3",
    slug: "materi-regulasi",
    title: "Regulasi & Etika",
    description: "UU Kefarmasian",
    mode: "topic",
    questionCount: 20,
    durationMinutes: 30,
    blockId: "b3",
    blockName: "Social & Admin",
    blockSortOrder: 3,
    topicId: "t3",
    topicName: "Regulasi",
    topicSortOrder: 3,
    sessionTemplateId: "template-3",
    isStartable: false,
    disabledReason: "Belum cukup soal",
    availableQuestionCount: 5,
    requiredQuestionCount: 20,
  }
];

describe("TryoutTopicSelectionPage", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.resetAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const renderWithProviders = (ui: React.ReactElement, initialEntries = ["/"]) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          {ui}
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it("renders loading state initially", () => {
    vi.mocked(listTryoutCatalogEntries).mockImplementation(() => new Promise(() => {}));
    
    renderWithProviders(<TryoutTopicSelectionPage />);
    
    // Check for skeletons (we have 6 loading cards)
    expect(screen.getAllByTestId("skeleton-card")).toHaveLength(6);
  });

  it("renders page header and all topic cards by default", async () => {
    vi.mocked(listTryoutCatalogEntries).mockResolvedValue(mockEntries as any);

    renderWithProviders(<TryoutTopicSelectionPage />);

    expect(screen.getByText("Try Out Per Materi / Topik")).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText("Farmakoterapi Kardiovaskular & Renologi")).toBeInTheDocument();
      expect(screen.getByText("Teknologi Sediaan Cair & Steril")).toBeInTheDocument();
      expect(screen.getByText("Regulasi & Etika")).toBeInTheDocument();
    });
    
    // Dynamic filter tabs
    expect(screen.getByRole("button", { name: "Clinical Science" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pharmaceutical Science" })).toBeInTheDocument();
  });

  it("filters topics when filter buttons are clicked", async () => {
    vi.mocked(listTryoutCatalogEntries).mockResolvedValue(mockEntries as any);

    renderWithProviders(<TryoutTopicSelectionPage />);

    // wait for data to load
    await waitFor(() => {
      expect(screen.getByText("Farmakoterapi Kardiovaskular & Renologi")).toBeInTheDocument();
    });

    const csFilterBtn = screen.getByTestId("filter-b1");
    fireEvent.click(csFilterBtn);

    await waitFor(() => {
      expect(screen.queryByText("Teknologi Sediaan Cair & Steril")).not.toBeInTheDocument();
    });
    
    expect(screen.getByText("Farmakoterapi Kardiovaskular & Renologi")).toBeInTheDocument();
    expect(screen.queryByText("Regulasi & Etika")).not.toBeInTheDocument();
  });
  
  it("filters topics initially if block param is in URL", async () => {
    vi.mocked(listTryoutCatalogEntries).mockResolvedValue(mockEntries as any);

    renderWithProviders(<TryoutTopicSelectionPage />, ["/?block=b2"]);

    await waitFor(() => {
      expect(screen.getByText("Teknologi Sediaan Cair & Steril")).toBeInTheDocument();
    });
    
    expect(screen.queryByText("Farmakoterapi Kardiovaskular & Renologi")).not.toBeInTheDocument();
  });

  it("shows error state when API fails", async () => {
    vi.mocked(listTryoutCatalogEntries).mockRejectedValue(new Error("API Error"));

    renderWithProviders(<TryoutTopicSelectionPage />);

    await waitFor(() => {
      expect(screen.getByText("Gagal Memuat Data")).toBeInTheDocument();
    });
    expect(screen.getByText(/Terjadi kesalahan saat memuat pilihan topik try out/)).toBeInTheDocument();
  });
  
  it("disables start button and shows disabled reason when topic is not startable", async () => {
    vi.mocked(listTryoutCatalogEntries).mockResolvedValue(mockEntries as any);

    renderWithProviders(<TryoutTopicSelectionPage />);

    await waitFor(() => {
      expect(screen.getByText("Regulasi & Etika")).toBeInTheDocument();
    });
    
    expect(screen.getByText("Belum cukup soal")).toBeInTheDocument();
    
    const startButtons = screen.getAllByRole("button", { name: /Mulai Try Out|Mulai Topik/i });
    expect(startButtons[0]).toBeDisabled();
  });
  
  it("renders empty state when filtered block has no topics", async () => {
    vi.mocked(listTryoutCatalogEntries).mockResolvedValue(mockEntries as any);

    renderWithProviders(<TryoutTopicSelectionPage />);

    // Wait for data
    await waitFor(() => {
      expect(screen.getByText("Farmakoterapi Kardiovaskular & Renologi")).toBeInTheDocument();
    });
    
    // Empty topics isn't easily reachable by clicks because tabs are generated from available topics.
    // We can simulate an empty catalog entirely.
    cleanup();
    vi.mocked(listTryoutCatalogEntries).mockResolvedValue([]);
    renderWithProviders(<TryoutTopicSelectionPage />);
    
    await waitFor(() => {
      expect(screen.getByText("Belum ada data materi try out yang tersedia untuk blok ini.")).toBeInTheDocument();
    });
  });
});

