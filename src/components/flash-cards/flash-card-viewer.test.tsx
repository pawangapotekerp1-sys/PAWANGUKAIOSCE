import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import FlashCardViewer from "./flash-card-viewer";

describe("FlashCardViewer", () => {
  test("flips card front and back and handles first or last navigation safely", () => {
    render(
      <FlashCardViewer
        cards={[
          {
            id: "card-1",
            frontText: "Kapan ACE inhibitor dipilih?",
            backText: "Saat albuminuria atau CKD yang relevan.",
            sortOrder: 1,
            savedDifficulty: null,
            lastReviewedAt: null,
          },
          {
            id: "card-2",
            frontText: "Apa target tekanan darah?",
            backText: "Kurang dari 130/80 mmHg pada banyak pasien CKD.",
            sortOrder: 2,
            savedDifficulty: "medium",
            lastReviewedAt: "2026-06-06T12:05:00.000Z",
          },
        ]}
      />,
    );

    expect(screen.getByText(/kapan ace inhibitor dipilih/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sebelumnya/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /sebelumnya/i })).toHaveAttribute("data-variant", "outline");
    expect(screen.getByRole("button", { name: /balik kartu/i })).toHaveAttribute("data-variant", "primary");
    expect(screen.getByRole("button", { name: /berikutnya/i })).toHaveAttribute("data-variant", "outline");

    fireEvent.click(screen.getByRole("button", { name: /balik kartu/i }));
    expect(screen.getByText(/saat albuminuria atau ckd yang relevan/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /berikutnya/i }));
    expect(screen.getByText(/apa target tekanan darah/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /berikutnya/i })).toBeDisabled();
  });
});
