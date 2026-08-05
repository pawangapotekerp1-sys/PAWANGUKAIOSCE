import { useEffect, useState } from "react";
import Button from "../ui/button";
import { Card } from "../ui/card";

type FlashCardViewerCard = {
  id: string;
  frontText: string;
  backText: string;
  sortOrder: number;
  savedDifficulty: "easy" | "medium" | "hard" | null;
  lastReviewedAt: string | null;
};

type FlashCardViewerProps = {
  cards: FlashCardViewerCard[];
  onCardChange?: (card: FlashCardViewerCard) => void;
};

function FlashCardViewer({
  cards,
  onCardChange,
}: FlashCardViewerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const activeCard = cards[activeIndex] ?? null;

  useEffect(() => {
    if (activeCard) {
      onCardChange?.(activeCard);
    }
  }, [activeCard, onCardChange]);

  if (!activeCard) {
    return null;
  }

  function moveTo(nextIndex: number) {
    setActiveIndex(nextIndex);
    setIsFlipped(false);
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-4 px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-teal-soft)]">
          Kartu {activeIndex + 1} dari {cards.length}
        </p>
        <div className="min-h-40 rounded-3xl border border-[rgba(31,111,115,0.12)] bg-[rgba(31,111,115,0.04)] px-5 py-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-teal-soft)]">
            {isFlipped ? "Jawaban" : "Prompt"}
          </p>
          <p className="mt-4 text-lg font-semibold leading-8 text-[var(--color-outline)]">
            {isFlipped ? activeCard.backText : activeCard.frontText}
          </p>
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button
          disabled={activeIndex === 0}
          type="button"
          variant="outline"
          onClick={() => moveTo(activeIndex - 1)}
        >
          Sebelumnya
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={() => setIsFlipped((current) => !current)}
        >
          Balik kartu
        </Button>
        <Button
          disabled={activeIndex === cards.length - 1}
          type="button"
          variant="outline"
          onClick={() => moveTo(activeIndex + 1)}
        >
          Berikutnya
        </Button>
      </div>
    </div>
  );
}

export default FlashCardViewer;
