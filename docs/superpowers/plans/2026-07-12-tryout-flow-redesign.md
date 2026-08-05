# Try Out Flow Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the core Try Out Flow (`catalog`, `session`, and `result` pages) to match the Modern SaaS layout using `shadcn/ui` primitives, eliminating all remaining legacy `var(--color-*)` usages.

**Architecture:** We will systematically replace bespoke `SurfacePanel`, `StatePanel`, and inline CSS variable classes with standard Shadcn `Card`, `Badge`, `Alert`, and `Button` components across the Try Out flow pages. We will map custom "tones" to Shadcn variants (e.g. `destructive`, `secondary`, `outline`).

**Tech Stack:** React, Tailwind CSS v4, shadcn/ui, Lucide Icons

## Global Constraints

- Must completely remove `#f2e8c9` (cream), `var(--color-gold)`, `var(--color-outline)` and other legacy variables from the refactored files.
- Must replace `SurfacePanel` and `StatePanel` with Shadcn `Card`.
- Replace Phosphor icons with `lucide-react` icons (e.g., `<Exam>` -> `<BookOpen>`, `<Flask>` -> `<Beaker>`).
- Must pass `npm run build` after each task.

---

### Task 1: Refactor Tryout Catalog Page

**Files:**
- Modify: `src/pages/app/tryout-catalog-page.tsx`

**Interfaces:**
- Consumes: `shadcn/ui` components (`Card`, `Badge`).

- [ ] **Step 1: Write the minimal implementation (React)**

*Note: Replace Phosphor icons with Lucide icons (BookOpen, Stethoscope, Beaker, ArrowRight, Package, Loader2).*

