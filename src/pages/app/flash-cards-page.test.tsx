import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import FlashCardsPage from "./flash-cards-page";

const mockListPublishedFlashCardSubtopics = vi.fn();

vi.mock("../../lib/api/flash-card-api", () => ({
  listPublishedFlashCardSubtopics: (...args: unknown[]) =>
    mockListPublishedFlashCardSubtopics(...args),
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
      materialTitle: "Sediaan Solid",
      academicGroup: "pharmaceutical_science",
      academicGroupLabel: "Pharmaceutical Science",
      subtopicTitle: "Sediaan Solid",
      subtopicSummary:
        "Bentuk Sediaan Solid dan Klasifikasi Tablet • Eksipien dan Formulasi Tablet",
      cardCount: 25,
      sortOrder: 1,
      publishedAt: "2026-06-06T12:00:00.000Z",
    },
    {
      subtopicId: "subtopic-2",
      materialId: "material-2",
      materialTitle: "Farmakoterapi Hipertensi",
      academicGroup: "clinical_science",
      academicGroupLabel: "Clinical Science",
      subtopicTitle: "Farmakoterapi Hipertensi",
      subtopicSummary: "Fokus terapi awal, monitoring, dan target proteksi ginjal.",
      cardCount: 12,
      sortOrder: 1,
      publishedAt: "2026-06-06T12:00:00.000Z",
    },
    {
      subtopicId: "subtopic-3",
      materialId: "material-3",
      materialTitle: "Komunikasi Terapi",
      academicGroup: "social_behavioral_and_administration",
      academicGroupLabel: "Social Behavioral and Administration",
      subtopicTitle: "Komunikasi Terapi",
      subtopicSummary: "Teknik recall untuk memastikan pasien benar-benar paham.",
      cardCount: 8,
      sortOrder: 1,
      publishedAt: "2026-06-06T12:00:00.000Z",
    },
  ]);
});

describe("FlashCardsPage", () => {
  test("renders the 3 academic block selection cards first without filter tabs", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", { name: /kartu belajar/i, level: 1 }),
    ).toBeInTheDocument();

    expect(screen.getByText("Clinical Science")).toBeInTheDocument();
    expect(screen.getByText("Pharmaceutical Science")).toBeInTheDocument();
    expect(
      screen.getByText("Social Behavioural Administration of Pharmacy"),
    ).toBeInTheDocument();

    // Wait for card counts to load into the block badges
    expect(await screen.findByText("25 Kartu")).toBeInTheDocument();
    expect(screen.getByText("12 Kartu")).toBeInTheDocument();
    expect(screen.getByText("8 Kartu")).toBeInTheDocument();

    // Filter tabs should NOT exist
    expect(screen.queryByTestId("filter-all")).not.toBeInTheDocument();
  });

  test("navigates into a selected block and displays merged material decks using materialTitle", async () => {
    renderPage();

    const pharmaCard = await screen.findByTestId(
      "block-card-pharmaceutical-science",
    );
    fireEvent.click(pharmaCard);

    // Should show the merged material title ("Sediaan Solid") and 25 Kartu
    expect(await screen.findByText("Sediaan Solid")).toBeInTheDocument();
    expect(screen.getByText("25 Kartu")).toBeInTheDocument();
    expect(
      screen.queryByText("Farmakoterapi Hipertensi"),
    ).not.toBeInTheDocument();

    const startLink = screen.getByRole("link", { name: /mulai belajar/i });
    expect(startLink).toHaveAttribute("href", "/app/flash-cards/subtopic-1");

    // Clicking Kembali returns to the 3 block selection cards
    fireEvent.click(screen.getByRole("button", { name: /kembali/i }));
    expect(
      screen.getByText("Social Behavioural Administration of Pharmacy"),
    ).toBeInTheDocument();
  });

  test("supports direct block URL query parameter and shows empty state when block has no materials", async () => {
    mockListPublishedFlashCardSubtopics.mockResolvedValueOnce([]);
    renderPage("/app/flash-cards?block=clinical-science");

    expect(
      await screen.findByText(/belum ada materi di kelompok ini/i),
    ).toBeInTheDocument();
  });

  test("shows localized error copy for the flash card library", async () => {
    mockListPublishedFlashCardSubtopics.mockRejectedValueOnce(new Error("failed"));
    renderPage();

    expect(
      await screen.findByText("Kartu belajar belum bisa dimuat"),
    ).toBeInTheDocument();
    expect(screen.getByText(/coba lagi sebentar/i)).toBeInTheDocument();
  });
});
