import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import GeneratedDraftEditor from "./generated-draft-editor";

describe("GeneratedDraftEditor", () => {
  test("persists manual changes to stem, options, correct answer, and explanation", () => {
    const onSave = vi.fn();

    render(
      <GeneratedDraftEditor
        item={{
          id: "item-1",
          draftQuestionId: "draft-1",
          order: 1,
          variationMode: "different_trap_same_objective",
          variationModeLabel: "Jebakan baru, tujuan sama",
          status: "draft_generated",
          editedAt: null,
          stem: "Stem awal",
          options: {
            A: "Pilihan A",
            B: "Pilihan B",
            C: "Pilihan C",
            D: "Pilihan D",
            E: "Pilihan E",
          },
          correctOptionKey: "B",
          explanationText: "Pembahasan awal",
          referenceLabel: "KDIGO CKD guideline",
          referenceUrl: "https://kdigo.org/guidelines/ckd/",
          deliveries: [],
          deliverySummaryLabel: "Belum dikirim",
        }}
        onSave={onSave}
      />,
    );

    const draftCard = screen.getByRole("article", { name: /soal 1/i });
    expect(within(draftCard).getByRole("button", { name: /simpan perubahan/i })).toHaveAttribute("data-variant", "primary");

    fireEvent.change(within(draftCard).getByLabelText(/^pertanyaan$/i), {
      target: { value: "Stem revisi" },
    });
    fireEvent.change(within(draftCard).getByLabelText(/opsi d/i), {
      target: { value: "Distraktor revisi" },
    });
    fireEvent.change(within(draftCard).getByLabelText(/kunci jawaban/i), {
      target: { value: "D" },
    });
    fireEvent.change(within(draftCard).getByLabelText(/pembahasan/i), {
      target: { value: "Pembahasan revisi" },
    });
    fireEvent.click(within(draftCard).getByRole("button", { name: /simpan perubahan/i }));

    expect(onSave).toHaveBeenCalledWith({
      generationItemId: "item-1",
      stem: "Stem revisi",
      options: {
        A: "Pilihan A",
        B: "Pilihan B",
        C: "Pilihan C",
        D: "Distraktor revisi",
        E: "Pilihan E",
      },
      correctOptionKey: "D",
      explanationText: "Pembahasan revisi",
    });
    expect(within(draftCard).getByText(/jebakan baru, tujuan sama/i)).toBeInTheDocument();
    expect(within(draftCard).getByRole("link", { name: /kdigo ckd guideline/i })).toHaveAttribute(
      "href",
      "https://kdigo.org/guidelines/ckd/",
    );
  });

  test("disables distribution buttons while the item is being delivered", () => {
    render(
      <GeneratedDraftEditor
        isDistributing
        item={{
          id: "item-1",
          draftQuestionId: "draft-1",
          order: 1,
          variationMode: "new_case_same_concept",
          variationModeLabel: "Kasus baru, konsep sama",
          status: "draft_generated",
          editedAt: null,
          stem: "Stem awal",
          options: {
            A: "Pilihan A",
            B: "Pilihan B",
            C: "Pilihan C",
            D: "Pilihan D",
            E: "Pilihan E",
          },
          correctOptionKey: "B",
          explanationText: "Pembahasan awal",
          referenceLabel: "WHO therapy guideline",
          referenceUrl: "https://www.who.int/publications/example",
          deliveries: [],
          deliverySummaryLabel: "Belum dikirim",
        }}
        onDistributeToQuestionBank={vi.fn()}
        onDistributeToScheduledEvent={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /kirim ke bank soal/i })).toHaveAttribute("data-variant", "outline");
    expect(screen.getByRole("button", { name: /kirim ke sesi/i })).toHaveAttribute("data-variant", "outline");
    expect(screen.getByRole("button", { name: /kirim ke bank soal/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /kirim ke sesi/i })).toBeDisabled();
  });

  test("shows a legacy fallback instead of rendering an empty source link when old batches have no stored reference metadata", () => {
    render(
      <GeneratedDraftEditor
        item={{
          id: "item-legacy",
          draftQuestionId: "draft-legacy",
          order: 3,
          variationMode: "new_case_same_concept",
          variationModeLabel: "Kasus baru, konsep sama",
          status: "draft_generated",
          editedAt: null,
          stem: "Stem lama",
          options: {
            A: "Pilihan A",
            B: "Pilihan B",
            C: "Pilihan C",
            D: "Pilihan D",
            E: "Pilihan E",
          },
          correctOptionKey: "A",
          explanationText: "Pembahasan lama",
          referenceLabel: "",
          referenceUrl: "",
          deliveries: [],
          deliverySummaryLabel: "Belum dikirim",
        }}
        onSave={vi.fn()}
      />,
    );

    const draftCard = screen.getByRole("article", { name: /soal 3/i });

    expect(within(draftCard).getByText(/batch lama belum menyimpan sumber acuan/i)).toBeInTheDocument();
    expect(within(draftCard).queryByRole("link")).not.toBeInTheDocument();
  });
});
