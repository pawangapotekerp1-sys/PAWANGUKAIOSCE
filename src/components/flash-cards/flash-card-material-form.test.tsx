import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import FlashCardMaterialForm from "./flash-card-material-form";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("FlashCardMaterialForm", () => {
  test("requires title, academic group, transcript file, and slide pdf file", async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);

    render(<FlashCardMaterialForm onSubmit={handleSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: /buat materi kartu belajar/i }));

    expect(await screen.findByText(/judul materi wajib diisi/i)).toBeInTheDocument();
    expect(screen.getByText(/kelompok materi wajib dipilih/i)).toBeInTheDocument();
    expect(screen.getByText(/transkrip wajib diunggah/i)).toBeInTheDocument();
    expect(screen.getByText(/slide pdf wajib diunggah/i)).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/judul materi/i), {
      target: {
        value: "Farmakoterapi Hipertensi",
      },
    });
    fireEvent.change(screen.getByLabelText(/kelompok materi/i), {
      target: {
        value: "clinical_science",
      },
    });
    fireEvent.change(screen.getByLabelText(/unggah transkrip/i), {
      target: {
        files: [new File(["Transcript"], "kelas.txt", { type: "text/plain" })],
      },
    });
    fireEvent.change(screen.getByLabelText(/unggah slide pdf/i), {
      target: {
        files: [new File(["%PDF-1.4"], "slide.pdf", { type: "application/pdf" })],
      },
    });

    fireEvent.click(screen.getByRole("button", { name: /buat materi kartu belajar/i }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        title: "Farmakoterapi Hipertensi",
        academicGroup: "Clinical Science",
        transcriptFile: expect.any(File),
        slidePdfFile: expect.any(File),
      });
    });
  });

  test("shows shorter scan and photo pdf guidance", () => {
    render(<FlashCardMaterialForm onSubmit={vi.fn()} />);

    expect(
      screen.getByText(/scan atau foto pdf tetap bisa dipakai\. jika teks kurang jelas, periksa hasilnya sebelum diterbitkan\./i),
    ).toBeInTheDocument();
  });

  test("accepts transcript uploads only from the supported plain text formats", () => {
    render(<FlashCardMaterialForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/unggah transkrip/i)).toHaveAttribute("accept", ".txt,.md");
  });

  test("disables submit when the parent flow blocks processing", () => {
    render(<FlashCardMaterialForm isSubmitDisabled onSubmit={vi.fn()} />);

    expect(screen.getByRole("button", { name: /buat materi kartu belajar/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /buat materi kartu belajar/i })).toHaveAttribute("data-variant", "primary");
  });
});
