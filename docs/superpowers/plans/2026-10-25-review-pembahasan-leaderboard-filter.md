# Review Pembahasan Leaderboard Filter & Uniform Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan filter kategori ujian bergaya Leaderboard (5 pill buttons) dan mengubah card riwayat pembahasan menjadi card horizontal seragam dengan urutan terbaru di paling atas pada halaman `/app/review`.

**Architecture:** Memperkaya query riwayat try out pada `tryout-api.ts` dan `review-api.ts` untuk mengembalikan metadata kategori (`all_blok`, `blok_cs`, `blok_ps`, `blok_sba`, `terjadwal`). Di sisi frontend (`review-page.tsx`), menambahkan state filter kategori aktif yang menyaring data secara client-side, merender filter pill bar bergaya Leaderboard, serta merender list card seragam dengan pengurutan waktu `submittedAt` terbaru di atas.

**Tech Stack:** React 19, TypeScript, TanStack Query, Tailwind CSS, Lucide React, Vitest.

## Global Constraints

- 5 Tombol filter pil harus tepat: "Try Out All Blok", "Try Out Blok CS", "Try Out Blok PS", "Try Out Blok SBA", "Try Out Terjadwal".
- Filter aktif default adalah "Try Out All Blok".
- Desain visual filter pill identik dengan `LeaderboardPage` (`rounded-full px-5 py-2 text-xs font-semibold`, aktif berwarna primary/cyan dengan `shadow-md shadow-primary/20`, inaktif `variant="outline"`).
- Card riwayat pembahasan harus seragam (tidak ada variasi rank emas/perak/perunggu), ber-border netral halus `border-border/80 bg-card hover:border-primary/40`.
- Riwayat ujian yang baru saja disubmit selalu berada di posisi paling atas (`submittedAt` descending).

---

### Task 1: Enrich History API Queries & Category Classification

**Files:**
- Modify: `src/lib/api/tryout-api.ts:119-140, 278-286, 603-616, 1235-1250`
- Modify: `src/lib/api/review-api.ts:14-57`
- Test: `src/lib/api/review-api.test.ts`

**Interfaces:**
- Produces `ReviewFilterCategory`: `"all_blok" | "blok_cs" | "blok_ps" | "blok_sba" | "terjadwal"`
- Produces `ReviewHistoryItem.category: ReviewFilterCategory`
- Produces `determineReviewCategory(item: { source: ReviewSource; title?: string; mode?: "full" | "block" | "topic" | null; blockSlug?: string | null; blockName?: string | null; }): ReviewFilterCategory`

- [ ] **Step 1: Write failing unit test in `src/lib/api/review-api.test.ts`**

Update `src/lib/api/review-api.test.ts` to test category classification and descending date sorting:

