import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import FlashCardRecallControls from "./flash-card-recall-controls";

describe("FlashCardRecallControls", () => {
  test("renders and updates mudah, sedang, and sulit actions", () => {
    const handleSelect = vi.fn();

    render(
      <FlashCardRecallControls
        selectedDifficulty="medium"
        onSelect={handleSelect}
      />,
    );

    expect(screen.getByRole("button", { name: /sedang/i })).toHaveAttribute("data-selected", "true");
    expect(screen.getByRole("button", { name: /sedang/i })).toHaveAttribute("data-variant", "secondary");
    expect(screen.getByRole("button", { name: /mudah/i })).toHaveAttribute("data-variant", "outline");
    expect(screen.getByRole("button", { name: /sulit/i })).toHaveAttribute("data-variant", "outline");

    fireEvent.click(screen.getByRole("button", { name: /sulit/i }));

    expect(handleSelect).toHaveBeenCalledWith("hard");
  });
});
