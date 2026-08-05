# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the `DashboardPage` to match the Modern SaaS layout using `shadcn/ui` primitives, completely purging legacy "cream" styling and improving UX copywriting and hierarchy.

**Architecture:** We will map `shadcn/ui` CSS variables to our existing `clinical-*` tailwind colors in `src/index.css`. Then, we will swap out bespoke `SurfacePanel` and `StatePanel` components in `src/pages/app/dashboard-page.tsx` with standard Shadcn `Card`, `Badge`, and `Progress` components, restructuring the layout to put the "Target hari ini" (study queue) at the top. 

**Tech Stack:** React, Tailwind CSS v4, shadcn/ui, Lucide Icons

## Global Constraints

- Must use `shadcn/ui` standard CSS variables (`--background`, `--card`, `--primary`, etc.) mapped to `clinical-*` hex codes in `index.css`.
- Must completely remove the `#f2e8c9` (cream) background from `body` and `:root`.
- Changes must be restricted to `src/index.css` and `src/pages/app/dashboard-page.tsx`.
- Must pass `npm run build`.

---

### Task 1: Integrate Shadcn Variables & Purge Legacy Colors

**Files:**
- Modify: `src/index.css`

**Interfaces:**
- Consumes: N/A
- Produces: Shadcn compatible CSS variables on `:root` and `.dark` that use clinical elegance colors.

- [ ] **Step 1: Write the minimal implementation (CSS)**

```css
@import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap");
@import "tailwindcss";

@theme {
  --color-clinical-bg: #ffffff;
  --color-clinical-surface: #f8fafc;
  --color-clinical-text-primary: #0f172a;
  --color-clinical-text-secondary: #64748b;
  --color-clinical-accent: #06b6d4;
  --color-clinical-accent-dark: #0891b2;
  --color-clinical-success: #84cc16;
  --color-clinical-error: #ef4444;
  --color-clinical-border: #e2e8f0;

  --font-sans: "Inter", sans-serif;
  --font-display: "Space Grotesk", sans-serif;
  --font-mono: "JetBrains Mono", "SFMono-Regular", ui-monospace, monospace;
}

@layer base {
  :root {
    --background: 0 0% 100%; /* #ffffff */
    --foreground: 222.2 84% 4.9%; /* #0f172a equivalent */
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 191.6 91.4% 36.5%; /* #06b6d4 / clinical-accent */
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 191.6 91.4% 36.5%;
    --radius: 1.5rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-family: var(--font-sans);
    min-width: 320px;
    min-height: 100dvh;
    margin: 0;
  }
}
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm run build`
Expected: PASS (builds successfully)

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat(ui): integrate shadcn css variables and remove legacy cream theme"
```

---

### Task 2: Refactor Dashboard Layout & UX Copy

**Files:**
- Modify: `src/pages/app/dashboard-page.tsx`

**Interfaces:**
- Consumes: `shadcn/ui` components (`Card`, `Badge`) and standard tailwind classes.

- [ ] **Step 1: Write the minimal implementation (React)**

```tsx
// Complete replacement for src/pages/app/dashboard-page.tsx
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowUpRight, TrendingUp, CheckCircle, WarningOctagon, CircleNotch, Package } from "lucide-react";
import { Link } from "react-router";
import ProductShell from "../../components/layout/product-shell";
import { getButtonStyleProps } from "../../components/ui/button";
import { getDashboardSummary } from "../../lib/api/analytics-api";
import { useSession } from "../../lib/auth/use-session";
import { usePreviewRouteState } from "../../lib/preview-route-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { productShellMeta } from "../../mocks/student-dashboard";
import { useStudentShell } from "./use-student-shell";

