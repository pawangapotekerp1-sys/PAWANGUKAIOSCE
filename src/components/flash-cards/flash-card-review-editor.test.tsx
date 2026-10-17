import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import FlashCardReviewEditor from "./flash-card-review-editor";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function createMaterialDetail(status: "ready_for_review" | "failed" | "published" = "ready_for_review") {
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
      metadata: null,
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

describe("FlashCardReviewEditor", () => {
  test("allows editing material summary, subtopic summary, card front, and card back", async () => {
    const handleSave = vi.fn().mockResolvedValue(undefined);

    render(
      <FlashCardReviewEditor
        detail={createMaterialDetail()}
        onPublish={vi.fn()}
        onSave={handleSave}
      />,
    );

    expect(screen.getByText(/tinjau materi flash card/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /simpan perubahan/i })).toHaveAttribute("data-variant", "primary");
    expect(screen.getByRole("button", { name: /terbitkan untuk siswa/i })).toHaveAttribute("data-variant", "outline");

    fireEvent.change(screen.getByLabelText(/ringkasan materi/i), {
      target: {
        value: "Ringkasan materi yang sudah direvisi mentor.",
      },
    });
    fireEvent.change(screen.getByLabelText(/ringkasan submateri 1/i), {
      target: {
        value: "Ringkasan submateri yang lebih presisi.",
      },
    });
    fireEvent.change(screen.getByLabelText(/kartu 1 depan/i), {
      target: {
        value: "Apa indikasi ACE inhibitor pada CKD?",
      },
    });
    fireEvent.change(screen.getByLabelText(/kartu 1 belakang/i), {
      target: {
        value: "Dipertimbangkan saat ada albuminuria dan target proteksi ginjal.",
      },
    });

    fireEvent.click(screen.getAllByRole("button", { name: /simpan perubahan/i })[0]);

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledWith({
        title: "Farmakoterapi Hipertensi",
        globalSummary: "Ringkasan materi yang sudah direvisi mentor.",
        subtopics: [
          {
            title: "ACE inhibitor",
            summary: "Ringkasan submateri yang lebih presisi.",
            cards: [
              {
                frontText: "Apa indikasi ACE inhibitor pada CKD?",
                backText: "Dipertimbangkan saat ada albuminuria dan target proteksi ginjal.",
              },
            ],
          },
        ],
      });
    });
  });

  test("allows adding and deleting cards", async () => {
    const handleSave = vi.fn().mockResolvedValue(undefined);

    render(
      <FlashCardReviewEditor
        detail={createMaterialDetail()}
        onPublish={vi.fn()}
        onSave={handleSave}
      />,
    );

    expect(screen.getByRole("button", { name: /tambah kartu/i })).toHaveAttribute("data-variant", "outline");

    fireEvent.click(screen.getByRole("button", { name: /tambah kartu/i }));
    fireEvent.change(screen.getByLabelText(/kartu 2 depan/i), {
      target: {
        value: "Apa target tekanan darah?",
      },
    });
    fireEvent.change(screen.getByLabelText(/kartu 2 belakang/i), {
      target: {
        value: "Kurang dari 130\/80 mmHg pada banyak pasien CKD.",
      },
    });
    expect(screen.getByRole("button", { name: /hapus kartu 1/i })).toHaveAttribute("data-variant", "outline");
    fireEvent.click(screen.getByRole("button", { name: /hapus kartu 1/i }));
    fireEvent.click(screen.getByRole("button", { name: /simpan perubahan/i }));

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledWith({
        title: "Farmakoterapi Hipertensi",
        globalSummary: "Ringkasan awal materi.",
        subtopics: [
          {
            title: "ACE inhibitor",
            summary: "Ringkasan awal submateri.",
            cards: [
              {
                frontText: "Apa target tekanan darah?",
                backText: "Kurang dari 130/80 mmHg pada banyak pasien CKD.",
              },
            ],
          },
        ],
      });
    });
  });

  test("keeps published materials read-only with cleaner guidance", () => {
    render(
      <FlashCardReviewEditor
        detail={createMaterialDetail("published")}
        onPublish={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByText(/materi yang sudah diterbitkan tidak bisa diubah agar kartu yang dipakai siswa tetap konsisten/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /simpan perubahan/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /terbitkan untuk siswa/i })).not.toBeInTheDocument();
  });

  test("refreshes local form state when the server detail changes after a refetch", () => {
    const { rerender } = render(
      <FlashCardReviewEditor
        detail={createMaterialDetail()}
        onPublish={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/ringkasan materi/i), {
      target: {
        value: "Draft lokal mentor yang belum tersimpan.",
      },
    });

    const refreshedDetail = {
      ...createMaterialDetail(),
      material: {
        ...createMaterialDetail().material,
        globalSummary: "Ringkasan dari server setelah save.",
      },
      subtopics: [
        {
          ...createMaterialDetail().subtopics[0],
          summary: "Ringkasan submateri hasil refetch.",
        },
      ],
    };

    rerender(
      <FlashCardReviewEditor
        detail={refreshedDetail}
        onPublish={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/ringkasan materi/i)).toHaveValue("Ringkasan dari server setelah save.");
    expect(screen.getByLabelText(/ringkasan submateri 1/i)).toHaveValue("Ringkasan submateri hasil refetch.");
  });

  test("disables publish button and displays warning when unresolved critical/high conflicts exist", () => {
    const detail = {
      ...createMaterialDetail(),
      material: {
        ...createMaterialDetail().material,
        metadata: {
          sourceConflicts: [
            {
              conflictId: "conflict-1",
              conceptId: "captopril-dosage",
              category: "dosage_discrepancy" as const,
              severity: "critical" as const,
              slideEvidence: {
                pdfPageIndex: 4,
                printedSlideNumber: 4,
                exactQuote: "Dosis kaptopril 3 x 25mg",
              },
              transcriptEvidence: {
                segmentId: "seg-010",
                exactQuote: "Kaptopril diberikan 2 x 100mg",
              },
              distinctionType: "substantive_contradiction" as const,
              resolutionStatus: "unresolved" as const,
            },
          ],
        },
      },
    };

    render(
      <FlashCardReviewEditor
        detail={detail}
        onPublish={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/publikasi diblokir: ada konflik sumber klinis berderajat critical\/high yang belum diselesaikan/i),
    ).toBeInTheDocument();

    const publishBtn = screen.getByRole("button", { name: /terbitkan untuk siswa/i });
    expect(publishBtn).toBeDisabled();
  });

  test("enables publish button when all critical/high conflicts are resolved (or only moderate conflicts exist)", () => {
    const detail = {
      ...createMaterialDetail(),
      material: {
        ...createMaterialDetail().material,
        metadata: {
          sourceConflicts: [
            {
              conflictId: "conflict-1",
              conceptId: "guideline-source",
              category: "clinical_guideline" as const,
              severity: "moderate" as const,
              slideEvidence: {
                pdfPageIndex: 2,
                printedSlideNumber: 2,
                exactQuote: "JNC 8 guideline",
              },
              transcriptEvidence: {
                segmentId: "seg-003",
                exactQuote: "AHA 2017 guideline",
              },
              distinctionType: "substantive_contradiction" as const,
              resolutionStatus: "unresolved" as const,
            },
            {
              conflictId: "conflict-2",
              conceptId: "captopril-dosage",
              category: "dosage_discrepancy" as const,
              severity: "high" as const,
              slideEvidence: {
                pdfPageIndex: 4,
                printedSlideNumber: 4,
                exactQuote: "Dosis kaptopril 3 x 25mg",
              },
              transcriptEvidence: {
                segmentId: "seg-010",
                exactQuote: "Kaptopril diberikan 2 x 100mg",
              },
              distinctionType: "substantive_contradiction" as const,
              resolutionStatus: "mentor_clarified" as const,
              clinicalClarificationNotes: "Dosis yang benar adalah 3 x 25mg sesuai pedoman.",
            },
          ],
        },
      },
    };

    render(
      <FlashCardReviewEditor
        detail={detail}
        onPublish={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(
      screen.queryByText(/publikasi diblokir: ada konflik sumber klinis berderajat critical\/high yang belum diselesaikan/i),
    ).not.toBeInTheDocument();

    const publishBtn = screen.getByRole("button", { name: /terbitkan untuk siswa/i });
    expect(publishBtn).not.toBeDisabled();
    expect(screen.getByText(/terklarifikasi/i)).toBeInTheDocument();
    expect(screen.getByText(/dosis yang benar adalah 3 x 25mg sesuai pedoman/i)).toBeInTheDocument();
  });

  test("renders multi-source badges on cards (Slide 4, Segmen seg-010)", () => {
    const detail = {
      ...createMaterialDetail(),
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
              sources: [
                {
                  sourceId: "src-1",
                  sourceType: "slide_pdf" as const,
                  provenanceStatus: "verified_exact" as const,
                  location: {
                    pdfPageIndex: 4,
                    printedSlideNumber: 4,
                    textQuote: "Slide 4: Indikasi ACE inhibitor pada CKD dengan albuminuria.",
                  },
                  alignmentConfidence: "high" as const,
                  confidenceReason: "Exact match in slide table",
                },
                {
                  sourceId: "src-2",
                  sourceType: "transcript" as const,
                  provenanceStatus: "semantic_match" as const,
                  location: {
                    pdfPageIndex: null,
                    segmentId: "seg-010",
                    textQuote: "Dosen menekankan pemilihan ACE inhibitor saat albuminuria positif.",
                  },
                  alignmentConfidence: "high" as const,
                  confidenceReason: "Lecturer spoken explanation",
                },
              ],
              metadata: {
                sources: [],
                clinicalVerification: {
                  status: "externally_verified" as const,
                },
                qualityStatus: "ACCEPTED" as const,
              },
            },
          ],
        },
      ],
    };

    render(
      <FlashCardReviewEditor
        detail={detail}
        onPublish={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByText("Slide 4")).toBeInTheDocument();
    expect(screen.getByText("Segmen seg-010")).toBeInTheDocument();
    expect(screen.getByText("verified_exact")).toBeInTheDocument();
    expect(screen.getByText("semantic_match")).toBeInTheDocument();
  });

  test("renders quality status badges on defective or conflicting cards", () => {
    const detail = {
      ...createMaterialDetail(),
      subtopics: [
        {
          id: "subtopic-1",
          title: "ACE inhibitor",
          summary: "Ringkasan submateri.",
          sortOrder: 1,
          cards: [
            {
              id: "card-1",
              frontText: "Front 1",
              backText: "Back 1",
              sortOrder: 1,
              metadata: {
                sources: [],
                clinicalVerification: { status: "clinical_review_required" as const },
                qualityStatus: "SUBSTANTIVE_CONFLICT" as const,
              },
            },
            {
              id: "card-2",
              frontText: "Front 2",
              backText: "Back 2",
              sortOrder: 2,
              metadata: {
                sources: [],
                clinicalVerification: { status: "not_assessed" as const },
                qualityStatus: "REPAIRABLE_DEFECT" as const,
              },
            },
          ],
        },
      ],
    };

    render(
      <FlashCardReviewEditor
        detail={detail}
        onPublish={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByText("Konflik Substantif")).toBeInTheDocument();
    expect(screen.getByText("Perlu Perbaikan")).toBeInTheDocument();
  });

  test("triggers onResolveConflict when clicking Klarifikasi Mentor", async () => {
    const handleResolveConflict = vi.fn().mockResolvedValue(undefined);
    const detail = {
      ...createMaterialDetail(),
      material: {
        ...createMaterialDetail().material,
        metadata: {
          sourceConflicts: [
            {
              conflictId: "conflict-1",
              conceptId: "dosage-check",
              category: "dosage_discrepancy" as const,
              severity: "critical" as const,
              slideEvidence: {
                pdfPageIndex: 4,
                printedSlideNumber: 4,
                exactQuote: "Dosis 3 x 25mg",
              },
              transcriptEvidence: {
                segmentId: "seg-010",
                exactQuote: "Dosis 2 x 100mg",
              },
              distinctionType: "substantive_contradiction" as const,
              resolutionStatus: "unresolved" as const,
            },
          ],
        },
      },
    };

    render(
      <FlashCardReviewEditor
        detail={detail}
        onPublish={vi.fn()}
        onSave={vi.fn()}
        onResolveConflict={handleResolveConflict}
      />,
    );

    const notesTextarea = screen.getByLabelText(/catatan klarifikasi conflict-1/i);
    fireEvent.change(notesTextarea, {
      target: { value: "Ikuti pedoman slide 3 x 25mg." },
    });

    const clarifyBtn = screen.getByRole("button", { name: /klarifikasi mentor/i });
    fireEvent.click(clarifyBtn);

    await waitFor(() => {
      expect(handleResolveConflict).toHaveBeenCalledWith({
        conflictId: "conflict-1",
        resolutionStatus: "mentor_clarified",
        clinicalClarificationNotes: "Ikuti pedoman slide 3 x 25mg.",
      });
    });
  });

  test("renders on-demand AI audit button and calls onAuditRepair", async () => {
    const handleAuditRepair = vi.fn().mockResolvedValue(undefined);

    render(
      <FlashCardReviewEditor
        detail={createMaterialDetail("ready_for_review")}
        onPublish={vi.fn()}
        onSave={vi.fn()}
        onAuditRepair={handleAuditRepair}
      />,
    );

    const auditBtn = screen.getByRole("button", { name: /audit & perbaiki kualitas \(ai reviewer\)/i });
    expect(auditBtn).toBeInTheDocument();

    fireEvent.click(auditBtn);

    await waitFor(() => {
      expect(handleAuditRepair).toHaveBeenCalled();
    });
  });

  test("displays token metrics breakdown including thoughts tokens and quality report", () => {
    const detail = {
      ...createMaterialDetail(),
      material: {
        ...createMaterialDetail().material,
        metadata: {
          qualityReport: {
            totalCardsGenerated: 15,
            acceptedCount: 12,
            repairedCount: 2,
            droppedCount: 3,
            conflictsCount: 4,
            unresolvedCriticalOrHighConflicts: 0,
          },
          tokenUsage: {
            generator: {
              isAvailable: true,
              promptTokenCount: 1200,
              candidatesTokenCount: 800,
              thoughtsTokenCount: 350,
              totalTokenCount: 2350,
              statusText: "Success",
            },
            reviewer: {
              isAvailable: true,
              promptTokenCount: 600,
              candidatesTokenCount: 300,
              thoughtsTokenCount: 150,
              totalTokenCount: 1050,
              statusText: "Success",
            },
          },
        },
      },
    };

    render(
      <FlashCardReviewEditor
        detail={detail}
        onPublish={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByText(/Metrik Token & Laporan Kualitas Pipeline/i)).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();

    expect(screen.getByText("generator")).toBeInTheDocument();
    expect(screen.getByText("reviewer")).toBeInTheDocument();
    expect(screen.getByText("350")).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("2350")).toBeInTheDocument();
    expect(screen.getByText("1050")).toBeInTheDocument();
  });
});
