import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import FlashCardsPage from "./flash-cards-page";

const mockListPublishedFlashCardSubtopics = vi.fn();

vi.mock("../../lib/api/flash-card-api", () => ({
  listPublishedFlashCardSubtopics: (...args: unknown[]) => mockListPublishedFlashCardSubtopics(...args),
}));

vi.mock("./use-student-shell", () => ({
  useStudentShell: () => ({
    navItems: [],
    tierLabel: "Pro",
  }),
}));

function renderPage(initialRoute = "/app/flash-cards") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <FlashCardsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
  mockListPublishedFlashCardSubtopics.mockResolvedValue([
    {
      subtopicId: "subtopic-1",
      materialId: "material-1",
      materialTitle: "Farmakoterapi Hipertensi",
      academicGroup: "pharmaceutical_science",
      academicGroupLabel: "Pharmaceutical Science",
      subtopicTitle: "Stabilitas sediaan",
      subtopicSummary: "Sorotan stabilitas pada formulasi yang relevan.",
      cardCount: 2,
      sortOrder: 1,
      publishedAt: "2026-06-06T12:00:00.000Z",
    },
    {
      subtopicId: "subtopic-2",
      materialId: "material-2",
      materialTitle: "Farmakoterapi Hipertensi",
      academicGroup: "clinical_science",
      academicGroupLabel: "Clinical Science",
      subtopicTitle: "ACE inhibitor pada CKD",
      subtopicSummary: "Fokus terapi awal, monitoring, dan target proteksi ginjal.",
      cardCount: 2,
      sortOrder: 1,
      publishedAt: "2026-06-06T12:00:00.000Z",
    },
    {
      subtopicId: "subtopic-3",
      materialId: "material-3",
      materialTitle: "Komunikasi terapi",
      academicGroup: "social_behavioral_and_administration",
      academicGroupLabel: "Social Behavioral and Administration",
      subtopicTitle: "Teach-back pasien",
      subtopicSummary: "Teknik recall untuk memastikan pasien benar-benar paham.",
      cardCount: 2,
      sortOrder: 1,
      publishedAt: "2026-06-06T12:00:00.000Z",
    },
  ]);
});

describe("FlashCardsPage", () => {
  test("renders published subtopics with filter tabs and rich cards", async () => {
    renderPage();

    expect(await screen.findByText(/latihan mandiri/i)).toBeInTheDocument();
    expect(await screen.findByText(/kartu belajar/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.getByText(/pilih submateri lalu ulang poin penting/i)).toBeInTheDocument();
    
    // Filter tabs should be present
    expect(await screen.findByRole("button", { name: /Semua Kelompok \(3\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Pharmaceutical Science/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Clinical Science/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Social Behavioral and Administration/i })).toBeInTheDocument();

    // Cards should be rendered with links containing Mulai Belajar
    const links = screen.getAllByRole("link", { name: /mulai belajar/i });
    expect(links.length).toBe(3);
    
    expect(links[0]).toHaveAttribute("href", "/app/flash-cards/subtopic-1");
    expect(links[1]).toHaveAttribute("href", "/app/flash-cards/subtopic-2");
    expect(links[2]).toHaveAttribute("href", "/app/flash-cards/subtopic-3");

    // Titles of subtopics should be present
    expect(screen.getByText(/stabilitas sediaan/i)).toBeInTheDocument();
    expect(screen.getByText(/ace inhibitor pada ckd/i)).toBeInTheDocument();
    expect(screen.getByText(/teach-back pasien/i)).toBeInTheDocument();
  });

  test("filters cards by URL query parameter", async () => {
    // Initial route has ?group=Clinical Science
    renderPage("/app/flash-cards?group=Clinical%20Science");

    // Wait for the tab to appear and the data to load
    expect(await screen.findByRole("button", { name: /Clinical Science/i })).toBeInTheDocument();

    // Should only show Clinical Science items
    expect(screen.getByText(/ace inhibitor pada ckd/i)).toBeInTheDocument();
    expect(screen.queryByText(/stabilitas sediaan/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/teach-back pasien/i)).not.toBeInTheDocument();
  });

  test("filters cards when clicking on tabs", async () => {
    renderPage();

    expect(await screen.findByText(/stabilitas sediaan/i)).toBeInTheDocument();

    // Click on Clinical Science tab
    const clinicalTab = screen.getByRole("button", { name: /Clinical Science/i });
    fireEvent.click(clinicalTab);

    // Only Clinical Science items should be visible
    expect(screen.getByText(/ace inhibitor pada ckd/i)).toBeInTheDocument();
    expect(screen.queryByText(/stabilitas sediaan/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/teach-back pasien/i)).not.toBeInTheDocument();
    
    // Click on Semua tab
    const allTab = screen.getByRole("button", { name: /Semua Kelompok \(3\)/i });
    fireEvent.click(allTab);

    // All items should be visible
    expect(screen.getByText(/stabilitas sediaan/i)).toBeInTheDocument();
    expect(screen.getByText(/ace inhibitor pada ckd/i)).toBeInTheDocument();
  });

  test("shows localized error copy for the flash card library", async () => {
    mockListPublishedFlashCardSubtopics.mockRejectedValueOnce(new Error("failed"));
    renderPage();

    expect(
      await screen.findByText("Kartu belajar belum bisa dimuat"),
    ).toBeInTheDocument();
    expect(screen.getByText(/coba lagi sebentar/i)).toBeInTheDocument();
  });
  test("shows empty state when no cards match the filter", async () => {
    renderPage("/app/flash-cards?group=UnknownGroup");

    expect(
      await screen.findByText(/belum ada materi di kelompok ini/i),
    ).toBeInTheDocument();
  });
});
