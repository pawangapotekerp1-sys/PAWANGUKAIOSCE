import { Pencil, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { ScheduledEventQuestionDraftInput } from "../../../lib/api/scheduled-tryout-api";

interface Props {
  question: ScheduledEventQuestionDraftInput;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}

export function ScheduledQuestionCard({ question, index, onEdit, onDelete }: Props) {
  // Option rendering logic
  const hasCorrectAnswer = !!question.correctOptionKey;
  const isInvalid = !hasCorrectAnswer || !question.stem;
  
  return (
    <div className={`flex flex-col border rounded-xl p-4 bg-card ${isInvalid ? 'border-destructive/50 bg-destructive/5' : 'border-border'}`}>
      <div className="flex justify-between items-start gap-4 mb-2">
        <div className="flex gap-2">
          <span className="font-semibold text-primary">{index + 1}.</span>
          <p className="text-sm font-medium line-clamp-3 overflow-hidden text-ellipsis whitespace-pre-wrap">
            {question.stem || <span className="text-muted-foreground italic">Soal kosong</span>}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!hasCorrectAnswer && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-3 rounded-md bg-destructive/10 text-destructive text-xs font-medium w-fit">
          <AlertTriangle className="h-3 w-3" />
          Belum menentukan jawaban benar
        </div>
      )}

      {question.options && question.options.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          {question.options.map((opt) => (
            <div key={opt.key} className={`text-xs p-2 rounded border ${opt.key === question.correctOptionKey ? 'border-primary bg-primary/5 font-medium' : 'border-border bg-background'}`}>
              <span className="font-semibold mr-1">{opt.key}.</span> 
              <span className="line-clamp-2">{opt.text}</span>
            </div>
          ))}
        </div>
      )}

      {question.explanationText && (
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-xs font-semibold text-primary mb-1">Pembahasan:</p>
          <p className="text-xs text-muted-foreground line-clamp-2">{question.explanationText}</p>
        </div>
      )}
    </div>
  );
}
