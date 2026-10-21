import { useState, type ReactNode } from "react";
import { ChevronUp, LayoutGrid, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import { Button } from "../ui/button";

export interface MobileQuestionNavDrawerProps {
  currentIndex: number;
  totalQuestions: number;
  onSelectQuestion: (index: number) => void;
  renderGrid: (helpers: { close: () => void }) => ReactNode;
  legend?: ReactNode;
  breakpoint?: "md" | "xl";
  title?: string;
  disabled?: boolean;
}

export default function MobileQuestionNavDrawer({
  currentIndex,
  totalQuestions,
  onSelectQuestion: _onSelectQuestion,
  renderGrid,
  legend,
  breakpoint = "md",
  title = "Navigasi Soal",
  disabled = false,
}: MobileQuestionNavDrawerProps) {
  const [open, setOpen] = useState(false);

  const visibilityClass = breakpoint === "xl" ? "xl:hidden" : "md:hidden";

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <div className={visibilityClass}>
      {/* Floating Pill Trigger */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          aria-label="Navigasi soal"
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-card/95 hover:bg-card text-foreground border border-border/80 shadow-lg backdrop-blur-md text-xs font-bold transition-all duration-150 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <LayoutGrid className="h-4 w-4 text-primary transition-transform group-hover:scale-110" />
          <span>
            Soal <span className="font-extrabold text-primary">{currentIndex + 1}</span> / {totalQuestions}
          </span>
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:-translate-y-0.5" />
        </button>
      </div>

      {/* Slide-Up Bottom Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="max-h-[80vh] rounded-t-3xl border-t border-border/80 bg-card p-0 flex flex-col shadow-2xl focus:outline-none"
        >
          {/* Drag handle */}
          <div className="pt-2 pb-1 flex justify-center">
            <div className="h-1.5 w-12 rounded-full bg-muted-foreground/25" />
          </div>

          <SheetHeader className="px-5 py-3 border-b border-border/40 flex flex-row items-center justify-between">
            <div className="space-y-0.5">
              <SheetTitle className="text-base font-extrabold text-foreground tracking-tight">
                {title}
              </SheetTitle>
              <p className="text-xs text-muted-foreground font-medium">
                Soal aktif: {currentIndex + 1} dari {totalQuestions}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleClose}
              className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Tutup</span>
            </Button>
          </SheetHeader>

          {legend ? (
            <div className="px-5 pt-3 pb-1 border-b border-border/30 bg-muted/20">
              {legend}
            </div>
          ) : null}

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {renderGrid({ close: handleClose })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
