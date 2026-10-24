import type { ElementType, KeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";
import {
  ArrowRight,
  AlertCircle,
  ChevronLeft,
  FlaskConical,
  Stethoscope,
  Users,
} from "lucide-react";
import ProductShell from "../../components/layout/product-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button, getButtonStyleProps } from "../../components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { listPublishedFlashCardSubtopics } from "../../lib/api/flash-card-api";
import type { FlashCardAcademicGroup } from "../../lib/mappers/flash-card-mappers";
import { productShellMeta } from "../../mocks/student-dashboard";
import { useStudentShell } from "./use-student-shell";
import { getTopicVisuals } from "../../lib/utils/topic-visuals";

interface FlashCardBlockOption {
  id: string;
  academicGroup: FlashCardAcademicGroup;
  name: string;
  description: string;
  icon: ElementType;
  accentBg: string;
  matchKeys: string[];
}

export const FLASH_CARD_BLOCKS: FlashCardBlockOption[] = [
  {
    id: "clinical-science",
    academicGroup: "clinical_science",
    name: "Clinical Science",
    description:
      "Farmakoterapi, evaluasi kasus klinis, interaksi obat, dan interpretasi laboratorium klinis.",
    icon: Stethoscope,
    accentBg:
      "bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400",
    matchKeys: ["clinical-science", "clinical_science", "clinical science"],
  },
  {
    id: "pharmaceutical-science",
    academicGroup: "pharmaceutical_science",
    name: "Pharmaceutical Science",
    description:
      "Formulasi teknologi sediaan padat, cair, dan steril, biofarmasetika, stabilitas, serta analisis farmasi.",
    icon: FlaskConical,
    accentBg:
      "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400",
    matchKeys: [
      "pharmaceutical-science",
      "pharmaceutical_science",
      "pharmaceutical science",
    ],
  },
  {
    id: "social-behavioural-administration",
    academicGroup: "social_behavioral_and_administration",
    name: "Social Behavioural Administration of Pharmacy",
    description:
      "Manajemen farmasi, regulasi & perundang-undangan farmasi, farmakoekonomi, etika, dan komunikasi profesi.",
    icon: Users,
    accentBg:
      "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
    matchKeys: [
      "social-behavioural-administration",
      "social_behavioral_and_administration",
      "social behavioral and administration",
      "social behavioural administration of pharmacy",
    ],
  },
];

function resolveFlashCardBlock(param: string | null): FlashCardBlockOption | null {
  if (!param || !param.trim()) {
    return null;
  }
  const normalized = param.trim().toLowerCase();
  return (
    FLASH_CARD_BLOCKS.find((block) =>
      block.matchKeys.some((key) => key.toLowerCase() === normalized),
    ) ?? null
  );
}

function FlashCardsPage() {
  const studentShell = useStudentShell("/app/flash-cards");
  const [searchParams, setSearchParams] = useSearchParams();
  const blockParam = searchParams.get("block") ?? searchParams.get("group");
  const activeBlock = resolveFlashCardBlock(blockParam);

  const { data: libraryData, isLoading, isError } = useQuery({
    queryKey: ["flash-card-library"],
    queryFn: () => listPublishedFlashCardSubtopics(),
  });

  const allItems = libraryData || [];

  const filteredItems = activeBlock
    ? allItems.filter((item) => item.academicGroup === activeBlock.academicGroup)
    : [];

  function handleSelectBlock(blockId: string) {
    setSearchParams({ block: blockId });
  }

  function handleBackToBlocks() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("block");
      next.delete("group");
      return next;
    });
  }

  function handleBlockCardKeyDown(
    event: KeyboardEvent<HTMLDivElement>,
    blockId: string,
  ) {
    if (event.target !== event.currentTarget) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleSelectBlock(blockId);
    }
  }

  return (
    <ProductShell
      brand={productShellMeta.brand}
      navItems={studentShell.navItems}
      tierLabel={studentShell.tierLabel}
    >
      <div className="flex flex-col gap-6 w-full py-4">
        <h1 className="sr-only">Kartu Belajar</h1>

        {isError ? (
          <div className="w-full">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Kartu belajar belum bisa dimuat</AlertTitle>
              <AlertDescription>Coba lagi sebentar.</AlertDescription>
            </Alert>
          </div>
        ) : !activeBlock ? (
          /* Step 1: 3 Block Selection Cards (Like Reference Image 2) */
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 w-full">
            {FLASH_CARD_BLOCKS.map((block) => {
              const Icon = block.icon;
              const blockItems = allItems.filter(
                (item) => item.academicGroup === block.academicGroup,
              );
              const totalCards = blockItems.reduce(
                (sum, item) => sum + item.cardCount,
                0,
              );

              return (
                <Card
                  key={block.id}
                  role="article"
                  tabIndex={0}
                  aria-label={block.name}
                  data-testid={`block-card-${block.id}`}
                  className="group relative flex flex-col justify-between overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/40 border-border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  onClick={() => handleSelectBlock(block.id)}
                  onKeyDown={(event) => handleBlockCardKeyDown(event, block.id)}
                >
                  <CardHeader className="pt-6 pb-4">
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-xl ${block.accentBg} transition-transform group-hover:scale-105`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <Badge variant="secondary" className="font-semibold">
                        {isLoading ? "..." : `${totalCards} Kartu`}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                      {block.name}
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground mt-2 leading-relaxed">
                      {block.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-4 pb-6 mt-auto">
                    <Button
                      variant="primary"
                      className="w-full justify-center rounded-full shadow-sm font-bold gap-2 cursor-pointer"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleSelectBlock(block.id);
                      }}
                    >
                      Buka Flash Card
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          /* Step 2: Merged Material Flashcard Decks Inside Selected Block (No Filter Tabs) */
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={handleBackToBlocks}
                className="inline-flex items-center gap-1.5 rounded-full border border-cyan-600/30 bg-cyan-500/10 px-4 py-1.5 text-xs sm:text-sm font-bold text-cyan-800 shadow-2xs transition-all hover:-translate-x-0.5 hover:bg-cyan-500/20 hover:border-cyan-600/50"
              >
                <ChevronLeft className="h-4 w-4 stroke-[2.5]" />
                <span>Kembali</span>
              </button>

              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="font-mono text-xs font-semibold"
                >
                  {activeBlock.name}
                </Badge>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 w-full">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Card
                    key={i}
                    data-testid="skeleton-card"
                    className="group relative flex flex-col justify-between overflow-hidden border-border bg-card"
                  >
                    <CardHeader className="pt-6 pb-3">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted animate-pulse" />
                        <div className="h-5 w-24 bg-muted rounded animate-pulse" />
                      </div>
                      <div className="h-6 w-3/4 bg-muted rounded animate-pulse mt-2" />
                      <div className="h-4 w-full bg-muted rounded animate-pulse mt-3" />
                      <div className="h-4 w-2/3 bg-muted rounded animate-pulse mt-1" />
                    </CardHeader>
                    <CardContent className="pt-2 pb-5 flex items-center justify-between gap-4 mt-auto">
                      <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                      <div className="h-8 w-24 bg-muted rounded animate-pulse" />
                    </CardContent>
                  </Card>
                ))
              ) : filteredItems.length === 0 ? (
                <div className="col-span-full max-w-2xl mx-auto w-full py-12">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Belum ada materi</AlertTitle>
                    <AlertDescription>
                      Belum ada materi di kelompok ini.
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                filteredItems.map((item) => {
                  const visuals = getTopicVisuals(item.materialTitle);
                  const Icon = visuals.icon;
                  return (
                    <Card
                      key={item.materialId}
                      className="group relative flex flex-col justify-between overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 border-border hover:border-primary/40 bg-card"
                    >
                      <CardHeader className="pt-6 pb-3">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex items-center gap-1.5">
                            {item.academicGroupLabel && (
                              <Badge
                                variant="secondary"
                                className="text-[11px] font-mono font-semibold max-w-[160px] truncate"
                              >
                                {item.academicGroupLabel}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <CardTitle className="text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors leading-snug">
                          {item.materialTitle}
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-3">
                          {item.subtopicSummary}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="pt-2 pb-5 flex flex-col gap-3 mt-auto">
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-semibold text-muted-foreground font-mono">
                            {item.cardCount} Kartu
                          </span>

                          <Link
                            {...getButtonStyleProps({
                              variant: "outline",
                              size: "sm",
                              className:
                                "rounded-full group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all text-xs font-semibold",
                            })}
                            to={`/app/flash-cards/${item.subtopicId}`}
                          >
                            Mulai Belajar <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </ProductShell>
  );
}

export default FlashCardsPage;
