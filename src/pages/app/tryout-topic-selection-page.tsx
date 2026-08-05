import { useQuery } from "@tanstack/react-query";
import { Filter, ArrowRight, ArrowLeft, AlertCircle } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import ProductShell from "../../components/layout/product-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button, getButtonStyleProps } from "../../components/ui/button";
import { productShellMeta } from "../../mocks/student-dashboard";
import { useStudentShell } from "./use-student-shell";
import { listTryoutCatalogEntries } from "../../lib/api/tryout-api";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { getTopicVisuals } from "../../lib/utils/topic-visuals";

function TryoutTopicSelectionPage() {
  const studentShell = useStudentShell("/app/tryout-selection");
  const [searchParams, setSearchParams] = useSearchParams();
  const activeFilter = searchParams.get("block") || "ALL";

  const { data: catalogEntries, isLoading, error } = useQuery({
    queryKey: ["tryout-catalog"],
    queryFn: () => listTryoutCatalogEntries(),
  });

  const topicOptions = (catalogEntries || []).filter((entry) => entry.mode === "topic");

  const uniqueBlocks = Array.from(
    new Map(
      topicOptions
        .filter(t => t.blockId && t.blockName)
        .map((t) => [t.blockId, { id: t.blockId!, name: t.blockName! }])
    ).values()
  );

  const filteredTopics = activeFilter === "ALL"
    ? topicOptions
    : topicOptions.filter((item) => item.blockId === activeFilter);

  return (
    <ProductShell
      brand={productShellMeta.brand}
      tierLabel={studentShell.tierLabel}
      navItems={studentShell.navItems}
    >
      <div className="flex flex-col gap-8 w-full py-4">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/40">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Link
                to="/app/tryout-selection"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-primary/30 bg-primary/5 px-4 py-2 text-sm font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200 shadow-2xs group"
              >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                <span>Kembali ke Mode Try Out</span>
              </Link>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              Try Out Per Materi / Topik
            </h1>
            <p className="text-base text-muted-foreground mt-2 max-w-2xl">
              Pilih topik spesifik yang ingin kamu dalami untuk mempertajam penguasaan konsep sebelum simulasi penuh.
            </p>
          </div>
        </div>

        {error ? (
          <div className="w-full">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Gagal Memuat Data</AlertTitle>
              <AlertDescription>
                Terjadi kesalahan saat memuat pilihan topik try out. Silakan coba beberapa saat lagi.
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
                  onClick={() => setSearchParams({})}
                  className="rounded-full px-5 text-xs font-semibold"
                >
                  Semua Blok ({topicOptions.length})
                </Button>
                {uniqueBlocks.map((block) => (
                  <Button
                    key={block.id}
                    data-testid={`filter-${block.id}`}
                    variant={activeFilter === block.id ? "primary" : "outline"}
                    size="sm"
                    onClick={() => setSearchParams({ block: block.id })}
                    className="rounded-full px-5 text-xs font-semibold"
                  >
                    {block.name}
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
                        <div className="flex items-center gap-1.5">
                          <div className="h-5 w-12 bg-muted rounded animate-pulse" />
                          <div className="h-5 w-12 bg-muted rounded animate-pulse" />
                        </div>
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
              ) : filteredTopics.length === 0 ? (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  Belum ada data materi try out yang tersedia untuk blok ini.
                </div>
              ) : (
                filteredTopics.map((topic) => {
                  const visuals = getTopicVisuals(topic.title);
                  const Icon = visuals.icon;
                  return (
                    <Card
                      key={topic.id}
                      className="group relative flex flex-col justify-between overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 border-border hover:border-primary/40 bg-card"
                    >
                      <CardHeader className="pt-6 pb-3">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex items-center gap-1.5">
                            {topic.blockName && (
                              <Badge variant="secondary" className="text-[11px] font-mono font-semibold max-w-[120px] truncate">
                                {topic.blockName}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <CardTitle className="text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors leading-snug">
                          {topic.title}
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground mt-2 leading-relaxed">
                          {topic.description}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="pt-2 pb-5 flex flex-col gap-3 mt-auto">
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-semibold text-muted-foreground font-mono">
                            {topic.requiredQuestionCount} Soal Latihan
                          </span>

                          {topic.isStartable ? (
                            <Link
                              {...getButtonStyleProps({
                                variant: "outline",
                                size: "sm",
                                className: "group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all text-xs font-semibold",
                              })}
                              to={`/app/tryout/session?template=${topic.sessionTemplateId}`}
                            >
                              Mulai Try Out <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                            </Link>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs font-semibold"
                              disabled
                            >
                              Mulai Try Out <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                        
                        {!topic.isStartable && topic.disabledReason && (
                          <span className="text-xs text-destructive text-right leading-tight">
                            {topic.disabledReason}
                          </span>
                        )}
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

export default TryoutTopicSelectionPage;

