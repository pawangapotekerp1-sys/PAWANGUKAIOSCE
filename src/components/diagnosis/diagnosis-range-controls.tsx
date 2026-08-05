import Button from "../ui/button";
import type { DiagnosisRangeDraft } from "../../lib/diagnosis-date-range";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Calendar, CalendarRange, Filter } from "lucide-react";

type DiagnosisRangeControlsProps = {
  draftRange: DiagnosisRangeDraft;
  appliedRange: DiagnosisRangeDraft;
  canApplyCustomRange: boolean;
  onSelectPreset: (preset: "7d" | "14d" | "30d") => void;
  onDraftChange: (next: DiagnosisRangeDraft) => void;
  onApplyCustomRange: () => void;
  isApplying: boolean;
};

const RANGE_PRESET_OPTIONS: Array<{ label: string; value: "7d" | "14d" | "30d" }> = [
  { label: "7 hari", value: "7d" },
  { label: "14 hari", value: "14d" },
  { label: "30 hari", value: "30d" },
];

function isPresetActive(appliedRange: DiagnosisRangeDraft, preset: "7d" | "14d" | "30d"): boolean {
  return appliedRange.preset === preset;
}

function DiagnosisRangeControls({
  draftRange,
  appliedRange,
  canApplyCustomRange,
  onSelectPreset,
  onDraftChange,
  onApplyCustomRange,
  isApplying,
}: DiagnosisRangeControlsProps) {
  return (
    <Card className="mt-6 border-border/60 shadow-sm overflow-hidden bg-card/80 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between pb-5 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarRange className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                Periode Analisis
              </p>
              <p className="text-sm font-medium text-muted-foreground mt-0.5">
                Menampilkan data dari <span className="text-foreground font-semibold">{appliedRange.dateFrom}</span> sampai <span className="text-foreground font-semibold">{appliedRange.dateTo}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground mr-1 hidden sm:inline-block">Preset:</span>
            {RANGE_PRESET_OPTIONS.map((option) => {
              const active = isPresetActive(appliedRange, option.value);
              return (
                <Button
                  key={option.value}
                  onClick={() => onSelectPreset(option.value)}
                  size="sm"
                  variant={active ? "primary" : "outline"}
                  className={`rounded-full px-4 text-xs font-semibold transition-all ${
                    active ? "shadow-md shadow-primary/20" : "hover:bg-accent"
                  }`}
                >
                  {option.label}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end">
          <div className="grid gap-2">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Tanggal Mulai
            </Label>
            <Input
              className="h-10 bg-background/50 border-border/80 focus:border-primary transition-all text-sm rounded-lg"
              onChange={(event) =>
                onDraftChange({
                  ...draftRange,
                  preset: "custom",
                  dateFrom: event.target.value,
                })
              }
              type="date"
              value={draftRange.dateFrom}
            />
          </div>

          <div className="grid gap-2">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Tanggal Akhir
            </Label>
            <Input
              className="h-10 bg-background/50 border-border/80 focus:border-primary transition-all text-sm rounded-lg"
              onChange={(event) =>
                onDraftChange({
                  ...draftRange,
                  preset: "custom",
                  dateTo: event.target.value,
                })
              }
              type="date"
              value={draftRange.dateTo}
            />
          </div>

          <div>
            <Button
              disabled={!canApplyCustomRange || isApplying}
              onClick={onApplyCustomRange}
              className="w-full h-10 px-6 font-semibold shadow-sm justify-center"
            >
              <Filter className="h-4 w-4 mr-2" />
              Terapkan
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default DiagnosisRangeControls;
