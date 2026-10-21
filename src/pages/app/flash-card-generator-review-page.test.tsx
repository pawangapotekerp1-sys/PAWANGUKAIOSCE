import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup } from "@testing-library/react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import FlashCardGeneratorReviewPage, { determineNextPipelineStepGroup } from "./flash-card-generator-review-page";

const mockGetFlashCardMaterialDetail = vi.fn();
const mockSaveFlashCardMaterialReview = vi.fn();
const mockPublishFlashCardMaterial = vi.fn();
const mockRetryFlashCardMaterialProcessing = vi.fn();
const mockContinueFlashCardMaterialProcessing = vi.fn();
const mockAuditRepairFlashCardMaterial = vi.fn();
const mockResolveFlashCardConflict = vi.fn();

vi.mock("../../lib/api/flash-card-api", () => ({
  getFlashCardMaterialDetail: (...args: unknown[]) => mockGetFlashCardMaterialDetail(...args),
  saveFlashCardMaterialReview: (...args: unknown[]) => mockSaveFlashCardMaterialReview(...args),
  publishFlashCardMaterial: (...args: unknown[]) => mockPublishFlashCardMaterial(...args),
  retryFlashCardMaterialProcessing: (...args: unknown[]) => mockRetryFlashCardMaterialProcessing(...args),
  continueFlashCardMaterialProcessing: (...args: unknown[]) => mockContinueFlashCardMaterialProcessing(...args),
  auditRepairFlashCardMaterial: (...args: unknown[]) => mockAuditRepairFlashCardMaterial(...args),
  resolveFlashCardConflict: (...args: unknown[]) => mockResolveFlashCardConflict(...args),
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
  mockContinueFlashCardMaterialProcessing.mockResolvedValue({
    materialId: "material-1",
    status: "processing",
    isSuspended: true,
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

  test("shows dedicated processing view and hides review editor when material is processing", async () => {
    mockGetFlashCardMaterialDetail.mockResolvedValueOnce({
      ...createDetail("ready_for_review"),
      material: {
        ...createDetail("ready_for_review").material,
        status: "processing",
        statusLabel: "Sedang diproses",
      },
      subtopics: [],
    });

    renderPage();

    expect(await screen.findByText(/ai sedang menyusun flash card/i)).toBeInTheDocument();
    expect(screen.getByText(/pembersihan transkrip/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /segarkan status sekarang/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /simpan perubahan/i })).not.toBeInTheDocument();
  });

  test("formats raw Zod too_small error into friendly Indonesian message", async () => {
    mockGetFlashCardMaterialDetail.mockResolvedValueOnce(createDetail("ready_for_review"));
    mockSaveFlashCardMaterialReview.mockRejectedValueOnce(
      new Error('[{"origin":"array","code":"too_small","minimum":1,"inclusive":true,"path":["subtopics"],"message":"At least one subtopic is required."}]')
    );

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /simpan perubahan/i }));

    expect(await screen.findByText(/materi harus memiliki minimal 1 submateri dan kartu sebelum disimpan/i)).toBeInTheDocument();
  });

  test("triggers continueFlashCardMaterialProcessing with stepGroup generation when cleaning is completed", async () => {
    mockContinueFlashCardMaterialProcessing.mockResolvedValueOnce({
      materialId: "material-1",
      status: "processing",
      isSuspended: true,
      nextStepGroup: "review",
    });

    mockGetFlashCardMaterialDetail.mockResolvedValueOnce({
      ...createDetail("ready_for_review"),
      material: {
        ...createDetail("ready_for_review").material,
        status: "processing",
        statusLabel: "Sedang diproses",
        metadata: {
          pipelineCheckpoint: {
            currentStage: "concept_mapping",
            completedStages: ["ingestion", "transcript_cleaning"],
            stageArtifacts: {},
          },
        },
      },
      subtopics: [],
    });

    renderPage();

    expect(await screen.findByText(/ai sedang menyusun flash card/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(mockContinueFlashCardMaterialProcessing).toHaveBeenCalledWith({
        materialId: "material-1",
        stepGroup: "generation",
      });
    });
  });

  test("displays 5 RPM rate limit countdown banner when rate limit info is present", async () => {
    mockGetFlashCardMaterialDetail.mockResolvedValueOnce({
      ...createDetail("ready_for_review"),
      material: {
        ...createDetail("ready_for_review").material,
        status: "processing",
        statusLabel: "Sedang diproses",
        metadata: {
          pipelineCheckpoint: {
            currentStage: "concept_mapping",
            completedStages: ["ingestion", "transcript_cleaning"],
            stageArtifacts: {},
          },
          rateLimitInfo: {
            rateLimitedAt: new Date().toISOString(),
            retryAfterSeconds: 45,
            message: "Rate limit reached",
          },
        },
      },
      subtopics: [],
    });

    renderPage();

    expect(await screen.findByText(/batas kuota gemini \(5 rpm\) tercapai/i)).toBeInTheDocument();
  });

  test("stops auto-retry and displays manual continuation button when circuit breaker is tripped (3 consecutive failures)", async () => {
    mockContinueFlashCardMaterialProcessing.mockResolvedValueOnce({
      materialId: "material-1",
      status: "processing",
      isSuspended: true,
      nextStepGroup: "review",
    });

    mockGetFlashCardMaterialDetail.mockResolvedValue({
      ...createDetail("ready_for_review"),
      material: {
        ...createDetail("ready_for_review").material,
        status: "processing",
        statusLabel: "Sedang diproses",
        metadata: {
          pipelineCheckpoint: {
            currentStage: "concept_mapping",
            completedStages: ["ingestion", "transcript_cleaning"],
            stageArtifacts: {},
          },
          rateLimitInfo: {
            rateLimitedAt: new Date().toISOString(),
            retryAfterSeconds: 60,
            consecutiveCount: 3,
            isCircuitBroken: true,
            message: "Rate limit reached 3 times",
          },
        },
      },
      subtopics: [],
    });

    renderPage();

    // Must show circuit breaker message
    expect(await screen.findByText(/batas percobaan ulang otomatis tercapai/i)).toBeInTheDocument();

    // Auto-continue MUST NOT be called!
    expect(mockContinueFlashCardMaterialProcessing).not.toHaveBeenCalled();

    // Manual button is rendered and clickable
    const manualBtn = screen.getByRole("button", { name: /lanjutkan pemrosesan manual/i });
    expect(manualBtn).toBeInTheDocument();

    fireEvent.click(manualBtn);

    await waitFor(() => {
      expect(mockContinueFlashCardMaterialProcessing).toHaveBeenCalledWith({
        materialId: "material-1",
        stepGroup: "generation",
      });
    });
  });

  test("persists circuit breaker state across refresh so auto retry does not resume unexpectedly", async () => {
    // Simulates opening a new tab or page refresh with tripped circuit breaker in DB
    mockGetFlashCardMaterialDetail.mockResolvedValue({
      ...createDetail("ready_for_review"),
      material: {
        ...createDetail("ready_for_review").material,
        status: "processing",
        statusLabel: "Sedang diproses",
        metadata: {
          pipelineCheckpoint: {
            completedStages: ["ingestion", "transcript_cleaning"],
            stageArtifacts: {},
          },
          rateLimitInfo: {
            rateLimitedAt: new Date().toISOString(),
            retryAfterSeconds: 60,
            consecutiveCount: 3,
            isCircuitBroken: true,
          },
        },
      },
      subtopics: [],
    });

    renderPage();

    expect(await screen.findByText(/batas percobaan ulang otomatis tercapai/i)).toBeInTheDocument();
    // Auto countdown is NOT running
    expect(screen.queryByText(/melanjutkan otomatis dalam/i)).not.toBeInTheDocument();
    expect(mockContinueFlashCardMaterialProcessing).not.toHaveBeenCalled();
  });
  test("displays 503 service high demand message during countdown when rateLimitInfo indicates provider unavailable", async () => {
    mockGetFlashCardMaterialDetail.mockResolvedValue({
      ...createDetail("ready_for_review"),
      material: {
        ...createDetail("ready_for_review").material,
        status: "processing",
        statusLabel: "Sedang diproses",
        metadata: {
          pipelineCheckpoint: {
            completedStages: ["ingestion", "transcript_cleaning"],
            stageArtifacts: {},
          },
          rateLimitInfo: {
            rateLimitedAt: new Date().toISOString(),
            retryAfterSeconds: 30,
            consecutiveCount: 1,
            isCircuitBroken: false,
            errorCategory: "GEMINI_PROVIDER_UNAVAILABLE",
            message: "Layanan Gemini sedang mengalami gangguan sementara dari Google (503).",
          },
        },
      },
      subtopics: [],
    });

    renderPage();

    expect(await screen.findByText(/layanan gemini sedang padat \/ mengalami gangguan sementara/i)).toBeInTheDocument();
  });

  test("triggers continueFlashCardMaterialProcessing with stepGroup cleaning when cleaning is NOT yet completed", async () => {
    mockContinueFlashCardMaterialProcessing.mockResolvedValueOnce({
      materialId: "material-1",
      status: "processing",
      isSuspended: true,
      nextStepGroup: "generation",
    });

    mockGetFlashCardMaterialDetail.mockResolvedValueOnce({
      ...createDetail("ready_for_review"),
      material: {
        ...createDetail("ready_for_review").material,
        status: "processing",
        statusLabel: "Sedang diproses",
        metadata: {
          pipelineCheckpoint: {
            currentStage: "transcript_cleaning",
            completedStages: ["ingestion"],
            stageArtifacts: {},
          },
        },
      },
      subtopics: [],
    });

    renderPage();

    expect(await screen.findByText(/ai sedang menyusun flash card/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(mockContinueFlashCardMaterialProcessing).toHaveBeenCalledWith({
        materialId: "material-1",
        stepGroup: "cleaning",
      });
    });
  });

  test("triggers continueFlashCardMaterialProcessing with stepGroup review when candidate_generation is completed", async () => {
    mockContinueFlashCardMaterialProcessing.mockResolvedValueOnce({
      materialId: "material-1",
      status: "processing",
      isSuspended: false,
      nextStepGroup: "finished",
    });

    mockGetFlashCardMaterialDetail.mockResolvedValueOnce({
      ...createDetail("ready_for_review"),
      material: {
        ...createDetail("ready_for_review").material,
        status: "processing",
        statusLabel: "Sedang diproses",
        metadata: {
          pipelineCheckpoint: {
            currentStage: "adversarial_review",
            completedStages: ["ingestion", "transcript_cleaning", "candidate_generation"],
            stageArtifacts: {},
          },
        },
      },
      subtopics: [],
    });

    renderPage();

    expect(await screen.findByText(/ai sedang menyusun flash card/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(mockContinueFlashCardMaterialProcessing).toHaveBeenCalledWith({
        materialId: "material-1",
        stepGroup: "review",
      });
    });
  });

  test("manual continue button triggers stepGroup cleaning when cleaning is not completed", async () => {
    mockContinueFlashCardMaterialProcessing.mockResolvedValueOnce({
      materialId: "material-1",
      status: "processing",
      isSuspended: true,
      nextStepGroup: "generation",
    });

    mockGetFlashCardMaterialDetail.mockResolvedValue({
      ...createDetail("ready_for_review"),
      material: {
        ...createDetail("ready_for_review").material,
        status: "processing",
        statusLabel: "Sedang diproses",
        metadata: {
          pipelineCheckpoint: {
            currentStage: "transcript_cleaning",
            completedStages: ["ingestion"],
            stageArtifacts: {},
          },
          rateLimitInfo: {
            rateLimitedAt: new Date().toISOString(),
            retryAfterSeconds: 60,
            consecutiveCount: 3,
            isCircuitBroken: true,
            errorCategory: "GEMINI_PROVIDER_UNAVAILABLE",
          },
        },
      },
      subtopics: [],
    });

    renderPage();

    const manualBtn = await screen.findByRole("button", { name: /lanjutkan pemrosesan manual/i });
    expect(manualBtn).toBeInTheDocument();

    fireEvent.click(manualBtn);

    await waitFor(() => {
      expect(mockContinueFlashCardMaterialProcessing).toHaveBeenCalledWith({
        materialId: "material-1",
        stepGroup: "cleaning",
      });
    });
  });

  test("does not trigger auto-continuation if processingJob is already active in another tab or worker", async () => {
    mockGetFlashCardMaterialDetail.mockResolvedValue({
      ...createDetail("ready_for_review"),
      material: {
        ...createDetail("ready_for_review").material,
        status: "processing",
        statusLabel: "Sedang diproses",
        metadata: {
          pipelineCheckpoint: {
            currentStage: "transcript_cleaning",
            completedStages: ["ingestion"],
            stageArtifacts: {},
          },
          processingJob: {
            jobId: "active-concurrent-job-uuid-1234",
            startedAt: new Date().toISOString(),
            heartbeatAt: new Date().toISOString(),
            stage: "transcript_cleaning",
          },
        },
      },
      subtopics: [],
    });

    renderPage();

    expect(await screen.findByText(/ai sedang menyusun flash card/i)).toBeInTheDocument();
    // Multi-tab idempotency: Active job running means no duplicate request
    expect(mockContinueFlashCardMaterialProcessing).not.toHaveBeenCalled();
  });
});

