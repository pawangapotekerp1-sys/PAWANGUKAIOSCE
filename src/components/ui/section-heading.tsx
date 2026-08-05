import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
};

function SectionHeading({
  title,
  description,
  eyebrow,
  actions,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "ui-section-heading flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-2">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold leading-tight tracking-tight text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="w-full shrink-0 sm:w-auto">{actions}</div> : null}
    </div>
  );
}

export default SectionHeading;
