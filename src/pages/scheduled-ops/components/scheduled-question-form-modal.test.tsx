import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { ScheduledQuestionFormModal } from "./scheduled-question-form-modal";
import { ScheduledEventQuestionDraftInput } from "../../../lib/api/scheduled-tryout-api";

describe("ScheduledQuestionFormModal", () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
  });

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    question: null,
    onSave: vi.fn(),
    eventId: "event-123",
  };

  it("renders with 'Tambah Soal Baru' title when adding a new question", () => {
    render(<ScheduledQuestionFormModal {...defaultProps} />);

    expect(screen.getByText("Tambah Soal Baru")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Tulis pertanyaan di sini...")).toHaveValue("");
    expect(screen.getByPlaceholderText("Tulis pembahasan jawaban di sini...")).toHaveValue("");
    expect(screen.getByPlaceholderText("Opsi A")).toHaveValue("");
    expect(screen.getByPlaceholderText("Opsi B")).toHaveValue("");
  });

  it("renders with 'Edit Soal' title and pre-fills form data when editing", () => {
    const existingQuestion: ScheduledEventQuestionDraftInput = {
      stem: "Pertanyaan uji coba",
      correctOptionKey: "B",
      explanationText: "Pembahasan uji coba",
      questionImagePath: "scheduled_events/event-123/soal.png",
      explanationImagePath: "scheduled_events/event-123/explanations/bahas.png",
      options: [
        { key: "A", text: "Opsi Pertama" },
        { key: "B", text: "Opsi Kedua" },
        { key: "C", text: "Opsi Ketiga" },
        { key: "D", text: "Opsi Keempat" },
        { key: "E", text: "Opsi Kelima" },
      ],
    };

    render(<ScheduledQuestionFormModal {...defaultProps} question={existingQuestion} />);

    expect(screen.getByText("Edit Soal")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Tulis pertanyaan di sini...")).toHaveValue("Pertanyaan uji coba");
    expect(screen.getByPlaceholderText("Tulis pembahasan jawaban di sini...")).toHaveValue("Pembahasan uji coba");
    expect(screen.getByPlaceholderText("Opsi A")).toHaveValue("Opsi Pertama");
    expect(screen.getByPlaceholderText("Opsi B")).toHaveValue("Opsi Kedua");

    const inputRadioB = document.getElementById("opt-B") as HTMLInputElement;
    expect(inputRadioB?.checked).toBe(true);
  });

  it("updates question stem when input changes", () => {
    render(<ScheduledQuestionFormModal {...defaultProps} />);

    const stemInput = screen.getByPlaceholderText("Tulis pertanyaan di sini...");
    fireEvent.change(stemInput, { target: { value: "Pertanyaan baru diperbarui" } });

    expect(stemInput).toHaveValue("Pertanyaan baru diperbarui");
  });

  it("updates option texts when input changes", () => {
    render(<ScheduledQuestionFormModal {...defaultProps} />);

    const optAInput = screen.getByPlaceholderText("Opsi A");
    fireEvent.change(optAInput, { target: { value: "Parasetamol" } });

    expect(optAInput).toHaveValue("Parasetamol");
  });

  it("changes selected correct option when radio is clicked", () => {
    render(<ScheduledQuestionFormModal {...defaultProps} />);

    const inputRadioC = document.getElementById("opt-C") as HTMLInputElement;
    expect(inputRadioC.checked).toBe(false);

    fireEvent.click(inputRadioC);
    expect(inputRadioC.checked).toBe(true);
  });

  it("updates explanation text when input changes", () => {
    render(<ScheduledQuestionFormModal {...defaultProps} />);

    const explanationInput = screen.getByPlaceholderText("Tulis pembahasan jawaban di sini...");
    fireEvent.change(explanationInput, { target: { value: "Penjelasan lengkap obat" } });

    expect(explanationInput).toHaveValue("Penjelasan lengkap obat");
  });

  it("calls onClose when Batal is clicked", () => {
    const onClose = vi.fn();
    render(<ScheduledQuestionFormModal {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Batal" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onSave with updated data and onClose when Simpan Soal is clicked", () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(<ScheduledQuestionFormModal {...defaultProps} onSave={onSave} onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText("Tulis pertanyaan di sini..."), {
      target: { value: "Soal baru disimpan" },
    });
    fireEvent.change(screen.getByPlaceholderText("Opsi A"), {
      target: { value: "Pilihan A" },
    });
    fireEvent.click(document.getElementById("opt-A")!);
    fireEvent.change(screen.getByPlaceholderText("Tulis pembahasan jawaban di sini..."), {
      target: { value: "Pembahasan baru" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Simpan Soal" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        stem: "Soal baru disimpan",
        correctOptionKey: "A",
        explanationText: "Pembahasan baru",
        options: expect.arrayContaining([
          expect.objectContaining({ key: "A", text: "Pilihan A" }),
        ]),
      })
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not render dialog content when isOpen is false", () => {
    render(<ScheduledQuestionFormModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText("Tambah Soal Baru")).not.toBeInTheDocument();
    expect(screen.queryByText("Edit Soal")).not.toBeInTheDocument();
  });
});
