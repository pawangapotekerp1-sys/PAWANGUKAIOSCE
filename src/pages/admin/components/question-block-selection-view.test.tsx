import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import QuestionBlockSelectionView from "./question-block-selection-view";

describe("QuestionBlockSelectionView", () => {
  afterEach(() => {
    cleanup();
  });

  const mockQuestions = [
    { blockName: "Clinical Science" },
    { blockName: "clinical science" },
    { blockName: "Pharmaceutical Science" },
    { blockName: "Unknown Block" },
  ];

  it("renders top control banner with title, subtitle, and new question link", () => {
    const handleSelectBlock = vi.fn();

    render(
      <MemoryRouter>
        <QuestionBlockSelectionView
          basePath="/admin/questions"
          questions={mockQuestions}
          onSelectBlock={handleSelectBlock}
        />
      </MemoryRouter>
    );

    const heading = screen.getByRole("heading", { level: 1, name: "Bank Soal" });
    expect(heading).toBeInTheDocument();

    expect(
      screen.getByText(
        "Pilih blok bidang farmasi untuk melihat, mengelola, menyunting, dan menyaring bank soal."
      )
    ).toBeInTheDocument();

    const addLink = screen.getByRole("link", { name: /tambah soal/i });
    expect(addLink).toBeInTheDocument();
    expect(addLink).toHaveAttribute("href", "/admin/questions/new");
  });

  it("supports mentor basePath for new question link", () => {
    const handleSelectBlock = vi.fn();

    render(
      <MemoryRouter>
        <QuestionBlockSelectionView
          basePath="/app/questions"
          questions={mockQuestions}
          onSelectBlock={handleSelectBlock}
        />
      </MemoryRouter>
    );

    const addLink = screen.getByRole("link", { name: /tambah soal/i });
    expect(addLink).toHaveAttribute("href", "/app/questions/new");
  });

  it("renders all 3 standard blocks with title, description, and correct question count badges", () => {
    const handleSelectBlock = vi.fn();

    render(
      <MemoryRouter>
        <QuestionBlockSelectionView
          basePath="/admin/questions"
          questions={mockQuestions}
          onSelectBlock={handleSelectBlock}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("Clinical Science")).toBeInTheDocument();
    expect(screen.getByText("Pharmaceutical Science")).toBeInTheDocument();
    expect(
      screen.getByText("Social Behavioural Administration of Pharmacy")
    ).toBeInTheDocument();

    expect(screen.getByText("2 Soal")).toBeInTheDocument();
    expect(screen.getByText("1 Soal")).toBeInTheDocument();
    expect(screen.getByText("0 Soal")).toBeInTheDocument();
  });

  it("renders block action buttons with 'Buka Bank Soal'", () => {
    const handleSelectBlock = vi.fn();

    render(
      <MemoryRouter>
        <QuestionBlockSelectionView
          basePath="/admin/questions"
          questions={mockQuestions}
          onSelectBlock={handleSelectBlock}
        />
      </MemoryRouter>
    );

    const actionButtons = screen.getAllByRole("button", { name: /buka bank soal/i });
    expect(actionButtons).toHaveLength(3);
  });

  it("calls onSelectBlock when clicking the action button", () => {
    const handleSelectBlock = vi.fn();

    render(
      <MemoryRouter>
        <QuestionBlockSelectionView
          basePath="/admin/questions"
          questions={mockQuestions}
          onSelectBlock={handleSelectBlock}
        />
      </MemoryRouter>
    );

    const actionButtons = screen.getAllByRole("button", { name: /buka bank soal/i });
    fireEvent.click(actionButtons[0]);

    expect(handleSelectBlock).toHaveBeenCalledTimes(1);
    expect(handleSelectBlock).toHaveBeenCalledWith("clinical-science");

    fireEvent.click(actionButtons[1]);
    expect(handleSelectBlock).toHaveBeenCalledWith("pharmaceutical-science");

    fireEvent.click(actionButtons[2]);
    expect(handleSelectBlock).toHaveBeenCalledWith("social-behavioural-administration");
  });

  it("calls onSelectBlock when clicking the block card itself", () => {
    const handleSelectBlock = vi.fn();

    render(
      <MemoryRouter>
        <QuestionBlockSelectionView
          basePath="/admin/questions"
          questions={mockQuestions}
          onSelectBlock={handleSelectBlock}
        />
      </MemoryRouter>
    );

    const clinicalTitle = screen.getByText("Clinical Science");
    fireEvent.click(clinicalTitle);

    expect(handleSelectBlock).toHaveBeenCalledWith("clinical-science");
  });

  it("calls onSelectBlock when pressing Enter or Space on a block card", () => {
    const handleSelectBlock = vi.fn();

    render(
      <MemoryRouter>
        <QuestionBlockSelectionView
          basePath="/admin/questions"
          questions={mockQuestions}
          onSelectBlock={handleSelectBlock}
        />
      </MemoryRouter>
    );

    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(3);

    fireEvent.keyDown(cards[0], { key: "Enter" });
    expect(handleSelectBlock).toHaveBeenCalledWith("clinical-science");

    fireEvent.keyDown(cards[1], { key: " " });
    expect(handleSelectBlock).toHaveBeenCalledWith("pharmaceutical-science");
  });
});