describe("determineNextPipelineStepGroup helper", () => {
  test("returns 'cleaning' when completedStages does not include transcript_cleaning", () => {
    expect(determineNextPipelineStepGroup(undefined)).toBe("cleaning");
    expect(determineNextPipelineStepGroup({})).toBe("cleaning");
    expect(determineNextPipelineStepGroup({ completedStages: [] })).toBe("cleaning");
    expect(determineNextPipelineStepGroup({ completedStages: ["ingestion"] })).toBe("cleaning");
  });

  test("returns 'generation' when transcript_cleaning is completed but candidate_generation is not", () => {
    expect(determineNextPipelineStepGroup({ completedStages: ["ingestion", "transcript_cleaning"] })).toBe("generation");
    expect(determineNextPipelineStepGroup({ completedStages: ["ingestion", "transcript_cleaning", "concept_mapping"] })).toBe("generation");
  });

  test("returns 'review' when candidate_generation is completed but validation_and_storage is not", () => {
    expect(
      determineNextPipelineStepGroup({
        completedStages: ["ingestion", "transcript_cleaning", "concept_mapping", "alignment_and_conflict_detection", "candidate_generation"],
      })
    ).toBe("review");
  });

  test("returns null when validation_and_storage is completed", () => {
    expect(
      determineNextPipelineStepGroup({
        completedStages: [
          "ingestion",
          "transcript_cleaning",
          "concept_mapping",
          "alignment_and_conflict_detection",
          "candidate_generation",
          "adversarial_review",
          "targeted_repair",
          "validation_and_storage",
        ],
      })
    ).toBeNull();
  });
});