```ts
import { describe, expect, test, vi } from "vitest";
import { determineReviewCategory, getReviewDetailData, listReviewHistory } from "./review-api";

const mockListSubmittedAttemptHistory = vi.fn();
const mockGetAttemptReviewPageData = vi.fn();
const mockListScheduledSubmittedAttemptHistory = vi.fn();
const mockGetScheduledAttemptReviewPageData = vi.fn();
const mockListOsceAttemptHistory = vi.fn();

vi.mock("./tryout-api", () => ({
  listSubmittedAttemptHistory: (...args: unknown[]) => mockListSubmittedAttemptHistory(...args),
  getAttemptReviewPageData: (...args: unknown[]) => mockGetAttemptReviewPageData(...args),
}));

vi.mock("./scheduled-tryout-api", () => ({
  listScheduledSubmittedAttemptHistory: (...args: unknown[]) => mockListScheduledSubmittedAttemptHistory(...args),
  getScheduledAttemptReviewPageData: (...args: unknown[]) => mockGetScheduledAttemptReviewPageData(...args),
}));

vi.mock("./osce-api", () => ({
  listOsceAttemptHistory: (...args: unknown[]) => mockListOsceAttemptHistory(...args),
  getOsceAttemptDetail: vi.fn(),
}));

describe("review-api", () => {
  describe("determineReviewCategory", () => {
    test("classifies scheduled source as terjadwal", () => {
      expect(determineReviewCategory({ source: "scheduled", title: "TO Akbar" })).toBe("terjadwal");
    });

    test("classifies clinical science as blok_cs", () => {
      expect(determineReviewCategory({ source: "tryout", blockSlug: "clinical-science" })).toBe("blok_cs");
      expect(determineReviewCategory({ source: "tryout", title: "Clinical Science" })).toBe("blok_cs");
    });

    test("classifies pharmaceutical science as blok_ps", () => {
      expect(determineReviewCategory({ source: "tryout", blockSlug: "pharmaceutical-science" })).toBe("blok_ps");
      expect(determineReviewCategory({ source: "tryout", title: "Pharmaceutical Science" })).toBe("blok_ps");
    });

    test("classifies sba as blok_sba", () => {
      expect(determineReviewCategory({ source: "tryout", blockSlug: "social-behavior-administrative-pharmacy" })).toBe("blok_sba");
      expect(determineReviewCategory({ source: "tryout", title: "Social, Behavioral & Administrative Pharmacy" })).toBe("blok_sba");
    });

    test("classifies full mode or tryout besar as all_blok", () => {
      expect(determineReviewCategory({ source: "tryout", mode: "full", title: "Try Out Besar" })).toBe("all_blok");
      expect(determineReviewCategory({ source: "tryout", title: "Try Out All Blok" })).toBe("all_blok");
    });
  });

  describe("listReviewHistory", () => {
    test("merges, assigns categories, and sorts newest first", async () => {
      mockListSubmittedAttemptHistory.mockResolvedValue([
        {
          attemptId: "attempt-1",
          title: "Try Out Besar",
          submittedAt: "2026-05-03T08:00:00.000Z",
          score: 78,
          correctAnswers: 156,
          wrongAnswers: 44,
          mode: "full",
        },
        {
          attemptId: "attempt-2",
          title: "Clinical Science",
          submittedAt: "2026-05-01T08:00:00.000Z",
          score: 70,
          correctAnswers: 70,
          wrongAnswers: 30,
          mode: "block",
          blockSlug: "clinical-science",
        },
      ]);
      mockListScheduledSubmittedAttemptHistory.mockResolvedValue([
        {
          attemptId: "scheduled-attempt-1",
          title: "TO Klinik Juni",
          submittedAt: "2026-05-04T08:00:00.000Z",
          score: 82,
          correctAnswers: 33,
          wrongAnswers: 7,
          source: "scheduled",
        },
      ]);
      mockListOsceAttemptHistory.mockResolvedValue([]);

      const result = await listReviewHistory({ userId: "user-1" });

      expect(result).toHaveLength(3);
      // Newest first:
      expect(result[0].attemptId).toBe("scheduled-attempt-1");
      expect(result[0].category).toBe("terjadwal");

      expect(result[1].attemptId).toBe("attempt-1");
      expect(result[1].category).toBe("all_blok");

      expect(result[2].attemptId).toBe("attempt-2");
      expect(result[2].category).toBe("blok_cs");
    });
  });
});
```

- [ ] **Step 2: Update `src/lib/api/tryout-api.ts`**

Update `AttemptHistoryRow`, `SubmittedAttemptHistoryItem`, `mapSubmittedAttemptHistoryItem`, and `listSubmittedAttemptHistory`:

