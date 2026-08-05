import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { SessionAnswerOptionButton, SessionQuestionNavButton } from "./session-option-buttons";

afterEach(() => {
  cleanup();
});

describe("session option buttons", () => {
  test("promotes selected answer styling above the shared outline defaults", () => {
    render(
      <SessionAnswerOptionButton
        onClick={() => {}}
        optionKey="A"
        optionText="Pilihan A"
        selected
      />,
    );

    const button = screen.getByRole("button", { name: /a pilihan a/i });

    expect(button.className).toContain("!border-emerald-500/50");
    expect(button.className).toContain("!bg-emerald-500/10");
  });

  test.each([
    ["idle", "border-border/80", "bg-card", "text-foreground"],
    ["doubtful", "!border-amber-500", "!bg-amber-500", "!text-white"],
    ["answered", "!border-emerald-600", "!bg-emerald-600", "!text-white"],
  ] as const)(
    "promotes %s question navigation styling above the shared outline defaults",
    (state, borderClassName, backgroundClassName, textClassName) => {
      render(
        <SessionQuestionNavButton
          number={1}
          onClick={() => {}}
          state={state}
        />,
      );

      const button = screen.getByRole("button", { name: /^1$/ });

      expect(button.className).toContain(borderClassName);
      expect(button.className).toContain(backgroundClassName);
      expect(button.className).toContain(textClassName);
    },
  );
});
