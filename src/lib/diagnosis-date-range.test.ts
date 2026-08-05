import { afterEach, describe, expect, test, vi } from "vitest";
import {
  createDefaultDiagnosisRange,
  createPresetDiagnosisRange,
  resolveUserTimezone,
  toAppliedDiagnosisRange,
} from "./diagnosis-date-range";

describe("diagnosis date range helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("creates the default last-7-day range ending on the provided date", () => {
    expect(createDefaultDiagnosisRange(new Date("2026-05-09T10:00:00+07:00"))).toEqual({
      preset: "7d",
      dateFrom: "2026-05-03",
      dateTo: "2026-05-09",
    });
  });

  test("creates stable 14-day and 30-day preset ranges", () => {
    const now = new Date("2026-05-09T10:00:00+07:00");

    expect(createPresetDiagnosisRange("14d", now)).toEqual({
      preset: "14d",
      dateFrom: "2026-04-26",
      dateTo: "2026-05-09",
    });

    expect(createPresetDiagnosisRange("30d", now)).toEqual({
      preset: "30d",
      dateFrom: "2026-04-10",
      dateTo: "2026-05-09",
    });
  });

  test("returns null for an invalid custom range", () => {
    expect(
      toAppliedDiagnosisRange({
        preset: "custom",
        dateFrom: "2026-05-10",
        dateTo: "2026-05-09",
      }),
    ).toBeNull();
  });

  test("falls back to UTC when the browser timezone is unavailable", () => {
    vi.spyOn(Intl, "DateTimeFormat").mockReturnValue({
      resolvedOptions: () => ({
        calendar: "gregory",
        locale: "id-ID",
        numberingSystem: "latn",
        timeZone: undefined,
      }),
    } as unknown as Intl.DateTimeFormat);

    expect(resolveUserTimezone()).toBe("UTC");
  });
});
