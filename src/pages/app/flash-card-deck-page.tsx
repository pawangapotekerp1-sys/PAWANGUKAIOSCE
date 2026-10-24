import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle } from "lucide-react";
import { useParams } from "react-router";
import FlashCardViewer, {
  type FlashCardViewerCard,
} from "../../components/flash-cards/flash-card-viewer";
import ProductShell from "../../components/layout/product-shell";
import { Alert, AlertTitle, AlertDescription } from "../../components/ui/alert";
import {
  getPublishedFlashCardDeck,
  saveStudentFlashCardDifficulty,
} from "../../lib/api/flash-card-api";
import type { FlashCardAcademicGroup } from "../../lib/mappers/flash-card-mappers";
import { useSession } from "../../lib/auth/use-session";
import { productShellMeta } from "../../mocks/student-dashboard";
import { useStudentShell } from "./use-student-shell";

function mapAcademicGroupToBlockParam(group?: FlashCardAcademicGroup) {
  switch (group) {
    case "clinical_science":
      return "clinical-science";
    case "pharmaceutical_science":
      return "pharmaceutical-science";
    case "social_behavioral_and_administration":
      return "social-behavioural-administration";
    default:
      return null;
  }
}

function FlashCardDeckPage() {
  const { subtopicId = "" } = useParams();
  const { user } = useSession();
  const studentShell = useStudentShell("/app/flash-cards");
  const [isSavingDifficulty, setIsSavingDifficulty] = useState(false);

  const deckQuery = useQuery({
    queryKey: ["flash-card-deck", subtopicId],
    enabled: subtopicId.length > 0,
    queryFn: () => getPublishedFlashCardDeck({ subtopicId }),
  });

  async function handleRateCard(
    card: FlashCardViewerCard,
    status: "correct" | "wrong",
  ) {
    if (!user?.id) {
      return;
    }

    const difficulty = status === "correct" ? "easy" : "hard";
    setIsSavingDifficulty(true);

    try {
      await saveStudentFlashCardDifficulty({
        userId: user.id,
        cardId: card.id,
        difficulty,
      });
    } finally {
      setIsSavingDifficulty(false);
    }
  }

  const blockParam = mapAcademicGroupToBlockParam(deckQuery.data?.academicGroup);
  const backHref = blockParam
    ? `/app/flash-cards?block=${blockParam}`
    : "/app/flash-cards";

  return (
    <ProductShell
      brand={productShellMeta.brand}
      navItems={studentShell.navItems}
      tierLabel={studentShell.tierLabel}
    >
      {deckQuery.isLoading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Set kartu belajar sedang dimuat...
          </p>
        </div>
      ) : deckQuery.isError || !deckQuery.data ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Set kartu belajar belum bisa dimuat</AlertTitle>
          <AlertDescription>Set kartu belajar belum bisa dimuat.</AlertDescription>
        </Alert>
      ) : (
        <section className="py-2 sm:py-4">
          <FlashCardViewer
            cards={deckQuery.data.cards}
            subtopicTitle={
              deckQuery.data.materialTitle || deckQuery.data.subtopicTitle
            }
            subtopicSummary={deckQuery.data.subtopicSummary}
            academicGroupLabel={deckQuery.data.academicGroupLabel}
            backHref={backHref}
            isSaving={isSavingDifficulty}
            onRateCard={handleRateCard}
          />
        </section>
      )}
    </ProductShell>
  );
}

export default FlashCardDeckPage;
