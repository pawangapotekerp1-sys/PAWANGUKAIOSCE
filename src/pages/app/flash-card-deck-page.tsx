import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle } from "lucide-react";
import FlashCardRecallControls from "../../components/flash-cards/flash-card-recall-controls";
import FlashCardViewer from "../../components/flash-cards/flash-card-viewer";
import ProductShell from "../../components/layout/product-shell";
import { Alert, AlertTitle, AlertDescription } from "../../components/ui/alert";
import { Card } from "../../components/ui/card";
import {
  getPublishedFlashCardDeck,
  saveStudentFlashCardDifficulty,
} from "../../lib/api/flash-card-api";
import { useSession } from "../../lib/auth/use-session";
import { productShellMeta } from "../../mocks/student-dashboard";
import { useStudentShell } from "./use-student-shell";
import { useParams } from "react-router";

function FlashCardDeckPage() {
  const { subtopicId = "" } = useParams();
  const { user } = useSession();
  const studentShell = useStudentShell("/app/flash-cards");
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [difficultyOverrides, setDifficultyOverrides] = useState<Record<string, "easy" | "medium" | "hard">>({});
  const [isSavingDifficulty, setIsSavingDifficulty] = useState(false);
  const deckQuery = useQuery({
    queryKey: ["flash-card-deck", subtopicId],
    enabled: subtopicId.length > 0,
    queryFn: () => getPublishedFlashCardDeck({ subtopicId }),
  });
  const activeCard = deckQuery.data?.cards.find((card) => card.id === activeCardId) ?? deckQuery.data?.cards[0] ?? null;

  async function handleDifficultySelect(difficulty: "easy" | "medium" | "hard") {
    if (!activeCard || !user?.id) {
      return;
    }

    setIsSavingDifficulty(true);

    try {
      await saveStudentFlashCardDifficulty({
        userId: user.id,
        cardId: activeCard.id,
        difficulty,
      });
      setDifficultyOverrides((current) => ({
        ...current,
        [activeCard.id]: difficulty,
      }));

      const cards = deckQuery.data?.cards ?? [];
      const currentIndex = cards.findIndex((c) => c.id === activeCard.id);
      if (currentIndex >= 0 && currentIndex < cards.length - 1) {
        setTimeout(() => {
          setActiveCardId(cards[currentIndex + 1].id);
        }, 300);
      }
    } finally {
      setIsSavingDifficulty(false);
    }
  }

  return (
    <ProductShell
      brand={productShellMeta.brand}
      navItems={studentShell.navItems}
      tierLabel={studentShell.tierLabel}
    >
      {deckQuery.isLoading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Set kartu belajar sedang dimuat...</p>
        </div>
      ) : deckQuery.isError || !deckQuery.data ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Set kartu belajar belum bisa dimuat</AlertTitle>
          <AlertDescription>Set kartu belajar belum bisa dimuat.</AlertDescription>
        </Alert>
      ) : (
        <section className="space-y-6">
          <Card className="space-y-4 px-5 py-5">
            <h1 className="text-3xl font-semibold text-foreground">Set Kartu Belajar</h1>
            <p className="text-sm font-medium text-foreground">{deckQuery.data.subtopicTitle}</p>
            <p className="text-sm leading-7 text-muted-foreground">{deckQuery.data.subtopicSummary}</p>
          </Card>

          <FlashCardViewer
            cards={deckQuery.data.cards}
            onCardChange={(card) => setActiveCardId(card.id)}
          />

          <FlashCardRecallControls
            isSaving={isSavingDifficulty}
            selectedDifficulty={activeCard ? difficultyOverrides[activeCard.id] ?? activeCard.savedDifficulty : null}
            onSelect={handleDifficultySelect}
          />
        </section>
      )}
    </ProductShell>
  );
}

export default FlashCardDeckPage;