function DashboardPage() {
  const { user } = useSession();
  const studentShell = useStudentShell("/app");
  const summaryView = usePreviewRouteState("summaryView");
  const dashboardQuery = useQuery({
    queryKey: ["student-dashboard", user?.id],
    enabled: summaryView === "ready" && Boolean(user?.id),
    queryFn: () =>
      getDashboardSummary({
        userId: user!.id,
      }),
  });
  const dashboard = dashboardQuery.data;
  const latestReviewHref = dashboard?.latestAttemptId
    ? `/app/review/${dashboard.latestAttemptId}`
    : "/app/review";

  return (
    <ProductShell
      brand={productShellMeta.brand}
      tierLabel={studentShell.tierLabel}
      navItems={studentShell.navItems}
    >
      <header className="flex flex-col gap-5 py-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/80">
            {productShellMeta.headerEyebrow}
          </p>
          <h1 className="font-display mt-3 max-w-2xl text-[clamp(2rem,4vw,3.5rem)] font-bold leading-[1.02] tracking-tight text-foreground">
            {productShellMeta.headerTitle}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            Selamat datang kembali! Mari lanjutkan progres belajarmu hari ini.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-start lg:max-w-md lg:justify-end">
          <Link
            {...getButtonStyleProps({
              className: "gap-2 sm:min-w-[12rem] bg-white text-primary border-primary hover:bg-primary/5",
              variant: "outline",
            })}
            to={latestReviewHref}
          >
            <Activity className="h-4 w-4" />
            Riwayat Terakhir
          </Link>
          <Link
            {...getButtonStyleProps({
              className: "gap-2 sm:min-w-[12rem] shadow-md shadow-primary/20 hover:-translate-y-0.5 transition-transform",
              variant: "primary",
            })}
            to="/app/tryout"
          >
            <ArrowUpRight className="h-4 w-4" />
            Mulai Belajar
          </Link>
        </div>
      </header>

      {summaryView === "ready" && dashboardQuery.isLoading ? (
        <Card className="mt-8 border-dashed shadow-sm">
          <CardHeader className="flex flex-row items-center gap-4">
            <CircleNotch className="h-8 w-8 animate-spin text-primary" />
            <div>
              <CardTitle>Menyiapkan ringkasan belajarmu...</CardTitle>
              <CardDescription>Mohon tunggu sebentar.</CardDescription>
            </div>
          </CardHeader>
        </Card>
      ) : summaryView === "ready" && dashboardQuery.isError ? (
        <Card className="mt-8 border-destructive/50 bg-destructive/5 shadow-sm">
          <CardHeader className="flex flex-row items-center gap-4">
            <WarningOctagon className="h-8 w-8 text-destructive" />
            <div>
              <CardTitle className="text-destructive">Gagal memuat data</CardTitle>
              <CardDescription>Coba muat ulang halaman atau lihat riwayat terakhir.</CardDescription>
            </div>
          </CardHeader>
        </Card>
      ) : summaryView === "ready" && !dashboard ? (
        <Card className="mt-8 border-dashed shadow-sm bg-muted/30">
          <CardHeader className="flex flex-row items-center gap-4">
            <Package className="h-8 w-8 text-muted-foreground" />
            <div>
              <CardTitle>Belum ada aktivitas</CardTitle>
              <CardDescription>Selesaikan sesi pertamamu untuk melihat analisis performa di sini.</CardDescription>
            </div>
          </CardHeader>
          <CardFooter>
            <Link {...getButtonStyleProps({ variant: "primary" })} to="/app/tryout">
              Mulai Sesi Pertama
            </Link>
          </CardFooter>
        </Card>
      ) : summaryView === "ready" && dashboard ? (
        <div className="mt-8 grid gap-6">
          {/* Top Priority Row */}
          <div className="grid gap-6 xl:grid-cols-[1fr_1.5fr]">
            {/* Target Hari Ini */}
            <Card className="shadow-md shadow-primary/5 hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-2xl">Fokus Hari Ini</CardTitle>
                <CardDescription>Materi yang paling mendesak untuk dikuasai.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {dashboard.studyQueue.slice(0, 2).map((item, index) => (
                  <div key={item.topic} className="flex items-start gap-4 rounded-xl border bg-card p-4 shadow-sm">
                    <Badge variant={index === 0 ? "default" : "secondary"} className="mt-0.5">
                      {index === 0 ? "Prioritas" : "Lanjutan"}
                    </Badge>
                    <div>
                      <p className="font-semibold">{item.topic}</p>
                      <p className="text-sm text-muted-foreground">{item.focus}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Insight Highlight */}
            <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-xl shadow-primary/20">
              <CardHeader>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-foreground/80 mb-2">
                  <TrendingUp className="h-4 w-4" />
                  Insight AI
                </div>
                <CardTitle className="text-3xl leading-tight text-white">{dashboard.primaryInsightTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-primary-foreground/90 leading-relaxed mb-6">
                  {dashboard.primaryInsightBody}
                </p>
                <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm border border-white/20">
                  <p className="text-sm font-medium text-white">Target perbaikan:</p>
                  <p className="text-sm text-white/80">{dashboard.weakestBlockTarget}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Metrics Row */}
          <div className="grid gap-6 md:grid-cols-3">
            {dashboard.progressCards.map((card) => (
              <Card key={card.label} className="shadow-sm hover:shadow-md transition-all duration-300">
                <CardContent className="pt-6">
                  <Badge variant="outline" className="mb-4 bg-muted/50">{card.label}</Badge>
                  <p className="text-4xl font-bold tracking-tight mb-2">{card.value}</p>
                  <p className="text-sm text-muted-foreground">{card.detail}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Bottom Row */}
          <div className="grid gap-6 xl:grid-cols-2">
             <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Materi Terlemah</CardTitle>
                <CardDescription>Fokus tingkatkan pemahaman di materi ini untuk mendongkrak skormu.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {dashboard.blockPerformance.map((item) => (
                  <div key={item.name} className="flex flex-col gap-2 rounded-lg border p-4 bg-muted/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.status}</p>
                      </div>
                      <p className="font-bold text-lg">{item.score}%</p>
                    </div>
                    <div className="h-2 w-full bg-muted overflow-hidden rounded-full">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${item.score}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Riwayat Sesi Terakhir</CardTitle>
                <CardDescription>Evaluasi kembali soal-soal yang menjebak.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {dashboard.recentAttempts.map((attempt) => (
                  <div key={`${attempt.title}-${attempt.meta}`} className="flex items-start justify-between gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-semibold">{attempt.title}</p>
                      <p className="text-xs text-muted-foreground mb-2">{attempt.meta}</p>
                      <p className="text-sm text-muted-foreground leading-snug">{attempt.note}</p>
                    </div>
                    <Badge variant="secondary" className="px-3 py-1 font-bold text-sm bg-primary/10 text-primary">
                      {attempt.score}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </ProductShell>
  );
}

export default DashboardPage;
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm run build`
Expected: PASS (builds successfully)

- [ ] **Step 3: Commit**

```bash
git add src/pages/app/dashboard-page.tsx
git commit -m "feat(ui): redesign dashboard with shadcn components and modern ux copy"
```
