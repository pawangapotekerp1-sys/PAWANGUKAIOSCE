import type {
  PersistedDiagnosisBehaviorPattern,
  PersistedDiagnosisNarrative,
  PersistedDiagnosisSubtopicRanking,
} from "../../lib/mappers/analytics-mappers";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { AlertTriangle, Target, Gauge, BookOpen } from "lucide-react";

type DiagnosisHeroCardProps = {
  weakestSubtopic: PersistedDiagnosisSubtopicRanking;
  narrative: PersistedDiagnosisNarrative;
  behaviorPatterns: PersistedDiagnosisBehaviorPattern[];
};

function formatConfidenceLabel(value: PersistedDiagnosisSubtopicRanking["confidence"]): string {
  if (value === "high") {
    return "Tinggi";
  }

  if (value === "medium") {
    return "Sedang";
  }

  return "Rendah";
}

function DiagnosisHeroCard({
  weakestSubtopic,
  narrative,
  behaviorPatterns,
}: DiagnosisHeroCardProps) {
  return (
    <Card className="mt-6 overflow-hidden border-destructive/30 bg-gradient-to-br from-destructive/10 via-card to-card shadow-lg relative transition-all duration-300 hover:shadow-destructive/10">
      {/* Decorative top accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-destructive via-amber-500 to-primary" />
      
      <CardContent className="p-6 md:p-8">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 font-semibold px-3 py-1 text-xs uppercase tracking-wider">
            <AlertTriangle className="mr-1.5 h-3.5 w-3.5 inline-block" />
            Topik Paling Perlu Perhatian
          </Badge>
        </div>

        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground mt-2">
          {weakestSubtopic.topicName}
        </h2>
        
        <p className="mt-3 text-base font-semibold text-foreground/90 leading-relaxed">
          {narrative.headline}
        </p>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed max-w-3xl">
          {narrative.body}
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border/80 bg-background/60 p-4 backdrop-blur-sm transition-all hover:border-primary/40">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Target className="h-4 w-4 text-primary" />
              Akurasi
            </div>
            <p className="mt-2 text-2xl font-extrabold text-foreground">
              Akurasi {weakestSubtopic.accuracy}%
            </p>
          </div>

          <div className="rounded-xl border border-border/80 bg-background/60 p-4 backdrop-blur-sm transition-all hover:border-primary/40">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Gauge className="h-4 w-4 text-amber-500" />
              Keyakinan
            </div>
            <p className="mt-2 text-2xl font-extrabold text-foreground">
              Keyakinan {formatConfidenceLabel(weakestSubtopic.confidence)}
            </p>
          </div>

          <div className="rounded-xl border border-border/80 bg-background/60 p-4 backdrop-blur-sm transition-all hover:border-primary/40">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <BookOpen className="h-4 w-4 text-emerald-500" />
              Cakupan
            </div>
            <p className="mt-2 text-sm font-semibold text-foreground">
              Dibahas di {weakestSubtopic.attemptCoverageCount} sesi, total {weakestSubtopic.questionCount} soal
            </p>
          </div>
        </div>

        {behaviorPatterns.length > 0 ? (
          <div className="mt-6 flex flex-wrap items-center gap-2 pt-4 border-t border-border/40">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1">Indikasi:</span>
            {behaviorPatterns.slice(0, 4).map((pattern) => (
              <Badge
                key={pattern.code}
                variant="secondary"
                className="bg-primary/10 text-primary hover:bg-primary/20 border-transparent text-xs font-semibold px-2.5 py-0.5"
              >
                {pattern.label}
              </Badge>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default DiagnosisHeroCard;
