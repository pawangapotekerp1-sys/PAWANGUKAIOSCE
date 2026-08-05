export type DiagnosisRangePreset = "7d" | "14d" | "30d" | "custom";

export type DiagnosisRangeDraft = {
  preset: DiagnosisRangePreset;
  dateFrom: string;
  dateTo: string;
};

const DIAGNOSIS_PRESET_DAYS: Record<Exclude<DiagnosisRangePreset, "custom">, number> = {
  "7d": 7,
  "14d": 14,
  "30d": 30,
};

function padDatePart(value: number): string {
  return value.toString().padStart(2, "0");
}

function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function subtractCalendarDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() - days);
  return next;
}

export function createPresetDiagnosisRange(
  preset: Exclude<DiagnosisRangePreset, "custom">,
  now = new Date(),
): DiagnosisRangeDraft {
  const spanDays = DIAGNOSIS_PRESET_DAYS[preset];
  const dateTo = formatLocalDate(now);
  const dateFrom = formatLocalDate(subtractCalendarDays(now, spanDays - 1));

  return {
    preset,
    dateFrom,
    dateTo,
  };
}

export function createDefaultDiagnosisRange(now = new Date()): DiagnosisRangeDraft {
  return createPresetDiagnosisRange("7d", now);
}

export function toAppliedDiagnosisRange(input: DiagnosisRangeDraft): DiagnosisRangeDraft | null {
  if (!input.dateFrom || !input.dateTo || input.dateFrom > input.dateTo) {
    return null;
  }

  return input;
}

export function resolveUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}