```tsx
// Replace entire file with Shadcn implementations
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, Beaker, Stethoscope, Loader2, AlertTriangle, Package } from "lucide-react";
import { Link } from "react-router";
import ProductShell from "../../components/layout/product-shell";
import Button, { getButtonStyleProps } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import SectionHeading from "../../components/ui/section-heading";
import { findActiveAttemptForUser, listTryoutCatalogEntries } from "../../lib/api/tryout-api";
import { formatDurationAsClock, groupTemplatesForCatalog, type TryoutCatalogCard } from "../../lib/mappers/tryout-mappers";
import { useSession } from "../../lib/auth/use-session";
import { productShellMeta } from "../../mocks/student-dashboard";
import { useStudentShell } from "./use-student-shell";

function resolveCardIcon(item: TryoutCatalogCard) {
  if (item.mode === "full") return <BookOpen className="w-4 h-4" />;
  if (item.blockName === "Clinical Science") return <Stethoscope className="w-4 h-4" />;
  return <Beaker className="w-4 h-4" />;
}

function TryoutCatalogCardView({ item }: { item: TryoutCatalogCard }) {
  const showEnabledStartAction = item.isStartable && item.sessionTemplateId;
  const isAccent = item.emphasis === "accent";

  return (
    <Card className={`flex flex-col justify-between transition-shadow hover:shadow-md ${isAccent ? 'bg-primary text-primary-foreground border-primary/20 shadow-primary/10' : 'bg-card'}`}>
      <CardHeader>
        <Badge variant={isAccent ? "secondary" : "outline"} className={`w-fit flex items-center gap-1 ${isAccent ? 'bg-white/20 text-white border-transparent' : ''}`}>
          {resolveCardIcon(item)}
          {item.subtitle}
        </Badge>
        <CardTitle className={`text-2xl mt-4 ${isAccent ? 'text-white' : ''}`}>{item.title}</CardTitle>
        <CardDescription className={`${isAccent ? 'text-primary-foreground/80' : ''}`}>{item.description}</CardDescription>
      </CardHeader>
      <CardContent className="mt-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Badge variant={isAccent ? "secondary" : "secondary"} className={`${isAccent ? 'bg-white/10 text-white' : 'bg-primary/10 text-primary'}`}>
            {item.questionCountLabel}
          </Badge>
          {showEnabledStartAction ? (
            <Link
              {...getButtonStyleProps({ variant: isAccent ? "secondary" : "primary" })}
              to={`/app/tryout/session?template=${item.sessionTemplateId}`}
            >
              Mulai sesi <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          ) : (
            <Button disabled variant="secondary">
              Mulai sesi <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
        {item.disabledReason && (
          <p className={`text-sm ${isAccent ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
            {item.disabledReason}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function resolveResumeModeLabel(mode: "full" | "block" | "topic") {
  if (mode === "full") return "Simulasi penuh";
  if (mode === "block") return "Try out per blok";
  return "Try out per materi";
}

function TryoutCatalogPage() {
  const { user } = useSession();
  const studentShell = useStudentShell("/app/tryout");
  const templatesQuery = useQuery({ queryKey: ["tryout-catalog"], queryFn: () => listTryoutCatalogEntries() });
  const activeAttemptQuery = useQuery({
    queryKey: ["active-tryout-attempt", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => findActiveAttemptForUser({ userId: user!.id }),
  });
  
  const catalogGroups = groupTemplatesForCatalog(templatesQuery.data ?? []);
  const activeAttempt = activeAttemptQuery.data;

  return (
    <ProductShell brand={productShellMeta.brand} tierLabel={studentShell.tierLabel} navItems={studentShell.navItems}>
      <section id="tryout">
        <SectionHeading title="Katalog try out" description="Mulai dari simulasi penuh, lalu lanjutkan ke sesi per blok atau materi sesuai fokus belajarmu." eyebrow="Pilih sesi" />

        <div className="mt-6">
          {activeAttempt && (
            <Card className="mb-8 bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg border-primary/20">
              <CardHeader>
                <Badge variant="secondary" className="w-fit bg-white/20 text-white hover:bg-white/30 border-transparent">
                  {activeAttempt.status === "paused" ? "Lanjutkan sesi" : "Sesi masih berjalan"}
                </Badge>
                <CardTitle className="mt-4 text-2xl text-white">{activeAttempt.title}</CardTitle>
                <CardDescription className="text-white/80">{resolveResumeModeLabel(activeAttempt.mode)}. Lanjutkan sesi tertunda tanpa mulai lagi dari awal.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="secondary" className="bg-white/10 text-white border-white/20">{activeAttempt.answeredCount} dari {activeAttempt.totalQuestions} soal terjawab</Badge>
                    <Badge variant="secondary" className="bg-white/10 text-white border-white/20">Timer sesi {formatDurationAsClock(activeAttempt.timeRemainingSeconds)}</Badge>
                  </div>
                  <Link
                    {...getButtonStyleProps({ className: "bg-white text-primary hover:bg-white/90" })}
                    to={`/app/tryout/session?attempt=${activeAttempt.attemptId}`}
                  >
                    Lanjutkan sesi <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {templatesQuery.isLoading ? (
             <Card className="mt-8 border-dashed shadow-sm">
                <CardHeader className="flex flex-row items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <div><CardTitle>Memuat katalog...</CardTitle><CardDescription>Mohon tunggu sebentar.</CardDescription></div>
                </CardHeader>
              </Card>
          ) : templatesQuery.isError ? (
             <Card className="mt-8 border-destructive/50 bg-destructive/5 shadow-sm">
                <CardHeader className="flex flex-row items-center gap-4">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                  <div><CardTitle className="text-destructive">Gagal memuat katalog</CardTitle><CardDescription>Coba muat ulang halaman.</CardDescription></div>
                </CardHeader>
              </Card>
          ) : !catalogGroups.fullTemplate && catalogGroups.blockTemplates.length === 0 && catalogGroups.topicGroups.length === 0 ? (
             <Card className="mt-8 border-dashed shadow-sm bg-muted/30">
                <CardHeader className="flex flex-row items-center gap-4">
                  <Package className="h-8 w-8 text-muted-foreground" />
                  <div><CardTitle>Belum ada sesi</CardTitle><CardDescription>Katalog try out kosong.</CardDescription></div>
                </CardHeader>
              </Card>
          ) : (
            <div className="space-y-12">
              {catalogGroups.fullTemplate && (
                <div>
                  <h3 className="mb-4 text-xl font-bold tracking-tight">Simulasi Penuh</h3>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <TryoutCatalogCardView item={catalogGroups.fullTemplate} />
                  </div>
                </div>
              )}
              {catalogGroups.blockTemplates.length > 0 && (
                <div>
                  <h3 className="mb-4 text-xl font-bold tracking-tight">Try Out Per Blok</h3>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {catalogGroups.blockTemplates.map(item => <TryoutCatalogCardView key={item.sessionTemplateId ?? item.title} item={item} />)}
                  </div>
                </div>
              )}
              {catalogGroups.topicGroups.map(group => (
                <div key={group.blockName}>
                  <h3 className="mb-4 text-xl font-bold tracking-tight">{group.blockName}</h3>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {group.topics.map(item => <TryoutCatalogCardView key={item.sessionTemplateId ?? item.title} item={item} />)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </ProductShell>
  );
}
export default TryoutCatalogPage;
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm run build`
Expected: PASS (builds successfully)

- [ ] **Step 3: Commit**

```bash
git add src/pages/app/tryout-catalog-page.tsx
git commit -m "feat(ui): refactor tryout catalog with shadcn components"
```

---

### Task 2: Refactor Tryout Result Page

**Files:**
- Modify: `src/pages/app/tryout-result-page.tsx`

**Interfaces:**
- Consumes: `shadcn/ui` components (`Card`, `Badge`).

- [ ] **Step 1: Write the minimal implementation (React)**

*Note: Replace Phosphor icons with Lucide icons.*

```tsx
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle, Timer, Loader2, AlertTriangle, Package } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import ProductShell from "../../components/layout/product-shell";
import { getButtonStyleProps } from "../../components/ui/button";
import SectionHeading from "../../components/ui/section-heading";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { useSession } from "../../lib/auth/use-session";
import { findLatestSubmittedAttemptId, getAttemptResultPageData } from "../../lib/api/tryout-api";
import { formatDurationAsClock } from "../../lib/mappers/tryout-mappers";
import { productShellMeta } from "../../mocks/student-dashboard";
import { useStudentShell } from "./use-student-shell";

function TryoutResultPage() {
  const [searchParams] = useSearchParams();
  const { user } = useSession();
  const studentShell = useStudentShell("/app/tryout");
  const attemptId = searchParams.get("attempt");
  
  const latestAttemptQuery = useQuery({
    queryKey: ["latest-submitted-attempt", user?.id],
    enabled: !attemptId && Boolean(user?.id),
    queryFn: () => findLatestSubmittedAttemptId({ userId: user!.id }),
  });
  
  const resolvedAttemptId = attemptId ?? latestAttemptQuery.data ?? null;
  const resultQuery = useQuery({
    queryKey: ["tryout-result", resolvedAttemptId],
    enabled: Boolean(resolvedAttemptId),
    queryFn: () => getAttemptResultPageData({ attemptId: resolvedAttemptId! }),
  });
  
  const resultData = resultQuery.data;
  const totalQuestions = resultData ? resultData.correctAnswers + resultData.wrongAnswers + resultData.unansweredCount : 0;
  
  const weakestWrongCount = resultData && resultData.blocks.length > 0 ? Math.max(...resultData.blocks.map(b => b.wrong)) : null;
  const weakestBlocks = resultData && weakestWrongCount !== null ? resultData.blocks.filter(b => b.wrong === weakestWrongCount) : [];
  
  let weakestBlockInsight = "Review jawaban yang masih salah lebih dulu.";
  if (weakestWrongCount === 0) weakestBlockInsight = "Semua jawaban sudah tepat. Lanjut review untuk mengunci strategi ini.";
  else if (weakestWrongCount !== null && weakestWrongCount > 0 && weakestBlocks.length === 1) weakestBlockInsight = `Review jawaban ${weakestBlocks[0].blockLabel} yang masih salah lebih dulu.`;

  return (
    <ProductShell brand={productShellMeta.brand} tierLabel={studentShell.tierLabel} navItems={studentShell.navItems}>
      <section id="tryout">
        <SectionHeading title="Hasil try out" description="Skor akhir, hasil per blok, dan akses pembahasan." eyebrow="Hasil akhir" />

        {latestAttemptQuery.isLoading || resultQuery.isLoading ? (
          <Card className="mt-8 border-dashed shadow-sm">
            <CardHeader className="flex flex-row items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div><CardTitle>Menyiapkan hasil...</CardTitle><CardDescription>Mohon tunggu sebentar.</CardDescription></div>
            </CardHeader>
          </Card>
        ) : latestAttemptQuery.isError || resultQuery.isError ? (
          <Card className="mt-8 border-destructive/50 bg-destructive/5 shadow-sm">
            <CardHeader className="flex flex-row items-center gap-4">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <div><CardTitle className="text-destructive">Gagal memuat hasil</CardTitle><CardDescription>Coba muat ulang halaman.</CardDescription></div>
            </CardHeader>
          </Card>
        ) : !resolvedAttemptId || !resultData ? (
          <Card className="mt-8 border-dashed shadow-sm bg-muted/30">
            <CardHeader className="flex flex-row items-center gap-4">
              <Package className="h-8 w-8 text-muted-foreground" />
              <div><CardTitle>Belum ada hasil</CardTitle><CardDescription>Belum ada hasil try out untuk ditampilkan.</CardDescription></div>
            </CardHeader>
          </Card>
        ) : (
          <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="bg-gradient-to-br from-primary to-primary/80 text-white shadow-xl shadow-primary/20 border-primary/20">
              <CardHeader>
                <Badge variant="secondary" className="w-fit flex items-center gap-1 bg-white/20 text-white border-transparent">
                  <CheckCircle className="w-4 h-4" /> Sesi selesai
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-3 mb-6">
                  <span className="text-7xl font-bold tracking-tighter text-white">{Math.round(resultData.score)}</span>
                  <span className="pb-2 text-sm font-semibold uppercase tracking-wider text-white/70">Skor Akhir</span>
                </div>
                <p className="text-lg text-white/90 mb-2">
                  {resultData.correctAnswers} dari {totalQuestions} soal terjawab benar pada sesi ini.
                </p>
                <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm border border-white/20 mb-8">
                  <p className="text-sm font-medium text-white">{weakestBlockInsight}</p>
                </div>
                <Link {...getButtonStyleProps({ className: "bg-white text-primary hover:bg-white/90" })} to={`/app/review/${resultData.attemptId}`}>
                  Review jawaban <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </CardContent>
            </Card>

            <div className="grid gap-6 content-start">
              <div className="grid gap-6 sm:grid-cols-2">
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardDescription className="uppercase tracking-wider font-semibold text-primary">Jawaban Benar</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{resultData.correctAnswers}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardDescription className="uppercase tracking-wider font-semibold text-primary">Waktu Terpakai</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{formatDurationAsClock(resultData.timeUsedSeconds)}</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary mb-2">
                    <Timer className="w-4 h-4" /> Distribusi Hasil
                  </div>
                </CardHeader>
                <CardContent>
                  {resultData.blocks.length > 0 ? (
                    <div className="space-y-4">
                      {resultData.blocks.map((item) => (
                        <div key={item.blockLabel} className="flex items-center justify-between rounded-xl border bg-muted/30 p-4">
                          <div>
                            <p className="font-semibold">{item.blockLabel}</p>
                            <p className="text-sm text-muted-foreground">{item.correct} benar, {item.wrong} salah</p>
                          </div>
                          <Badge variant={item.wrong > item.correct ? "destructive" : "secondary"} className={item.wrong <= item.correct ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}>
                            {item.correct + item.wrong} soal
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Distribusi hasil belum tersedia.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </section>
    </ProductShell>
  );
}
export default TryoutResultPage;
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm run build`
Expected: PASS (builds successfully)

- [ ] **Step 3: Commit**

```bash
git add src/pages/app/tryout-result-page.tsx
git commit -m "feat(ui): refactor tryout result page with shadcn components"
```
