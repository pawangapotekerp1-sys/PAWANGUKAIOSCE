import { cleanup, render, screen } from "@testing-library/react";
import { CircleNotch } from "@phosphor-icons/react";
import { afterEach, describe, expect, test } from "vitest";
import Button, { getButtonClassName } from "./button";
import SectionHeading from "./section-heading";

afterEach(() => {
  cleanup();
});

describe("shared primitive styling contract", () => {
  test("keeps section headings stacked on mobile", () => {
    render(
      <SectionHeading
        title="Ringkasan Hari Ini"
        description="Skor, prioritas, dan pintu masuk ke sesi berikutnya."
      />,
    );

    const heading = screen
      .getByText(/ringkasan hari ini/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })
      .closest(".ui-section-heading");

    expect(heading).toHaveClass("ui-section-heading");
    expect(heading).toHaveClass("flex-col");
    expect(heading).toHaveClass("sm:flex-row");
  });
});

describe("SectionHeading", () => {
  test("renders a section title and supporting copy", () => {
    render(
      <SectionHeading
        title="Ringkasan Hari Ini"
        description="Skor, prioritas, dan pintu masuk ke sesi berikutnya."
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: /ringkasan hari ini/i,
        level: 2,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/skor, prioritas, dan pintu masuk ke sesi berikutnya\./i),
    ).toBeInTheDocument();
  });

  test("renders eyebrow text and trailing actions when provided", () => {
    render(
      <SectionHeading
        eyebrow="Prioritas"
        title="Ringkasan Hari Ini"
        actions={<button type="button">Lihat detail</button>}
      />,
    );

    expect(screen.getByText("Prioritas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /lihat detail/i })).toBeInTheDocument();
  });

  test("keeps actions below the text block while preserving shared heading hierarchy", () => {
    render(
      <SectionHeading
        eyebrow="Prioritas"
        title="Ringkasan Hari Ini"
        description="Skor, prioritas, dan pintu masuk ke sesi berikutnya."
        actions={<button type="button">Lihat detail</button>}
      />,
    );

    const root = screen
      .getByText(/ringkasan hari ini/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })
      .closest(".ui-section-heading");
    const actionWrap = screen.getByRole("button", { name: /lihat detail/i }).parentElement;

    expect(root).toHaveClass("gap-4");
    expect(actionWrap).toHaveClass("w-full");
    expect(actionWrap).toHaveClass("sm:w-auto");
  });

  test("keeps supporting copy secondary and readable on compact screens", () => {
    render(
      <SectionHeading
        title="Ringkasan Hari Ini"
        description="Skor, prioritas, dan pintu masuk ke sesi berikutnya."
      />,
    );

    const description = screen.getByText(/skor, prioritas, dan pintu masuk ke sesi berikutnya\./i);

    expect(description).toHaveClass("mt-3");
    expect(description).toHaveClass("max-w-2xl");
  });
});

describe("Button", () => {
  test("shares button classes for link-based CTAs", () => {
    const className = getButtonClassName({
      fullWidth: true,
      size: "lg",
      variant: "outline",
    });

    expect(className).toContain("w-full");
    expect(className).toContain("inline-flex");
  });

  test("renders semantic variants through shared data attributes", () => {
    render(
      <Button variant="primary">
        Simpan perubahan
      </Button>,
    );

    const button = screen.getByRole("button", { name: /simpan perubahan/i });

    expect(button).toHaveAttribute("data-variant", "primary");
    expect(button.className).toContain("bg-primary");
  });

  test("keeps complex button layouts mounted directly under the button root", () => {
    render(
      <Button variant="outline">
        <div data-testid="button-layout" className="flex items-center gap-2">
          <span>A</span>
          <span>Pilihan A</span>
        </div>
      </Button>,
    );

    const button = screen.getByRole("button", { name: /pilihan a/i });
    expect(screen.getByTestId("button-layout").parentElement).toBe(button);
  });

  test("supports loading, disabled semantics, and icon slots", () => {
    render(
      <Button
        fullWidth
        leadingIcon={<CircleNotch aria-hidden="true" size={14} />}
        loading
        trailingIcon={<span aria-hidden="true">+</span>}
        variant="destructive"
      >
        Hapus soal
      </Button>,
    );

    const button = screen.getByRole("button", { name: /memproses/i });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("data-variant", "destructive");
  });
});
