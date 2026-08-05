import type { PersistedDiagnosisBehaviorPattern } from "../../lib/mappers/analytics-mappers";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Activity, AlertCircle, AlertTriangle, Info } from "lucide-react";

type GlobalBehaviorPanelProps = {
  title?: string;
  patterns: PersistedDiagnosisBehaviorPattern[];
};

function formatSeverityLabel(value: PersistedDiagnosisBehaviorPattern["severity"]) {
  if (value === "high") {
    return "Tinggi";
  }

  if (value === "medium") {
    return "Sedang";
  }

  return "Rendah";
}

function getSeverityBadgeStyle(value: PersistedDiagnosisBehaviorPattern["severity"]) {
  if (value === "high") {
    return "bg-destructive/10 text-destructive border-destructive/20";
  }
  if (value === "medium") {
    return "bg-amber-500/10 text-amber-600 border-amber-500/20";
  }
  return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
}

function getSeverityBorderStyle(value: PersistedDiagnosisBehaviorPattern["severity"]) {
  if (value === "high") {
    return "border-l-destructive";
  }
  if (value === "medium") {
    return "border-l-amber-500";
  }
  return "border-l-emerald-500";
}

function getSeverityIcon(value: PersistedDiagnosisBehaviorPattern["severity"]) {
  if (value === "high") {
    return <AlertCircle className="h-4 w-4 text-destructive" />;
  }
  if (value === "medium") {
    return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  }
  return <Info className="h-4 w-4 text-emerald-500" />;
}

function GlobalBehaviorPanel({
  title = "Pola Perilaku Global",
  patterns,
}: GlobalBehaviorPanelProps) {
  if (patterns.length === 0) {
    return null;
  }

  return (
    <Card className="mt-6 border-border/60 shadow-sm overflow-hidden bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center gap-3 space-y-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Activity className="h-5 w-5" />
        </div>
        <CardTitle className="text-xl font-extrabold tracking-tight text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-5 p-6">
        <div className="grid gap-3.5">
          {patterns.map((pattern) => (
            <div
              key={pattern.code}
              className={`rounded-xl border border-border/80 bg-background/60 p-4 border-l-4 ${getSeverityBorderStyle(pattern.severity)} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {getSeverityIcon(pattern.severity)}
                  <p className="font-bold text-foreground text-base">{pattern.label}</p>
                </div>
                <Badge variant="outline" className={`font-semibold text-xs px-2.5 py-0.5 ${getSeverityBadgeStyle(pattern.severity)}`}>
                  {formatSeverityLabel(pattern.severity)}
                </Badge>
              </div>
              <p className="mt-2.5 text-xs font-semibold text-primary font-mono bg-primary/5 px-3 py-1.5 rounded-md inline-block">
                Bukti: {pattern.evidence}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{pattern.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default GlobalBehaviorPanel;
