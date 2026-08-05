import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";
import { Filter, ArrowRight, AlertCircle } from "lucide-react";
import ProductShell from "../../components/layout/product-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button, getButtonStyleProps } from "../../components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { listPublishedFlashCardSubtopics } from "../../lib/api/flash-card-api";
import { productShellMeta } from "../../mocks/student-dashboard";
import { useStudentShell } from "./use-student-shell";
import { getTopicVisuals } from "../../lib/utils/topic-visuals";

function FlashCardsPage() {
  const studentShell = useStudentShell("/app/flash-cards");
  const [searchParams, setSearchParams] = useSearchParams();
  const activeFilter = searchParams.get("group") || "ALL";

  const { data: libraryData, isLoading, isError } = useQuery({
    queryKey: ["flash-card-library"],
    queryFn: () => listPublishedFlashCardSubtopics(),
  });

  const allItems = libraryData || [];

  const uniqueGroupLabels = Array.from(
    new Set(allItems.map(t => t.academicGroupLabel).filter(Boolean))
  );

  const filteredItems = activeFilter === "ALL"
    ? allItems
    : allItems.filter((item) => item.academicGroupLabel === activeFilter);

  return (
    <ProductShell
      brand={productShellMeta.brand}
      navItems={studentShell.navItems}
      tierLabel={studentShell.tierLabel}
    >
      <div className="flex flex-col gap-8 w-full py-4">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/40">
          <div>
            <Badge variant="outline" className="mb-2 px-3 py-1 text-xs font-semibold uppercase tracking-wider bg-primary/5 text-primary border-primary/20">
              <Filter className="mr-1.5 h-3.5 w-3.5 inline-block" />
              Latihan Mandiri
            </Badge>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              Kartu Belajar
            </h1>
            <p className="text-base text-muted-foreground mt-2 max-w-2xl">
              Pilih submateri lalu ulang poin penting dengan kartu belajar singkat.
            </p>
          </div>
        </div>

        {isError ? (
          <div className="w-full">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Kartu belajar belum bisa dimuat</AlertTitle>
              <AlertDescription>
                Coba lagi sebentar.
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <>
            {/* Filter Tabs */}
            {!isLoading && (
              <div className="flex flex-wrap items-center gap-2 pb-2">
                <Button
                  data-testid="filter-all"
                  variant={activeFilter === "ALL" ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setSearchParams((prev) => { prev.delete("group"); return prev; })}
                  className="rounded-full px-5 text-xs font-semibold"
                >
                  Semua Kelompok ({allItems.length})
                </Button>
                {uniqueGroupLabels.map((label) => (
                  <Button
                    key={label}
                    data-testid={`filter-${label}`}
                    variant={activeFilter === label ? "primary" : "outline"}
                    size="sm"
                    onClick={() => setSearchParams((prev) => { prev.set("group", label); return prev; })}
                    className="rounded-full px-5 text-xs font-semibold"
                  >
                    {label}
                  </Button>
                ))}
              </div>
            )}

            {/* Topic Cards Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 w-full">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} data-testid="skeleton-card" className="group relative flex flex-col justify-between overflow-hidden border-border bg-card">
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
                  const titleToSearch = `${item.subtopicTitle} ${item.materialTitle}`;
                  const visuals = getTopicVisuals(titleToSearch);
                  const Icon = visuals.icon;
                  return (
                    <Card
                      key={item.subtopicId}
                      className="group relative flex flex-col justify-between overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 border-border hover:border-primary/40 bg-card"
                    >
                      <CardHeader className="pt-6 pb-3">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex items-center gap-1.5">
                            {item.academicGroupLabel && (
                              <Badge variant="secondary" className="text-[11px] font-mono font-semibold max-w-[150px] truncate">
                                {item.academicGroupLabel}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <CardTitle className="text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors leading-snug">
                          {item.subtopicTitle}
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground mt-2 leading-relaxed">
                          {item.subtopicSummary}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="pt-2 pb-5 flex flex-col gap-3 mt-auto">
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-semibold text-muted-foreground font-mono truncate max-w-[150px]" title={item.materialTitle}>
                            {item.materialTitle} • {item.cardCount} Kartu
                          </span>

                          <Link
                            {...getButtonStyleProps({
                              variant: "outline",
                              size: "sm",
                              className: "group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all text-xs font-semibold",
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
          </>
        )}
      </div>
    </ProductShell>
  );
}

export default FlashCardsPage;
