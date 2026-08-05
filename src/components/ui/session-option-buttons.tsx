import type { ComponentPropsWithoutRef } from "react";
import Button from "./button";

type ButtonProps = ComponentPropsWithoutRef<typeof Button>;

export type SessionQuestionNavState = "doubtful" | "answered" | "idle";

export type SessionQuestionNavButtonProps = Omit<ButtonProps, "children" | "size" | "variant"> & {
  number: number;
  state: SessionQuestionNavState;
  isCurrent?: boolean;
};

type SessionAnswerOptionButtonProps = Omit<ButtonProps, "children" | "variant"> & {
  optionKey: string;
  optionText: string;
  selected?: boolean;
};

const sessionQuestionNavStateClassNames: Record<SessionQuestionNavState, string> = {
  doubtful: "!border-amber-500 !bg-amber-500 !text-white font-bold shadow-2xs",
  answered: "!border-emerald-600 !bg-emerald-600 !text-white font-bold shadow-2xs",
  idle: "border-border/80 bg-card text-foreground hover:bg-accent/50 font-semibold",
};

export function SessionQuestionNavButton({
  className,
  number,
  state,
  isCurrent = false,
  ...props
}: SessionQuestionNavButtonProps) {
  return (
    <Button
      aria-current={isCurrent ? "step" : undefined}
      className={[
        "rounded-2xl px-0 transition-all duration-150 text-sm",
        sessionQuestionNavStateClassNames[state],
        isCurrent ? "ring-2 ring-primary ring-offset-2 !border-primary font-bold scale-[1.03]" : "",
        className,
      ].filter(Boolean).join(" ")}
      size="sm"
      variant="outline"
      {...props}
    >
      {number}
    </Button>
  );
}

export function SessionAnswerOptionButton({
  className,
  optionKey,
  optionText,
  selected = false,
  ...props
}: SessionAnswerOptionButtonProps) {
  return (
    <Button
      aria-pressed={selected}
      className={[
        "min-h-0 justify-start rounded-[1.45rem] px-4 py-4 text-left font-medium transition-all duration-150 shadow-2xs",
        selected
          ? "!border-emerald-500/50 !bg-emerald-500/10"
          : "!border-border/80 !bg-card hover:!bg-accent/40",
        className,
      ].filter(Boolean).join(" ")}
      fullWidth
      variant="outline"
      {...props}
    >
      <div className="flex items-start gap-3 w-full">
        <div
          className={[
            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold border transition-colors",
            selected
              ? "bg-emerald-600 text-white border-emerald-600"
              : "border-border/80 bg-muted/50 text-foreground",
          ].join(" ")}
        >
          {optionKey}
        </div>
        <p className="pt-1 text-sm leading-relaxed text-foreground font-semibold">
          {optionText}
        </p>
      </div>
    </Button>
  );
}
