import { useState } from "react";
import Button from "../ui/button";
import type { PersistedDiagnosisSubtopicRanking } from "../../lib/mappers/analytics-mappers";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { ChevronDown, ChevronUp, Award, Clock, HelpCircle, Layers } from "lucide-react";

type SubtopicRankingListProps = {
  rankings: PersistedDiagnosisSubtopicRanking[];
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

function formatBehaviorFlag(flag: PersistedDiagnosisSubtopicRanking["behaviorFlags"][number]): string {
  switch (flag) {
    case "frequent_ragu":
      return "Sering Ragu-ragu";
    case "slow_pacing":
      return "Pengerjaan Lambat";
    case "frequent_answer_changes":
      return "Sering Ganti Jawaban";
    case "correct_to_wrong_switches":
      return "Benar Jadi Salah";
    default:
      return flag;
  }
}

function SubtopicCard({
  item,
  isExpanded,
  onToggle,
}: {
  item: PersistedDiagnosisSubtopicRanking;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const isTopRank = item.rank === 1;

  return (
    <div className={`rounded-xl border transition-all duration-300 p-5 ${
      isTopRank 
        ? "border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-card to-card shadow-sm" 
        : "border-border/80 bg-background/60 hover:border-primary/40 hover:shadow-md"
    }`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <Badge 
              variant="outline" 
              className={`font-mono text-xs font-bold px-2.5 py-0.5 ${
                isTopRank 
                  ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40" 
                  : "bg-primary/10 text-primary border-primary/20"
              }`}
            >
              <Award className="h-3 w-3 mr-1 inline-block" />
              Peringkat #{item.rank}
            </Badge>
            <Badge variant="secondary" className="text-xs font-semibold text-muted-foreground bg-muted/60">
              {item.blockName}
            </Badge>
          </div>

          <p className="text-lg font-bold text-foreground tracking-tight mt-1">{item.topicName}</p>
          
          {/* Accuracy progress bar */}
          <div className="mt-3 max-w-md">
            <div className="flex items-center justify-between text-xs font-semibold mb-1">
              <span className="text-muted-foreground">Tingkat Akurasi</span>
              <span className={item.accuracy < 50 ? "text-destructive font-bold" : "text-foreground font-bold"}>
                Akurasi {item.accuracy}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted/80 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  item.accuracy < 40 
                    ? "bg-destructive" 
                    : item.accuracy < 70 
                    ? "bg-amber-500" 
                    : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(100, Math.max(5, item.accuracy))}%` }}
              />
            </div>
          </div>

          {item.behaviorFlags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.behaviorFlags.map((flag) => (
                <Badge
                  key={flag}
                  variant="secondary"
                  className="bg-primary/10 text-primary border-transparent text-[11px] font-semibold px-2 py-0.5"
                >
                  {formatBehaviorFlag(flag)}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col items-start gap-3 md:items-end justify-between self-stretch">
          <Badge variant="outline" className="text-xs font-semibold border-border/80">
            Keyakinan {formatConfidenceLabel(item.confidence)}
          </Badge>

          <Button
            onClick={onToggle}
            size="sm"
            variant="outline"
            className="text-xs font-semibold mt-auto"
          >
            {isExpanded ? `Tutup ringkasan ${item.topicName}` : `Lihat ringkasan ${item.topicName}`}
          </Button>
        </div>
      </div>

      {isExpanded ? (
        <div className="mt-4 border-t border-border/60 pt-4 animate-in fade-in-50 duration-200">
          <p className="text-sm leading-relaxed text-foreground/90 font-medium">{item.summary}</p>
          
          <div className="mt-3 flex flex-col gap-1 text-xs font-medium text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/40">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" />
              Rata-rata waktu {item.averageTimePerQuestion} detik/soal
            </div>
            <div className="flex items-center gap-1.5">
              <HelpCircle className="h-3.5 w-3.5 text-primary" />
              Dibahas di {item.attemptCoverageCount} sesi, total {item.questionCount} soal
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SubtopicRankingList({ rankings }: SubtopicRankingListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedTopicIds, setExpandedTopicIds] = useState<string[]>([]);
  const topFive = rankings.slice(0, 5);
  const remaining = rankings.slice(5);

  function toggleCard(topicId: string) {
    setExpandedTopicIds((current) =>
      current.includes(topicId) ? current.filter((item) => item !== topicId) : [...current, topicId],
    );
  }

  return (
    <Card className="mt-6 border-amber-500/30 bg-gradient-to-b from-amber-500/5 via-card to-card shadow-sm overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 space-y-0 pb-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
            <Layers className="h-5 w-5" />
          </div>
          <CardTitle className="text-xl font-extrabold tracking-tight text-foreground">
            5 Topik yang Paling Perlu Perhatian
          </CardTitle>
        </div>
        {remaining.length > 0 ? (
          <Button
            onClick={() => setIsExpanded((current) => !current)}
            size="sm"
            variant="outline"
            className="text-xs font-semibold rounded-full px-4"
          >
            {isExpanded ? "Lihat Lebih Sedikit" : `Lihat Semua Topik (${rankings.length})`}
          </Button>
        ) : null}
      </CardHeader>

      <CardContent className="pt-5 p-6">
        <div className="grid gap-3.5">
          {topFive.map((item) => (
            <SubtopicCard
              key={item.topicId}
              isExpanded={expandedTopicIds.includes(item.topicId)}
              item={item}
              onToggle={() => toggleCard(item.topicId)}
            />
          ))}
        </div>

        {isExpanded && remaining.length > 0 ? (
          <div className="mt-6 grid gap-3.5 border-t border-border/60 pt-6">
            {remaining.map((item) => (
              <SubtopicCard
                key={item.topicId}
                isExpanded={expandedTopicIds.includes(item.topicId)}
                item={item}
                onToggle={() => toggleCard(item.topicId)}
              />
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default SubtopicRankingList;
