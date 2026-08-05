import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import DiagnosisRangeControls from "./diagnosis-range-controls";

describe("Diagnosis range controls", () => {
  test("shows button hierarchy for preset and apply actions", () => {
    const onSelectPreset = vi.fn();
    const onDraftChange = vi.fn();
    const onApplyCustomRange = vi.fn();

    render(
      <DiagnosisRangeControls
        appliedRange={{ preset: "14d", dateFrom: "2026-06-05", dateTo: "2026-06-18" }}
        canApplyCustomRange
        draftRange={{ preset: "custom", dateFrom: "2026-06-01", dateTo: "2026-06-18" }}
        isApplying={false}
        onApplyCustomRange={onApplyCustomRange}
        onDraftChange={onDraftChange}
        onSelectPreset={onSelectPreset}
      />,
    );

    expect(screen.getByRole("button", { name: "14 hari" })).toHaveAttribute("data-variant", "primary");
    expect(screen.getByRole("button", { name: "7 hari" })).toHaveAttribute("data-variant", "outline");
    expect(screen.getByRole("button", { name: /^terapkan$/i })).toHaveAttribute("data-variant", "primary");

    fireEvent.click(screen.getByRole("button", { name: "30 hari" }));
    fireEvent.click(screen.getByRole("button", { name: /^terapkan$/i }));

    expect(onSelectPreset).toHaveBeenCalledWith("30d");
    expect(onApplyCustomRange).toHaveBeenCalledTimes(1);
  });

  test("disables the apply action while the range is not ready", () => {
    render(
      <DiagnosisRangeControls
        appliedRange={{ preset: "7d", dateFrom: "2026-06-12", dateTo: "2026-06-18" }}
        canApplyCustomRange={false}
        draftRange={{ preset: "custom", dateFrom: "2026-06-18", dateTo: "" }}
        isApplying={false}
        onApplyCustomRange={vi.fn()}
        onDraftChange={vi.fn()}
        onSelectPreset={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("button", { name: /^terapkan$/i }).at(-1)).toBeDisabled();
  });
});
