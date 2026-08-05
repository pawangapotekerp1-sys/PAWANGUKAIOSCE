import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import FlashCardDeckPage from "./flash-card-deck-page";

const mockGetPublishedFlashCardDeck = vi.fn();
const mockSaveStudentFlashCardDifficulty = vi.fn();

vi.mock("../../lib/api/flash-card-api", () => ({
  getPublishedFlashCardDeck: (...args: unknown[]) => mockGetPublishedFlashCardDeck(...args),
  saveStudentFlashCardDifficulty: (...args: unknown[]) => mockSaveStudentFlashCardDifficulty(...args),
}));

vi.mock("../../lib/auth/use-session", () => ({
  useSession: () => ({
    user: {
      id: "student-1",
    },
  }),
}));

vi.mock("./use-student-shell", () => ({
  useStudentShell: () => ({
    navItems: [],
    tierLabel: "Pro",
  }),
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/app/flash-cards/subtopic-1"]}>
        <Routes>
          <Route path="/app/flash-cards/:subtopicId" element={<FlashCardDeckPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
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
  mockSaveStudentFlashCardDifficulty.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
});

describe("FlashCardDeckPage", () => {
  test("loads one published deck and saves a difficulty rating", async () => {
    renderPage();

    expect(await screen.findByText(/ace inhibitor pada ckd/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /mudah/i }));

    await waitFor(() => {
      expect(mockSaveStudentFlashCardDifficulty).toHaveBeenCalledWith({
        userId: "student-1",
        cardId: "card-1",
        difficulty: "easy",
      });
    });
  });

  test("shows shorter loading and error states", async () => {
    mockGetPublishedFlashCardDeck.mockImplementationOnce(() => new Promise(() => undefined));
    renderPage();

    expect(await screen.findByText(/set kartu belajar sedang dimuat/i)).toBeInTheDocument();

    cleanup();

    mockGetPublishedFlashCardDeck.mockRejectedValueOnce(new Error("failed"));
    renderPage();

    expect(await screen.findByText("Set kartu belajar belum bisa dimuat")).toBeInTheDocument();
    expect(screen.getByText(/^set kartu belajar belum bisa dimuat\.$/i)).toBeInTheDocument();
  });
});
