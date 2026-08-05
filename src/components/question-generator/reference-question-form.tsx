import Button from "../ui/button";
import { Trash2, FileText, CheckCircle, BookOpen } from "lucide-react";
import { Badge } from "../ui/badge";

function appendBibliographyTemplate(explanationText: string) {
  const trimmedValue = explanationText.trimEnd();

  if (!trimmedValue) {
    return "Pustaka:\n1. ";
  }

  return `${trimmedValue}\n\nPustaka:\n1. `;
}

type ReferenceQuestionValue = {
  stem: string;
  options: Record<"A" | "B" | "C" | "D" | "E", string>;
  correctOptionKey: "A" | "B" | "C" | "D" | "E";
  explanationText: string;
};

type ReferenceQuestionFormProps = {
  index: number;
  value: ReferenceQuestionValue;
  onChange: (nextValue: ReferenceQuestionValue) => void;
  onRemove?: () => void;
};

function ReferenceQuestionForm({
  index,
  value,
  onChange,
  onRemove,
}: ReferenceQuestionFormProps) {
  const stemFieldId = `reference-${index}-stem`;
  const answerKeyFieldId = `reference-${index}-correct-key`;
  const explanationFieldId = `reference-${index}-explanation`;

  function updateOption(optionKey: keyof ReferenceQuestionValue["options"], optionValue: string) {
    onChange({
      ...value,
      options: {
        ...value.options,
        [optionKey]: optionValue,
      },
    });
  }

  return (
    <article className="space-y-5 rounded-2xl border border-border/80 bg-card p-6 shadow-xs transition-all hover:border-primary/30">
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-border/40">
        <div>
          <h2 className="text-base font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Referensi {index + 1}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Satu referensi lengkap sudah cukup untuk menyusun soal. Tambahkan referensi lain bila ingin menjaga fokus
            topik tetap lebih sempit.
          </p>
        </div>
        {onRemove ? (
          <Button
            onClick={onRemove}
            size="sm"
            variant="destructive"
            className="text-xs font-semibold"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Hapus referensi
          </Button>
        ) : null}
      </div>

      <div className="grid gap-2 text-sm font-semibold text-foreground">
        <label htmlFor={stemFieldId} className="flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-primary" />
          Pertanyaan
        </label>
        <textarea
          id={stemFieldId}
          className="min-h-28 rounded-xl border border-border/80 bg-background/50 px-4 py-3 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-all leading-relaxed"
          onChange={(event) => onChange({ ...value, stem: event.target.value })}
          required
          value={value.stem}
        />
      </div>

      <div className="grid gap-3.5 md:grid-cols-2">
        {(["A", "B", "C", "D", "E"] as const).map((optionKey) => {
          const optionFieldId = `reference-${index}-option-${optionKey}`;
          return (
            <div key={optionKey} className="grid gap-2 text-sm font-semibold text-foreground">
              <label htmlFor={optionFieldId} className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider font-mono">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary font-bold text-[11px]">
                  {optionKey}
                </span>
                Opsi {optionKey}
              </label>
              <input
                id={optionFieldId}
                className="h-10 rounded-xl border border-border/80 bg-background/50 px-4 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                onChange={(event) => updateOption(optionKey, event.target.value)}
                required
                type="text"
                value={value.options[optionKey]}
              />
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] items-start">
        <div className="grid gap-2 text-sm font-semibold text-foreground">
          <label htmlFor={answerKeyFieldId} className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            Kunci jawaban
          </label>
          <select
            id={answerKeyFieldId}
            className="h-10 rounded-xl border border-border/80 bg-background/50 px-4 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
            onChange={(event) =>
              onChange({
                ...value,
                correctOptionKey: event.target.value as ReferenceQuestionValue["correctOptionKey"],
              })}
            required
            value={value.correctOptionKey}
          >
            {(["A", "B", "C", "D", "E"] as const).map((optionKey) => (
              <option key={optionKey} value={optionKey}>
                Opsi {optionKey}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2 text-sm font-semibold text-foreground">
          <label htmlFor={explanationFieldId} className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-primary" />
            Pembahasan
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/40 p-3 text-xs leading-normal text-muted-foreground font-normal">
            <p className="max-w-md">Sumber tepercaya wajib ada di hasil soal. Pustaka di sini opsional (DOI, URL, ISBN, atau sitasi).</p>
            <Button
              onClick={() =>
                onChange({
                  ...value,
                  explanationText: appendBibliographyTemplate(value.explanationText),
                })}
              className="h-8 px-3 text-xs font-semibold"
              size="sm"
              variant="outline"
            >
              Tambahkan template pustaka
            </Button>
          </div>
          <textarea
            className="min-h-28 rounded-xl border border-border/80 bg-background/50 px-4 py-3 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-all leading-relaxed"
            id={explanationFieldId}
            onChange={(event) => onChange({ ...value, explanationText: event.target.value })}
            placeholder={"Tulis pembahasan inti di sini. Referensi di sini tidak wajib berupa tautan tepercaya.\n\nPustaka:\n1. DOI / URL / ISBN / sitasi buku bila tersedia"}
            required
            value={value.explanationText}
          />
        </div>
      </div>
    </article>
  );
}

export type { ReferenceQuestionValue };
export default ReferenceQuestionForm;
