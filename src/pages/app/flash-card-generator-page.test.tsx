import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import FlashCardGeneratorPage from "./flash-card-generator-page";

const mockListMentorFlashCardMaterials = vi.fn();

vi.mock("../../lib/api/flash-card-api", () => ({
  listMentorFlashCardMaterials: (...args: unknown[]) => mockListMentorFlashCardMaterials(...args),
}));

vi.mock("./use-student-shell", () => ({
  useStudentShell: () => ({
    navItems: [],
    tierLabel: "Mentor",
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
      <MemoryRouter>
        <FlashCardGeneratorPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
  mockListMentorFlashCardMaterials.mockResolvedValue([
    {
      materialId: "draft-1",
      title: "Draft materi",
      academicGroup: "clinical_science",
      academicGroupLabel: "Clinical Science",
      status: "draft",
      statusLabel: "Draft",
      subtopicCount: 0,
      cardCount: 0,
      processingError: null,
      updatedAt: "2026-06-06T10:00:00.000Z",
      publishedAt: null,
    },
    {
      materialId: "processing-1",
      title: "Materi proses aktif",
      academicGroup: "clinical_science",
      academicGroupLabel: "Clinical Science",
      status: "processing",
      statusLabel: "Sedang diproses",
      subtopicCount: 0,
      cardCount: 0,
      processingError: null,
      updatedAt: "2026-06-06T10:01:00.000Z",
      publishedAt: null,
    },
    {
      materialId: "review-1",
      title: "Materi siap review",
      academicGroup: "clinical_science",
      academicGroupLabel: "Clinical Science",
      status: "ready_for_review",
      statusLabel: "Siap direview",
      subtopicCount: 3,
      cardCount: 12,
      processingError: null,
      updatedAt: "2026-06-06T10:02:00.000Z",
      publishedAt: null,
    },
    {
      materialId: "published-1",
      title: "Materi sudah publish",
      academicGroup: "clinical_science",
      academicGroupLabel: "Clinical Science",
      status: "published",
      statusLabel: "Sudah dipublikasikan",
      subtopicCount: 2,
      cardCount: 8,
      processingError: null,
      updatedAt: "2026-06-06T10:03:00.000Z",
      publishedAt: "2026-06-06T11:00:00.000Z",
    },
    {
      materialId: "failed-1",
      title: "Materi gagal proses",
      academicGroup: "clinical_science",
      academicGroupLabel: "Clinical Science",
      status: "failed",
      statusLabel: "Gagal diproses",
      subtopicCount: 0,
      cardCount: 0,
      processingError: "OCR gagal membaca satu halaman.",
      updatedAt: "2026-06-06T10:04:00.000Z",
      publishedAt: null,
    },
  ]);
});

describe("FlashCardGeneratorPage", () => {
  test("shows mentor material list statuses across the workflow", async () => {
    renderPage();

    expect(await screen.findByText(/penyusun flash card/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.getByText(/unggah transkrip dan slide, cek hasilnya, lalu terbitkan untuk siswa/i)).toBeInTheDocument();
    expect(await screen.findByText(/draft materi/i)).toBeInTheDocument();
    expect(screen.getByText(/sedang diproses/i)).toBeInTheDocument();
    expect(screen.getByText(/siap direview/i)).toBeInTheDocument();
    expect(screen.getByText(/sudah dipublikasikan/i)).toBeInTheDocument();
    expect(screen.getByText(/gagal diproses/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /draft materi/i })).toHaveAttribute(
      "href",
      "/app/flash-card-generator/draft-1",
    );
    expect(screen.getByRole("link", { name: /buat materi baru/i })).toHaveAttribute("data-variant", "primary");
    expect(screen.getByRole("link", { name: /materi siap review/i })).toHaveAttribute(
      "href",
      "/app/flash-card-generator/review-1",
    );
  });

  test("shows shorter loading and error states", async () => {
    mockListMentorFlashCardMaterials.mockImplementationOnce(() => new Promise(() => undefined));
    renderPage();

    expect(await screen.findByText(/daftar materi sedang dimuat/i)).toBeInTheDocument();

    cleanup();

    mockListMentorFlashCardMaterials.mockRejectedValueOnce(new Error("failed"));
    renderPage();

    expect(await screen.findByText("Daftar materi belum bisa dimuat")).toBeInTheDocument();
    expect(screen.getByText(/coba lagi sebentar/i)).toBeInTheDocument();
  });
});