In `src/lib/api/tryout-api.ts`:
```ts
type AttemptHistoryRow = {
  id: string;
  submitted_at: string;
  exam_template?:
    | {
      title: string;
      mode?: "full" | "block" | "topic" | null;
      block_id?: string | null;
      block?: {
        name: string;
        slug: string;
      } | Array<{
        name: string;
        slug: string;
      }> | null;
    }
    | Array<{
      title: string;
      mode?: "full" | "block" | "topic" | null;
      block_id?: string | null;
      block?: {
        name: string;
        slug: string;
      } | Array<{
        name: string;
        slug: string;
      }> | null;
    }>
    | null;
  attempt_result?:
    | {
      score: number;
      correct_answers: number;
      wrong_answers: number;
    }
    | Array<{
      score: number;
      correct_answers: number;
      wrong_answers: number;
    }>
    | null;
};

export type SubmittedAttemptHistoryItem = {
  attemptId: string;
  title: string;
  submittedAt: string;
  score: number;
  correctAnswers: number;
  wrongAnswers: number;
  mode?: "full" | "block" | "topic" | null;
  blockSlug?: string | null;
  blockName?: string | null;
};

function mapSubmittedAttemptHistoryItem(row: AttemptHistoryRow): SubmittedAttemptHistoryItem {
  const relatedTemplate = Array.isArray(row.exam_template) ? row.exam_template[0] ?? null : row.exam_template;
  const relatedResult = Array.isArray(row.attempt_result) ? row.attempt_result[0] ?? null : row.attempt_result;
  const rawBlock = relatedTemplate?.block;
  const relatedBlock = rawBlock ? (Array.isArray(rawBlock) ? rawBlock[0] ?? null : rawBlock) : null;

  return {
    attemptId: row.id,
    title: relatedTemplate?.title ?? "Try out",
    submittedAt: row.submitted_at,
    score: relatedResult?.score ?? 0,
    correctAnswers: relatedResult?.correct_answers ?? 0,
    wrongAnswers: relatedResult?.wrong_answers ?? 0,
    mode: relatedTemplate?.mode ?? null,
    blockSlug: relatedBlock?.slug ?? null,
    blockName: relatedBlock?.name ?? null,
  };
}

export async function listSubmittedAttemptHistory(
  {
    client = getSupabaseBrowserClient(),
    userId,
  }: {
    client?: TryoutClient;
    userId: string;
  },
): Promise<SubmittedAttemptHistoryItem[]> {
  const { data, error } = await client
    .from("attempts")
    .select(`
      id,
      submitted_at,
      exam_template:exam_templates(
        title,
        mode,
        block_id,
        block:blocks(name, slug)
      ),
      attempt_result:attempt_results(score, correct_answers, wrong_answers)
    `)
    .eq("user_id", userId)
    .eq("status", "submitted")
    .order("submitted_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data as AttemptHistoryRow[] | null)?.map(mapSubmittedAttemptHistoryItem) ?? [];
}
```

- [ ] **Step 3: Update `src/lib/api/review-api.ts`**

Update `ReviewFilterCategory`, `ReviewHistoryItem`, `determineReviewCategory`, and `listReviewHistory`:

