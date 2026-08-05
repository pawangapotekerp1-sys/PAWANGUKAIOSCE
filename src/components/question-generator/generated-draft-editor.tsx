import { useEffect, useState } from "react";
import type { QuestionGeneratorItemViewModel } from "../../lib/mappers/question-generator-mappers";
import Button from "../ui/button";
import { Badge } from "../ui/badge";
import { ExternalLink, Save, Send, History, CheckCircle, BookOpen, FileText } from "lucide-react";

type GeneratedDraftEditorProps = {
  deliveryHistory?: Array<{
    id: string;
    destinationLabel: string;
    timestampLabel: string;
    typeLabel: string;
  }>;
  isDistributing?: boolean;
  item: QuestionGeneratorItemViewModel;
  isSaving?: boolean;
  onDistributeToQuestionBank?: () => void;
  onDistributeToScheduledEvent?: () => void;
  onSave: (input: {
    generationItemId: string;
    stem: string;
    options: Record<"A" | "B" | "C" | "D" | "E", string>;
    correctOptionKey: "A" | "B" | "C" | "D" | "E";
    explanationText: string;
  }) => void;
};

function GeneratedDraftEditor({
  deliveryHistory = [],
  isDistributing = false,
  item,
  isSaving = false,
  onDistributeToQuestionBank,
  onDistributeToScheduledEvent,
  onSave,
}: GeneratedDraftEditorProps) {
  const [stem, setStem] = useState(item.stem);
  const [options, setOptions] = useState(item.options);
  const [correctOptionKey, setCorrectOptionKey] = useState<"A" | "B" | "C" | "D" | "E">(item.correctOptionKey ?? "A");
  const [explanationText, setExplanationText] = useState(item.explanationText);

  useEffect(() => {
    setStem(item.stem);
    setOptions(item.options);
    setCorrectOptionKey(item.correctOptionKey ?? "A");
    setExplanationText(item.explanationText);
  }, [
    item.id,
    item.stem,
    item.correctOptionKey,
    item.explanationText,
    item.options.A,
    item.options.B,
    item.options.C,
    item.options.D,
    item.options.E,
  ]);
  const hasTrustedReferenceSource = item.referenceLabel.trim().length > 0 && item.referenceUrl.trim().length > 0;

  return (
    <article
      aria-label={`Soal ${item.order}`}
      className="space-y-5 rounded-2xl border border-border/80 bg-card p-6 shadow-xs transition-all hover:border-primary/30"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-border/40">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-foreground">Soal {item.order}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-0.5">
              {item.variationModeLabel}
            </Badge>
            <Badge 
              variant="outline"
              className="text-xs font-semibold px-2.5 py-0.5 bg-primary/5 text-primary border-primary/20"
            >
              {item.deliverySummaryLabel}
            </Badge>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/80 bg-muted/30 p-4">
        <p className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <ExternalLink className="h-3.5 w-3.5 text-primary" />
          Sumber acuan
        </p>
        {hasTrustedReferenceSource ? (
          <>
            <a
              className="mt-1.5 inline-flex text-sm font-bold text-primary hover:underline underline-offset-4 items-center gap-1"
              href={item.referenceUrl}
              rel="noreferrer"
              target="_blank"
            >
              {item.referenceLabel}
              <ExternalLink className="h-3 w-3" />
            </a>
            <p className="mt-1 break-all text-xs font-mono text-muted-foreground">{item.referenceUrl}</p>
          </>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">
            Batch lama belum menyimpan sumber acuan. Soal ini tetap bisa ditinjau dan diedit, tetapi sumber lengkap hanya tersedia di batch yang lebih baru.
          </p>
        )}
      </div>

      <label className="grid gap-2 text-sm font-semibold text-foreground">
        <span className="flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-primary" />
          Pertanyaan
        </span>
        <textarea
          className="min-h-28 rounded-xl border border-border/80 bg-background/50 px-4 py-3 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-all leading-relaxed"
          onChange={(event) => setStem(event.target.value)}
          value={stem}
        />
      </label>

      <div className="grid gap-3.5 md:grid-cols-2">
        {(["A", "B", "C", "D", "E"] as const).map((optionKey) => (
          <label key={optionKey} className="grid gap-2 text-sm font-semibold text-foreground">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider font-mono">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary font-bold text-[11px]">
                {optionKey}
              </span>
              Opsi {optionKey}
            </span>
            <input
              className="h-10 rounded-xl border border-border/80 bg-background/50 px-4 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              onChange={(event) =>
                setOptions((current) => ({
                  ...current,
                  [optionKey]: event.target.value,
                }))}
              type="text"
              value={options[optionKey]}
            />
          </label>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] items-start">
        <label className="grid gap-2 text-sm font-semibold text-foreground">
          <span className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            Kunci jawaban
          </span>
          <select
            className="h-10 rounded-xl border border-border/80 bg-background/50 px-4 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
            onChange={(event) => setCorrectOptionKey(event.target.value as "A" | "B" | "C" | "D" | "E")}
            value={correctOptionKey}
          >
            {(["A", "B", "C", "D", "E"] as const).map((optionKey) => (
              <option key={optionKey} value={optionKey}>
                {optionKey}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-semibold text-foreground">
          <span className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-primary" />
            Pembahasan
          </span>
          <textarea
            className="min-h-28 rounded-xl border border-border/80 bg-background/50 px-4 py-3 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-all leading-relaxed"
            onChange={(event) => setExplanationText(event.target.value)}
            value={explanationText}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 pt-2">
        <Button
          disabled={isSaving}
          loading={isSaving}
          loadingLabel="Menyimpan..."
          onClick={() =>
            onSave({
              generationItemId: item.id,
              stem,
              options,
              correctOptionKey,
              explanationText,
            })}
          size="sm"
          className="h-9 px-4 text-xs font-semibold"
        >
          <Save className="h-3.5 w-3.5 mr-1.5" />
          Simpan perubahan
        </Button>
        {onDistributeToQuestionBank ? (
          <Button
            disabled={isDistributing}
            onClick={onDistributeToQuestionBank}
            size="sm"
            variant="outline"
            className="h-9 px-4 text-xs font-semibold"
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            Kirim ke bank soal
          </Button>
        ) : null}
        {onDistributeToScheduledEvent ? (
          <Button
            disabled={isDistributing}
            onClick={onDistributeToScheduledEvent}
            size="sm"
            variant="outline"
            className="h-9 px-4 text-xs font-semibold"
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            Kirim ke sesi
          </Button>
        ) : null}
      </div>

      <div className="rounded-xl border border-border/80 bg-muted/30 p-4">
        <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <History className="h-3.5 w-3.5 text-primary" />
          Riwayat kirim
        </h3>
        {deliveryHistory.length ? (
          <ul className="mt-3 space-y-2">
            {deliveryHistory.map((delivery) => (
              <li key={delivery.id} className="rounded-lg border border-border/60 bg-background p-3 text-xs">
                <p className="font-bold text-foreground">{delivery.typeLabel}</p>
                <p className="mt-0.5 text-muted-foreground">{delivery.destinationLabel}</p>
                <p className="mt-1 text-[10px] font-mono text-muted-foreground/80">
                  {delivery.timestampLabel}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            Soal ini belum pernah dikirim ke bank soal atau sesi terjadwal.
          </p>
        )}
      </div>
    </article>
  );
}

export default GeneratedDraftEditor;
