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
});