```ts
export type ReviewSource = "tryout" | "scheduled" | "osce";

export type ReviewFilterCategory =
  | "all_blok"
  | "blok_cs"
  | "blok_ps"
  | "blok_sba"
  | "terjadwal";

export type ReviewHistoryItem = {
  attemptId: string;
  title: string;
  submittedAt: string;
  score: number;
  correctAnswers: number;
  wrongAnswers: number;
  source: ReviewSource;
  category: ReviewFilterCategory;
};

export function determineReviewCategory(item: {
  source: ReviewSource;
  title?: string;
  mode?: "full" | "block" | "topic" | null;
  blockSlug?: string | null;
  blockName?: string | null;
}): ReviewFilterCategory {
  if (item.source === "scheduled") {
    return "terjadwal";
  }

  const slug = (item.blockSlug || "").toLowerCase();
  const blockName = (item.blockName || "").toLowerCase();
  const title = (item.title || "").toLowerCase();

  // Clinical Science
  if (slug === "clinical-science" || blockName.includes("clinical") || title.includes("clinical science") || title.includes("blok cs")) {
    return "blok_cs";
  }

  // Pharmaceutical Science
  if (slug === "pharmaceutical-science" || blockName.includes("pharmaceutical") || title.includes("pharmaceutical science") || title.includes("blok ps")) {
    return "blok_ps";
  }

  // Social, Behavioral & Administrative Pharmacy
  if (
    slug === "social-behavior-administrative-pharmacy" ||
    blockName.includes("social") ||
    blockName.includes("sba") ||
    title.includes("social, behavioral") ||
    title.includes("blok sba")
  ) {
    return "blok_sba";
  }

  // All Blok / Full
  if (item.mode === "full" || title.includes("besar") || title.includes("all blok")) {
    return "all_blok";
  }

  return "all_blok";
}

export async function listReviewHistory({
  userId,
}: {
  userId: string;
}): Promise<ReviewHistoryItem[]> {
  const [tryoutHistory, scheduledHistory, osceHistory] = await Promise.all([
    listSubmittedAttemptHistory({ userId }),
    listScheduledSubmittedAttemptHistory({ userId }),
    listOsceAttemptHistory(),
  ]);

  const items: ReviewHistoryItem[] = [
    ...tryoutHistory.map((item) => ({
      attemptId: item.attemptId,
      title: item.title,
      submittedAt: item.submittedAt,
      score: item.score,
      correctAnswers: item.correctAnswers,
      wrongAnswers: item.wrongAnswers,
      source: "tryout" as const,
      category: determineReviewCategory({
        source: "tryout",
        title: item.title,
        mode: item.mode,
        blockSlug: item.blockSlug,
        blockName: item.blockName,
      }),
    })),
    ...scheduledHistory.map((item) => ({
      ...item,
      category: "terjadwal" as const,
    })),
    ...osceHistory.map((item: any) => ({
      attemptId: item.id,
      title: item.station?.title || "Simulasi OSCE",
      submittedAt: item.created_at,
      score: item.total_score,
      correctAnswers: 0,
      wrongAnswers: 0,
      source: "osce" as const,
      category: "terjadwal" as const,
    })),
  ];

  return items.sort(
    (left, right) =>
      new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime(),
  );
}
```

- [ ] **Step 4: Verify typecheck and commit**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

```bash
git add src/lib/api/tryout-api.ts src/lib/api/review-api.ts src/lib/api/review-api.test.ts
git commit -m "feat(review): enrich attempt history with block metadata and category mapping"
```

---

### Task 2: Implement Leaderboard-Style Filter Bar and Uniform Cards in `review-page.tsx`

**Files:**
- Modify: `src/pages/app/review-page.tsx`
- Modify: `src/pages/app/review-page.test.tsx`

**Interfaces:**
- Consumes: `ReviewFilterCategory`, `REVIEW_CATEGORY_OPTIONS` from `src/lib/api/review-api.ts` or component constants.
- State: `activeCategory` with initial value `"all_blok"`.
- Card styling: Uniform `border-border/80 bg-card hover:border-primary/40` matching Leaderboard layout.

- [ ] **Step 1: Update component tests in `src/pages/app/review-page.test.tsx`**

Add tests for:
1. Rendering the 5 filter buttons: "Try Out All Blok", "Try Out Blok CS", "Try Out Blok PS", "Try Out Blok SBA", "Try Out Terjadwal".
2. Default filter showing "Try Out All Blok".
3. Clicking "Try Out Blok CS" filter switching the visible items to only CS attempts.
4. Clicking "Try Out Terjadwal" filter switching to scheduled attempts.
5. Verifying that the most recent attempt is listed first.
6. Verifying empty state if a category has no attempts.

- [ ] **Step 2: Update `src/pages/app/review-page.tsx`**

1. Define `REVIEW_CATEGORY_OPTIONS`:
```tsx
const REVIEW_CATEGORY_OPTIONS: Array<{
  id: ReviewFilterCategory;
  label: string;
}> = [
  { id: "all_blok", label: "Try Out All Blok" },
  { id: "blok_cs", label: "Try Out Blok CS" },
  { id: "blok_ps", label: "Try Out Blok PS" },
  { id: "blok_sba", label: "Try Out Blok SBA" },
  { id: "terjadwal", label: "Try Out Terjadwal" },
];
```

