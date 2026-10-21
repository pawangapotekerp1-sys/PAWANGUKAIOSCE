import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import MobileQuestionNavDrawer from "./mobile-question-nav-drawer";

afterEach(() => {
  cleanup();
});

describe("MobileQuestionNavDrawer", () => {
  it("renders floating pill trigger with current question progress", () => {
    render(
      <MobileQuestionNavDrawer
        currentIndex={0}
        totalQuestions={30}
        onSelectQuestion={vi.fn()}
        renderGrid={() => <div>Grid Content</div>}
      />
    );

    const trigger = screen.getByRole("button", { name: /navigasi soal/i });
    expect(trigger).toBeInTheDocument();
    expect(screen.getByText(/soal/i)).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText(/\/ 30/)).toBeInTheDocument();
  });

  it("opens the sheet when trigger is clicked and renders header with title and progress", async () => {
    render(
      <MobileQuestionNavDrawer
        currentIndex={4}
        totalQuestions={20}
        title="Daftar Soal Tryout"
        onSelectQuestion={vi.fn()}
        legend={<div data-testid="test-legend">Legend Content</div>}
        renderGrid={() => <div>Mock Grid Items</div>}
      />
    );

    const trigger = screen.getByRole("button", { name: /navigasi soal/i });
    fireEvent.click(trigger);

    expect(await screen.findByText("Daftar Soal Tryout")).toBeInTheDocument();
    expect(screen.getByText(/soal aktif: 5 dari 20/i)).toBeInTheDocument();
    expect(screen.getByTestId("test-legend")).toBeInTheDocument();
    expect(screen.getByText("Mock Grid Items")).toBeInTheDocument();
  });

  it("calls onSelectQuestion and closes the sheet when a question is selected", async () => {
    const handleSelectQuestion = vi.fn();

    render(
      <MobileQuestionNavDrawer
        currentIndex={0}
        totalQuestions={15}
        onSelectQuestion={handleSelectQuestion}
        renderGrid={({ close }) => (
          <div>
            <button
              type="button"
              onClick={() => {
                handleSelectQuestion(3);
                close();
              }}
            >
              Soal 4
            </button>
          </div>
        )}
      />
    );

    const trigger = screen.getByRole("button", { name: /navigasi soal/i });
    fireEvent.click(trigger);

    const questionButton = await screen.findByRole("button", { name: /soal 4/i });
    fireEvent.click(questionButton);

    expect(handleSelectQuestion).toHaveBeenCalledWith(3);
    // After closing, dialog content should be closed / unmounted or hidden
    expect(screen.queryByText(/soal aktif: 1 dari 15/i)).not.toBeInTheDocument();
  });

  it("closes the sheet when close button is clicked", async () => {
    render(
      <MobileQuestionNavDrawer
        currentIndex={0}
        totalQuestions={10}
        onSelectQuestion={vi.fn()}
        renderGrid={() => <div>Grid Items</div>}
      />
    );

    const trigger = screen.getByRole("button", { name: /navigasi soal/i });
    fireEvent.click(trigger);

    const closeButton = await screen.findByRole("button", { name: /tutup/i });
    fireEvent.click(closeButton);

    expect(screen.queryByText(/soal aktif: 1 dari 10/i)).not.toBeInTheDocument();
  });

  it("respects responsive breakpoint prop (md gives md:hidden, xl gives xl:hidden)", () => {
    const { container: containerMd } = render(
      <MobileQuestionNavDrawer
        breakpoint="md"
        currentIndex={0}
        totalQuestions={10}
        onSelectQuestion={vi.fn()}
        renderGrid={() => null}
      />
    );
    expect(containerMd.firstElementChild).toHaveClass("md:hidden");
    expect(containerMd.firstElementChild).not.toHaveClass("xl:hidden");

    cleanup();

    const { container: containerXl } = render(
      <MobileQuestionNavDrawer
        breakpoint="xl"
        currentIndex={0}
        totalQuestions={10}
        onSelectQuestion={vi.fn()}
        renderGrid={() => null}
      />
    );
    expect(containerXl.firstElementChild).toHaveClass("xl:hidden");
    expect(containerXl.firstElementChild).not.toHaveClass("md:hidden");
  });

  it("disables the trigger button when disabled prop is true", () => {
    render(
      <MobileQuestionNavDrawer
        disabled={true}
        currentIndex={0}
        totalQuestions={10}
        onSelectQuestion={vi.fn()}
        renderGrid={() => null}
      />
    );

    const trigger = screen.getByRole("button", { name: /navigasi soal/i });
    expect(trigger).toBeDisabled();
  });
});
