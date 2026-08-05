import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup } from "@testing-library/react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import FlashCardGeneratorReviewPage from "./flash-card-generator-review-page";

const mockGetFlashCardMaterialDetail = vi.fn();
const mockSaveFlashCardMaterialReview = vi.fn();
const mockPublishFlashCardMaterial = vi.fn();

vi.mock("../../lib/api/flash-card-api", () => ({
  getFlashCardMaterialDetail: (...args: unknown[]) => mockGetFlashCardMaterialDetail(...args),
  saveFlashCardMaterialReview: (...args: unknown[]) => mockSaveFlashCardMaterialReview(...args),
  publishFlashCardMaterial: (...args: unknown[]) => mockPublishFlashCardMaterial(...args),
}));

afterEach(() => {
  cleanup();
});

vi.mock("./use-student-shell", () => ({
  useStudentShell: () => ({
    navItems: [],
    tierLabel: "Mentor",
  }),
}));

function createDetail(status: "ready_for_review" | "failed" | "published" = "ready_for_review") {
  return {
    material: {
      id: "material-1",
      title: "Farmakoterapi Hipertensi",
      academicGroup: "clinical_science",
      academicGroupLabel: "Clinical Science",
      status,
      statusLabel:
        status === "ready_for_review"
          ? "Siap direview"
          : status === "published"
            ? "Sudah dipublikasikan"
            : "Gagal diproses",
      globalSummary: "Ringkasan awal materi.",
      processingError: status === "failed" ? "OCR gagal membaca satu halaman." : null,
      publishedAt: null,
      createdAt: "2026-06-06T10:00:00.000Z",
      updatedAt: "2026-06-06T10:05:00.000Z",
    },
    sourceFiles: [],
    subtopics: [
      {
        id: "subtopic-1",
        title: "ACE inhibitor",
        summary: "Ringkasan awal submateri.",
        sortOrder: 1,
        cards: [
          {
            id: "card-1",
            frontText: "Kapan ACE inhibitor dipilih?",
            backText: "Saat albuminuria atau CKD yang relevan.",
            sortOrder: 1,
          },
        ],
      },
    ],
  };
}

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
      <MemoryRouter initialEntries={["/app/flash-card-generator/material-1"]}>
        <Routes>
          <Route path="/app/flash-card-generator/:materialId" element={<FlashCardGeneratorReviewPage />} />
          <Route path="/app/flash-card-generator" element={<div>Mentor list route</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSaveFlashCardMaterialReview.mockResolvedValue({
    materialId: "material-1",
    status: "ready_for_review",
  });
  mockPublishFlashCardMaterial.mockResolvedValue({
    materialId: "material-1",
    status: "published",
  });
});

describe("FlashCardGeneratorReviewPage", () => {
  test("shows the publish action only when the material is review-ready", async () => {
    mockGetFlashCardMaterialDetail.mockResolvedValueOnce(createDetail("ready_for_review"));

    renderPage();

    expect(await screen.findByRole("button", { name: /terbitkan untuk siswa/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /terbitkan untuk siswa/i }));

    await waitFor(() => {
      expect(mockPublishFlashCardMaterial).toHaveBeenCalledWith({
        materialId: "material-1",
      });
    });
    expect(await screen.findByText(/mentor list route/i)).toBeInTheDocument();
  });

  test("hides publish when the material is not review-ready", async () => {
    mockGetFlashCardMaterialDetail.mockResolvedValueOnce(createDetail("failed"));

    renderPage();

    await screen.findByText(/gagal diproses/i);
    expect(screen.queryByRole("button", { name: /terbitkan untuk siswa/i })).not.toBeInTheDocument();
  });

  test("shows a mentor-facing error when saving the review fails", async () => {
    mockGetFlashCardMaterialDetail.mockResolvedValueOnce(createDetail("ready_for_review"));
    mockSaveFlashCardMaterialReview.mockRejectedValueOnce(new Error("Simpan review gagal."));

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /simpan perubahan/i }));

    expect(await screen.findByText(/simpan review gagal\./i)).toBeInTheDocument();
  });

  test("renders published materials as read-only", async () => {
    mockGetFlashCardMaterialDetail.mockResolvedValueOnce(createDetail("published"));

    renderPage();

    expect(await screen.findByText(/materi yang sudah diterbitkan tidak bisa diubah agar kartu yang dipakai siswa tetap konsisten/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /simpan perubahan/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /terbitkan untuk siswa/i })).not.toBeInTheDocument();
  });
});