2. Add state `const [activeCategory, setActiveCategory] = useState<ReviewFilterCategory>("all_blok");`.

3. Filter attempts:
```tsx
const allAttempts = historyQuery.data ?? [];
const filteredAttempts = allAttempts.filter(
  (attempt) => attempt.category === activeCategory,
);
```

4. Render Filter Pill Bar:
```tsx
{/* Category Filter Bar */}
<div className="flex flex-wrap items-center gap-2 pb-2 border-b border-border/20">
  {REVIEW_CATEGORY_OPTIONS.map((option) => {
    const isActive = activeCategory === option.id;
    return (
      <Button
        key={option.id}
        onClick={() => setActiveCategory(option.id)}
        size="sm"
        variant={isActive ? "primary" : "outline"}
        className={`rounded-full px-5 py-2 text-xs font-semibold transition-all ${
          isActive ? "shadow-md shadow-primary/20" : "hover:bg-accent"
        }`}
      >
        {option.label}
      </Button>
    );
  })}
</div>
```

5. Render Cards in uniform Leaderboard-style:
```tsx
{filteredAttempts.length === 0 ? (
  <Alert className="mt-4 border-border/80 bg-card/60">
    <Info className="h-4 w-4 text-primary" />
    <AlertTitle>
      Belum ada hasil untuk {REVIEW_CATEGORY_OPTIONS.find((c) => c.id === activeCategory)?.label}
    </AlertTitle>
    <AlertDescription>Hasil yang sudah selesai akan muncul di sini.</AlertDescription>
  </Alert>
) : (
  <div className="mt-4 grid gap-3.5 w-full">
    {filteredAttempts.map((attempt) => (
      <Card
        key={`${attempt.source}-${attempt.attemptId}`}
        data-testid={`review-card-${attempt.attemptId}`}
        className="overflow-hidden border-border/80 bg-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:border-primary/40"
      >
        <CardContent className="p-5">
          <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border bg-primary/10 text-primary border-primary/20 shrink-0">
                <BookOpenCheck className="h-7 w-7" />
              </div>
              <div>
                <p className="text-lg font-extrabold tracking-tight text-foreground">
                  {attempt.title}
                </p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  {formatSubmittedAttemptLabel(attempt.submittedAt)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
              <Badge
                variant="outline"
                className="font-mono text-xs font-bold px-3 py-1 bg-primary/5 text-primary border-primary/20"
              >
                <Award className="h-3.5 w-3.5 mr-1 inline-block" />
                Skor {Math.round(attempt.score)}
              </Badge>
              <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full border border-border/80 bg-muted/40">
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-mono">
                  <CheckCircle className="h-3.5 w-3.5" />
                  {attempt.correctAnswers}
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-destructive flex items-center gap-1 font-mono">
                  <XCircle className="h-3.5 w-3.5" />
                  {attempt.wrongAnswers}
                </span>
              </div>
              <Link
                aria-label={`Buka pembahasan ${attempt.title}`}
                {...getButtonStyleProps({
                  variant: "outline",
                  className: "font-semibold hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all",
                })}
                to={
                  attempt.source === "scheduled"
                    ? `/app/review/${attempt.attemptId}?source=scheduled`
                    : attempt.source === "osce"
                    ? `/app/review/${attempt.attemptId}?source=osce`
                    : `/app/review/${attempt.attemptId}`
                }
              >
                Buka pembahasan <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
)}
```

- [ ] **Step 3: Verify TypeScript and commit**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

```bash
git add src/pages/app/review-page.tsx src/pages/app/review-page.test.tsx
git commit -m "feat(review): implement leaderboard filter tabs and uniform card layout"
```

---

### Task 3: Full Verification & Build Check

**Files:**
- All touched files

- [ ] **Step 1: Run type checking across the entire project**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 2: Run production build check**

Run: `npm run build`
Expected: Build succeeds, generating production bundles in `dist/`.

- [ ] **Step 3: Final review and clean commit**
Ensure working tree is clean.
