import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import QuestionBlockListView from "./question-block-list-view";
import type { BlockDefinition } from "../questions-page-blocks";
import type { QuestionBankItemViewModel } from "../../../lib/mappers/question-authoring-mappers";

describe("QuestionBlockListView", () => {
  afterEach(() => {
    cleanup();
  });

  const mockActiveBlock: BlockDefinition = {
    id: "clinical-science",
    name: "Clinical Science",
    description: "Farmakoterapi, evaluasi kasus klinis, interaksi obat, dan interpretasi laboratorium klinis.",
    colorTheme: "teal",
    matchNames: ["clinical science"],
  };

  const createMockQuestion = (
    overrides: Partial<QuestionBankItemViewModel> = {}
  ): QuestionBankItemViewModel => ({
    id: "q-1",
    stem: "Seorang pasien berusia 45 tahun mengalami hipertensi stage 1...",
    status: "published",
    statusLabel: "Published",
    blockId: "clinical-science",
    blockName: "Clinical Science",
    topicId: "topic-1",
    topicName: "Farmakoterapi Kardiovaskular",
    questionImageUrl: null,
    hasQuestionImage: false,
    hasExplanationText: false,
    hasExplanationImage: false,
    updatedAt: "2026-03-01T10:00:00Z",
    ...overrides,
  });

  const mockQuestions: QuestionBankItemViewModel[] = [
    createMockQuestion({
      id: "q-cs-1",
      stem: "Soal CS 1 - Hipertensi",
      topicName: "Kardiovaskular",
      status: "published",
      statusLabel: "Published",
      hasQuestionImage: true,
    }),
    createMockQuestion({
      id: "q-cs-2",
      stem: "Soal CS 2 - Asma",
      topicName: "Respirasi",
      status: "draft",
      statusLabel: "Draft",
      hasExplanationText: true,
      hasExplanationImage: true,
    }),
    createMockQuestion({
      id: "q-cs-3",
      stem: "Soal CS 3 - Tanpa Materi",
      topicName: null,
      status: "draft",
      statusLabel: "Draft",
    }),
    createMockQuestion({
      id: "q-ps-1",
      stem: "Soal PS 1 - Formulasi Tablet",
      blockId: "pharmaceutical-science",
      blockName: "Pharmaceutical Science",
      topicName: "Formulasi",
    }),
  ];

  it("renders header with back button, block name, count badge, description, and new question link", () => {
    const handleBack = vi.fn();

    render(
      <MemoryRouter>
        <QuestionBlockListView
          basePath="/admin/questions"
          activeBlock={mockActiveBlock}
          questions={mockQuestions}
          onBack={handleBack}
          onDeleteQuestion={vi.fn()}
          onBulkDelete={vi.fn()}
        />
      </MemoryRouter>
    );

    const backButton = screen.getByRole("button", { name: /kembali ke pilihan blok/i });
    expect(backButton).toBeInTheDocument();
    fireEvent.click(backButton);
    expect(handleBack).toHaveBeenCalledTimes(1);

    const heading = screen.getByRole("heading", { level: 2, name: /clinical science/i });
    expect(heading).toBeInTheDocument();

    expect(screen.getByText("3 Soal")).toBeInTheDocument();
    expect(screen.getByText(mockActiveBlock.description)).toBeInTheDocument();

    const addLink = screen.getByRole("link", { name: /tambah soal/i });
    expect(addLink).toBeInTheDocument();
    expect(addLink).toHaveAttribute("href", "/admin/questions/new?block=clinical-science");
  });

  it("supports mentor basePath for new question link", () => {
    render(
      <MemoryRouter>
        <QuestionBlockListView
          basePath="/app/questions"
          activeBlock={mockActiveBlock}
          questions={mockQuestions}
          onBack={vi.fn()}
          onDeleteQuestion={vi.fn()}
          onBulkDelete={vi.fn()}
        />
      </MemoryRouter>
    );

    const addLink = screen.getByRole("link", { name: /tambah soal/i });
    expect(addLink).toHaveAttribute("href", "/app/questions/new?block=clinical-science");
  });

  it("renders only Materi filter dropdown and NO block dropdown", () => {
    render(
      <MemoryRouter>
        <QuestionBlockListView
          basePath="/admin/questions"
          activeBlock={mockActiveBlock}
          questions={mockQuestions}
          onBack={vi.fn()}
          onDeleteQuestion={vi.fn()}
          onBulkDelete={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.queryByLabelText(/blok/i)).not.toBeInTheDocument();

    const materiSelect = screen.getByLabelText("Materi") as HTMLSelectElement;
    expect(materiSelect).toBeInTheDocument();

    const options = Array.from(materiSelect.options).map((opt) => opt.value);
    expect(options).toEqual(["all", "unassigned", "Kardiovaskular", "Respirasi"]);
  });

  it("does not render 'unassigned' option when all questions in active block have topics", () => {
    const questionsWithTopicsOnly = mockQuestions.filter((q) => q.id !== "q-cs-3");

    render(
      <MemoryRouter>
        <QuestionBlockListView
          basePath="/admin/questions"
          activeBlock={mockActiveBlock}
          questions={questionsWithTopicsOnly}
          onBack={vi.fn()}
          onDeleteQuestion={vi.fn()}
          onBulkDelete={vi.fn()}
        />
      </MemoryRouter>
    );

    const materiSelect = screen.getByLabelText("Materi") as HTMLSelectElement;
    const options = Array.from(materiSelect.options).map((opt) => opt.value);
    expect(options).toEqual(["all", "Kardiovaskular", "Respirasi"]);
  });

  it("filters questions strictly by selected topic", () => {
    render(
      <MemoryRouter>
        <QuestionBlockListView
          basePath="/admin/questions"
          activeBlock={mockActiveBlock}
          questions={mockQuestions}
          onBack={vi.fn()}
          onDeleteQuestion={vi.fn()}
          onBulkDelete={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("Soal CS 1 - Hipertensi")).toBeInTheDocument();
    expect(screen.getByText("Soal CS 2 - Asma")).toBeInTheDocument();
    expect(screen.getByText("Soal CS 3 - Tanpa Materi")).toBeInTheDocument();
    expect(screen.queryByText("Soal PS 1 - Formulasi Tablet")).not.toBeInTheDocument();

    const materiSelect = screen.getByLabelText("Materi");
    fireEvent.change(materiSelect, { target: { value: "Kardiovaskular" } });

    expect(screen.getByText("Soal CS 1 - Hipertensi")).toBeInTheDocument();
    expect(screen.queryByText("Soal CS 2 - Asma")).not.toBeInTheDocument();
    expect(screen.queryByText("Soal CS 3 - Tanpa Materi")).not.toBeInTheDocument();
    expect(screen.getByText("1 Soal")).toBeInTheDocument();
  });

  it("filters unassigned questions when 'unassigned' is selected", () => {
    render(
      <MemoryRouter>
        <QuestionBlockListView
          basePath="/admin/questions"
          activeBlock={mockActiveBlock}
          questions={mockQuestions}
          onBack={vi.fn()}
          onDeleteQuestion={vi.fn()}
          onBulkDelete={vi.fn()}
        />
      </MemoryRouter>
    );

    const materiSelect = screen.getByLabelText("Materi");
    fireEvent.change(materiSelect, { target: { value: "unassigned" } });

    expect(screen.queryByText("Soal CS 1 - Hipertensi")).not.toBeInTheDocument();
    expect(screen.queryByText("Soal CS 2 - Asma")).not.toBeInTheDocument();
    expect(screen.getByText("Soal CS 3 - Tanpa Materi")).toBeInTheDocument();
    expect(screen.getByText("Tidak memiliki materi")).toBeInTheDocument();
    expect(screen.getByText("1 Soal")).toBeInTheDocument();
  });

  it("shows empty state alert when no questions match in the active block", () => {
    render(
      <MemoryRouter>
        <QuestionBlockListView
          basePath="/admin/questions"
          activeBlock={mockActiveBlock}
          questions={[
            createMockQuestion({
              id: "q-ps-1",
              blockId: "pharmaceutical-science",
              blockName: "Pharmaceutical Science",
            }),
          ]}
          onBack={vi.fn()}
          onDeleteQuestion={vi.fn()}
          onBulkDelete={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("Soal tidak ditemukan")).toBeInTheDocument();
    expect(
      screen.getByText(
        `Tidak ada soal yang cocok dengan filter materi ini pada blok ${mockActiveBlock.name}.`
      )
    ).toBeInTheDocument();
    expect(screen.getByText("0 Soal")).toBeInTheDocument();
  });

  it("handles bulk selection, select-all toggle, and bulk delete", () => {
    const handleBulkDelete = vi.fn();

    render(
      <MemoryRouter>
        <QuestionBlockListView
          basePath="/admin/questions"
          activeBlock={mockActiveBlock}
          questions={mockQuestions}
          onBack={vi.fn()}
          onDeleteQuestion={vi.fn()}
          onBulkDelete={handleBulkDelete}
        />
      </MemoryRouter>
    );

    const bulkDeleteButton = screen.getByRole("button", { name: /hapus terpilih/i });
    expect(bulkDeleteButton).toBeDisabled();
    expect(screen.getByText("0 soal dipilih.")).toBeInTheDocument();

    const selectAllCheckbox = screen.getByLabelText("Pilih semua") as HTMLInputElement;
    expect(selectAllCheckbox.checked).toBe(false);

    // Toggle select all
    fireEvent.click(selectAllCheckbox);
    expect(selectAllCheckbox.checked).toBe(true);
    expect(screen.getByText("3 soal dipilih.")).toBeInTheDocument();
    expect(bulkDeleteButton).not.toBeDisabled();

    // Click bulk delete
    fireEvent.click(bulkDeleteButton);
    expect(handleBulkDelete).toHaveBeenCalledWith(["q-cs-1", "q-cs-2", "q-cs-3"]);

    // Toggle select all off
    fireEvent.click(selectAllCheckbox);
    expect(selectAllCheckbox.checked).toBe(false);
    expect(screen.getByText("0 soal dipilih.")).toBeInTheDocument();
    expect(bulkDeleteButton).toBeDisabled();
  });

  it("handles individual question selection checkbox", () => {
    render(
      <MemoryRouter>
        <QuestionBlockListView
          basePath="/admin/questions"
          activeBlock={mockActiveBlock}
          questions={mockQuestions}
          onBack={vi.fn()}
          onDeleteQuestion={vi.fn()}
          onBulkDelete={vi.fn()}
        />
      </MemoryRouter>
    );

    const checkbox1 = screen.getByLabelText("Pilih soal Soal CS 1 - Hipertensi") as HTMLInputElement;
    expect(checkbox1.checked).toBe(false);

    fireEvent.click(checkbox1);
    expect(checkbox1.checked).toBe(true);
    expect(screen.getByText("1 soal dipilih.")).toBeInTheDocument();

    fireEvent.click(checkbox1);
    expect(checkbox1.checked).toBe(false);
    expect(screen.getByText("0 soal dipilih.")).toBeInTheDocument();
  });

  it("clears selected questions that are no longer visible when filter changes", () => {
    render(
      <MemoryRouter>
        <QuestionBlockListView
          basePath="/admin/questions"
          activeBlock={mockActiveBlock}
          questions={mockQuestions}
          onBack={vi.fn()}
          onDeleteQuestion={vi.fn()}
          onBulkDelete={vi.fn()}
        />
      </MemoryRouter>
    );

    const checkbox1 = screen.getByLabelText("Pilih soal Soal CS 1 - Hipertensi");
    fireEvent.click(checkbox1);
    expect(screen.getByText("1 soal dipilih.")).toBeInTheDocument();

    // Change filter to Respirasi (Soal CS 1 should be hidden and deselected)
    const materiSelect = screen.getByLabelText("Materi");
    fireEvent.change(materiSelect, { target: { value: "Respirasi" } });

    expect(screen.getByText("0 soal dipilih.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /hapus terpilih/i })).toBeDisabled();
  });

  it("renders question card details: badges, media indicators, edit link, and delete button", () => {
    const handleDeleteQuestion = vi.fn();

    render(
      <MemoryRouter>
        <QuestionBlockListView
          basePath="/admin/questions"
          activeBlock={mockActiveBlock}
          questions={mockQuestions}
          onBack={vi.fn()}
          onDeleteQuestion={handleDeleteQuestion}
          onBulkDelete={vi.fn()}
        />
      </MemoryRouter>
    );

    // Published status badge
    expect(screen.getByText("Published")).toBeInTheDocument();
    // Draft status badge
    expect(screen.getAllByText("Draft")).toHaveLength(2);

    // Topic badge
    expect(screen.getAllByText("Kardiovaskular").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Respirasi").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Tidak memiliki materi")).toBeInTheDocument();

    // Media badges
    expect(screen.getByText("Gambar soal")).toBeInTheDocument();
    expect(screen.getByText("Pembahasan")).toBeInTheDocument();
    expect(screen.getByText("Gambar pembahasan")).toBeInTheDocument();

    // Edit link
    const editLinks = screen.getAllByRole("link", { name: /edit soal/i });
    expect(editLinks[0]).toHaveAttribute("href", "/admin/questions/q-cs-1/edit");

    // Delete single question button
    const deleteButtons = screen.getAllByRole("button", { name: /hapus soal/i });
    expect(deleteButtons).toHaveLength(3);
    fireEvent.click(deleteButtons[0]);
    expect(handleDeleteQuestion).toHaveBeenCalledWith("q-cs-1");
  });

  it("disables delete buttons when isDeleting is true", () => {
    render(
      <MemoryRouter>
        <QuestionBlockListView
          basePath="/admin/questions"
          activeBlock={mockActiveBlock}
          questions={mockQuestions}
          onBack={vi.fn()}
          onDeleteQuestion={vi.fn()}
          onBulkDelete={vi.fn()}
          isDeleting={true}
        />
      </MemoryRouter>
    );

    const deleteButtons = screen.getAllByRole("button", { name: /hapus soal/i });
    deleteButtons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });

    const bulkDeleteButton = screen.getByRole("button", { name: /hapus terpilih/i });
    expect(bulkDeleteButton).toBeDisabled();
  });

  it("displays deleteError alert when deleteError is provided", () => {
    render(
      <MemoryRouter>
        <QuestionBlockListView
          basePath="/admin/questions"
          activeBlock={mockActiveBlock}
          questions={mockQuestions}
          onBack={vi.fn()}
          onDeleteQuestion={vi.fn()}
          onBulkDelete={vi.fn()}
          deleteError="Gagal menghapus soal karena kendala jaringan."
        />
      </MemoryRouter>
    );

    expect(screen.getByText("Gagal menghapus soal karena kendala jaringan.")).toBeInTheDocument();
  });
});
