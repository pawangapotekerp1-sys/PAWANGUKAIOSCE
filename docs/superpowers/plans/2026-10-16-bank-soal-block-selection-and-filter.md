# Bank Soal Block Selection & Topic Filter Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan halaman seleksi 3 blok (Clinical Science, Pharmaceutical Science, Social Behavioural Administration of Pharmacy) dengan tombol "Tambah Soal", menyaring daftar soal khusus blok yang dipilih saat salah satu kartu diklik, dan memperbaiki filter materi di dalam blok sehingga bekerja ketat tanpa meloloskan soal yang tidak sesuai kriteria.

**Architecture:** Menggunakan URL Query Parameter Pattern (`?block=<slug>`) pada komponen `QuestionsPage` yang digunakan bersama oleh rute Admin (`/admin/questions`) dan Mentor (`/app/questions`). Jika parameter `block` tidak ada di URL, tampilkan `QuestionBlockSelection` (3 kartu blok + tombol Tambah Soal). Jika ada, tampilkan `QuestionBlockList` (tombol kembali, judul blok, tombol Tambah Soal, dropdown filter materi yang ketat, dan grid kartu soal).

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide React, Vitest, Testing Library, React Router v7.

## Global Constraints

- Rute dasar tetap `/admin/questions` untuk Admin dan `/app/questions` untuk Mentor.
- Tidak mengubah konfigurasi inti di `app-router.tsx`.
- 3 blok standar yang didukung:
  1. `clinical-science`: "Clinical Science"
  2. `pharmaceutical-science`: "Pharmaceutical Science"
  3. `social-behavioural-administration`: mencakup "Social Behavioural Administration of Pharmacy", "Social, Behavioral & Administrative Pharmacy", dan "Social Behavioural Administrative Pharmacy".
- Tombol "Tambah Soal" wajib muncul di halaman pilihan 3 blok.
- Filter blok di dalam daftar soal ditiadakan; hanya ada filter Materi.
- Filter materi harus ketat: ketika materi dipilih, soal dengan materi lain maupun soal tanpa materi dilarang keras muncul di daftar (termasuk di bagian bawah).
- Sediakan opsi khusus "Tanpa materi" jika terdapat soal pada blok aktif yang belum dikaitkan dengan materi (`!topicName || !topicId`).

---

### Task 1: Taxonomy & Block Constants/Helpers

**Files:**
- Create: `src/pages/admin/questions-page-helpers.ts`
- Test: `src/pages/admin/questions-page-helpers.test.ts`

**Interfaces:**
- Produces:
  - `BANK_SOAL_BLOCKS`: Array of 3 block metadata objects (`slug`, `name`, `matchNames`, `description`, `iconName`, `colorTheme`).
  - `findBankSoalBlock(slugOrName?: string | null): BankSoalBlock | undefined`
  - `isQuestionInBlock(question: { blockName?: string | null }, block: BankSoalBlock): boolean`
  - `filterBlockQuestions(questions: QuestionBankItemViewModel[], blockSlug: string): QuestionBankItemViewModel[]`
  - `extractBlockTopics(questions: QuestionBankItemViewModel[]): { topics: string[]; hasUnassigned: boolean }`
  - `filterQuestionsByTopic(questions: QuestionBankItemViewModel[], topicFilter: string): QuestionBankItemViewModel[]`

- [ ] **Step 1: Write the failing test**

Create `src/pages/admin/questions-page-helpers.test.ts`:
```typescript
import { describe, expect, test } from "vitest";
import {
  BANK_SOAL_BLOCKS,
  extractBlockTopics,
  filterBlockQuestions,
  filterQuestionsByTopic,
  findBankSoalBlock,
  isQuestionInBlock,
} from "./questions-page-helpers";
import type { QuestionBankItemViewModel } from "../../lib/mappers/question-authoring-mappers";

describe("questions-page-helpers", () => {
  const mockQuestions: QuestionBankItemViewModel[] = [
    {
      id: "q-1",
      stem: "Soal Hipertensi",
      status: "published",
      statusLabel: "Published",
      blockId: "b-1",
      blockName: "Clinical Science",
      topicId: "t-1",
      topicName: "Kardiologi",
      hasQuestionImage: false,
      hasExplanationText: true,
      hasExplanationImage: false,
      updatedAt: "2026-05-01",
    },
    {
      id: "q-2",
      stem: "Soal DM",
      status: "draft",
      statusLabel: "Draft",
      blockId: "b-1",
      blockName: "Clinical Science",
      topicId: "t-2",
      topicName: "Endokrin",
      hasQuestionImage: false,
      hasExplanationText: false,
      hasExplanationImage: false,
      updatedAt: "2026-05-02",
    },
    {
      id: "q-3",
      stem: "Soal Klinis Tanpa Materi",
      status: "draft",
      statusLabel: "Draft",
      blockId: "b-1",
      blockName: "Clinical Science",
      topicId: null,
      topicName: null,
      hasQuestionImage: false,
      hasExplanationText: false,
      hasExplanationImage: false,
      updatedAt: "2026-05-03",
    },
    {
      id: "q-4",
      stem: "Soal Steril",
      status: "published",
      statusLabel: "Published",
      blockId: "b-2",
      blockName: "Pharmaceutical Science",
      topicId: "t-3",
      topicName: "Sediaan Steril",
      hasQuestionImage: false,
      hasExplanationText: true,
      hasExplanationImage: false,
      updatedAt: "2026-05-04",
    },
    {
      id: "q-5",
      stem: "Soal Manajemen Farmasi",
      status: "published",
      statusLabel: "Published",
      blockId: "b-3",
      blockName: "Social, Behavioral & Administrative Pharmacy",
      topicId: "t-4",
      topicName: "Manajemen Farmasi",
      hasQuestionImage: false,
      hasExplanationText: true,
      hasExplanationImage: false,
      updatedAt: "2026-05-05",
    },
  ];

  test("defines 3 standard bank soal blocks", () => {
    expect(BANK_SOAL_BLOCKS).toHaveLength(3);
    expect(BANK_SOAL_BLOCKS.map((b) => b.slug)).toEqual([
      "clinical-science",
      "pharmaceutical-science",
      "social-behavioural-administration",
    ]);
  });

  test("findBankSoalBlock finds block by slug or variation names", () => {
    expect(findBankSoalBlock("clinical-science")?.name).toBe("Clinical Science");
    expect(findBankSoalBlock("pharmaceutical-science")?.name).toBe("Pharmaceutical Science");
    expect(findBankSoalBlock("social-behavioural-administration")?.name).toBe("Social Behavioural Administration of Pharmacy");
    expect(findBankSoalBlock("Social, Behavioral & Administrative Pharmacy")?.slug).toBe("social-behavioural-administration");
    expect(findBankSoalBlock("unknown")).toBeUndefined();
  });

  test("isQuestionInBlock matches questions correctly", () => {
    const csBlock = findBankSoalBlock("clinical-science")!;
    expect(isQuestionInBlock({ blockName: "Clinical Science" }, csBlock)).toBe(true);
    expect(isQuestionInBlock({ blockName: "Pharmaceutical Science" }, csBlock)).toBe(false);

    const sbaBlock = findBankSoalBlock("social-behavioural-administration")!;
    expect(isQuestionInBlock({ blockName: "Social, Behavioral & Administrative Pharmacy" }, sbaBlock)).toBe(true);
    expect(isQuestionInBlock({ blockName: "Social Behavioural Administration of Pharmacy" }, sbaBlock)).toBe(true);
  });

  test("filterBlockQuestions isolates questions strictly by block", () => {
    const csQuestions = filterBlockQuestions(mockQuestions, "clinical-science");
    expect(csQuestions).toHaveLength(3);
    expect(csQuestions.every((q) => q.blockName === "Clinical Science")).toBe(true);

    const psQuestions = filterBlockQuestions(mockQuestions, "pharmaceutical-science");
    expect(psQuestions).toHaveLength(1);
    expect(psQuestions[0].id).toBe("q-4");
  });

  test("extractBlockTopics extracts unique sorted topics and detects unassigned", () => {
    const csQuestions = filterBlockQuestions(mockQuestions, "clinical-science");
    const { topics, hasUnassigned } = extractBlockTopics(csQuestions);

    expect(topics).toEqual(["Endokrin", "Kardiologi"]);
    expect(hasUnassigned).toBe(true);
  });

  test("filterQuestionsByTopic filters strictly by topic name or unassigned", () => {
    const csQuestions = filterBlockQuestions(mockQuestions, "clinical-science");

    const allFiltered = filterQuestionsByTopic(csQuestions, "all");
    expect(allFiltered).toHaveLength(3);

    const cardioFiltered = filterQuestionsByTopic(csQuestions, "Kardiologi");
    expect(cardioFiltered).toHaveLength(1);
    expect(cardioFiltered[0].id).toBe("q-1");

    const unassignedFiltered = filterQuestionsByTopic(csQuestions, "unassigned");
    expect(unassignedFiltered).toHaveLength(1);
    expect(unassignedFiltered[0].id).toBe("q-3");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/admin/questions-page-helpers.test.ts`
Expected: FAIL with "Cannot find module './questions-page-helpers'"

- [ ] **Step 3: Write minimal implementation**

Create `src/pages/admin/questions-page-helpers.ts`:
```typescript
import type { QuestionBankItemViewModel } from "../../lib/mappers/question-authoring-mappers";

export type BankSoalBlock = {
  slug: string;
  name: string;
  matchNames: string[];
  description: string;
  iconName: "HeartPulse" | "FlaskConical" | "Users";
  colorTheme: "teal" | "indigo" | "amber";
};

export const BANK_SOAL_BLOCKS: BankSoalBlock[] = [
  {
    slug: "clinical-science",
    name: "Clinical Science",
    matchNames: ["Clinical Science", "clinical science", "Klinis"],
    description: "Farmakoterapi, evaluasi kasus klinis, interaksi obat, dan interpretasi data laboratorium klinis.",
    iconName: "HeartPulse",
    colorTheme: "teal",
  },
  {
    slug: "pharmaceutical-science",
    name: "Pharmaceutical Science",
    matchNames: ["Pharmaceutical Science", "pharmaceutical science", "Farmasetika"],
    description: "Teknologi formulasi sediaan padat, cair, dan steril, biofarmasetika, stabilitas, serta kimia farmasi.",
    iconName: "FlaskConical",
    colorTheme: "indigo",
  },
  {
    slug: "social-behavioural-administration",
    name: "Social Behavioural Administration of Pharmacy",
    matchNames: [
      "Social Behavioural Administration of Pharmacy",
      "Social, Behavioral & Administrative Pharmacy",
      "Social Behavioural Administrative Pharmacy",
      "social behavioural administration of pharmacy",
      "SBA",
    ],
    description: "Regulasi & perundang-undangan farmasi, manajemen apotek/RS, farmakoekonomi, etika, dan komunikasi profesi.",
    iconName: "Users",
    colorTheme: "amber",
  },
];

export function normalizeName(name?: string | null): string {
  return (name ?? "").trim().toLowerCase();
}

export function findBankSoalBlock(slugOrName?: string | null): BankSoalBlock | undefined {
  if (!slugOrName) return undefined;
  const target = normalizeName(slugOrName);

  return BANK_SOAL_BLOCKS.find((block) => {
    if (block.slug === target) return true;
    if (normalizeName(block.name) === target) return true;
    return block.matchNames.some((m) => normalizeName(m) === target);
  });
}

export function isQuestionInBlock(
  question: { blockName?: string | null },
  block: BankSoalBlock,
): boolean {
  if (!question.blockName) return false;
  const qName = normalizeName(question.blockName);
  return (
    qName === normalizeName(block.name) ||
    block.matchNames.some((m) => normalizeName(m) === qName)
  );
}

export function filterBlockQuestions(
  questions: QuestionBankItemViewModel[],
  blockSlug: string,
): QuestionBankItemViewModel[] {
  const block = findBankSoalBlock(blockSlug);
  if (!block) return [];

  return questions.filter((q) => isQuestionInBlock(q, block));
}

export function extractBlockTopics(
  questions: QuestionBankItemViewModel[],
): { topics: string[]; hasUnassigned: boolean } {
  const topicsSet = new Set<string>();
  let hasUnassigned = false;

  for (const q of questions) {
    const trimmed = q.topicName?.trim();
    if (trimmed) {
      topicsSet.add(trimmed);
    } else {
      hasUnassigned = true;
    }
  }

  const topics = Array.from(topicsSet).sort((a, b) => a.localeCompare(b, "id-ID"));
  return { topics, hasUnassigned };
}

export function filterQuestionsByTopic(
  questions: QuestionBankItemViewModel[],
  topicFilter: string,
): QuestionBankItemViewModel[] {
  if (topicFilter === "all") {
    return questions;
  }

  if (topicFilter === "unassigned") {
    return questions.filter((q) => !q.topicName || !q.topicName.trim());
  }

  const target = normalizeName(topicFilter);
  return questions.filter((q) => normalizeName(q.topicName) === target);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/admin/questions-page-helpers.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/questions-page-helpers.ts src/pages/admin/questions-page-helpers.test.ts
git commit -m "feat: add taxonomy block helpers and strict topic filter logic"
```

---

### Task 2: Block Selection UI Component (`QuestionBlockSelection`)

**Files:**
- Create: `src/pages/admin/components/question-block-selection.tsx`
- Test: `src/pages/admin/components/question-block-selection.test.tsx`

**Interfaces:**
- Consumes: `BANK_SOAL_BLOCKS`, `BankSoalBlock` from `src/pages/admin/questions-page-helpers.ts`
- Produces: `QuestionBlockSelection` component with props:
  ```typescript
  type QuestionBlockSelectionProps = {
    blocks: BankSoalBlock[];
    questionCounts: Record<string, number>;
    basePath: string;
    onSelectBlock: (slug: string) => void;
  };
  ```

- [ ] **Step 1: Write the failing test**

Create `src/pages/admin/components/question-block-selection.test.tsx`:
```typescript
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, test, vi } from "vitest";
import { BANK_SOAL_BLOCKS } from "../questions-page-helpers";
import QuestionBlockSelection from "./question-block-selection";

describe("QuestionBlockSelection", () => {
  const onSelectBlock = vi.fn();
  const mockCounts = {
    "clinical-science": 45,
    "pharmaceutical-science": 30,
    "social-behavioural-administration": 20,
  };

  function renderComponent(basePath = "/admin/questions") {
    return render(
      <MemoryRouter>
        <QuestionBlockSelection
          basePath={basePath}
          blocks={BANK_SOAL_BLOCKS}
          onSelectBlock={onSelectBlock}
          questionCounts={mockCounts}
        />
      </MemoryRouter>
    );
  }

  test("renders heading, description, and Tambah Soal button", () => {
    renderComponent();

    expect(screen.getByRole("heading", { name: /bank soal/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/pilih blok bidang farmasi/i)).toBeInTheDocument();

    const tambahSoalLink = screen.getByRole("link", { name: /tambah soal/i });
    expect(tambahSoalLink).toHaveAttribute("href", "/admin/questions/new");
    expect(tambahSoalLink).toHaveAttribute("data-variant", "primary");
  });

  test("renders 3 block cards with titles, descriptions, and question counts", () => {
    renderComponent();

    expect(screen.getByText("Clinical Science")).toBeInTheDocument();
    expect(screen.getByText("45 Soal Tersedia")).toBeInTheDocument();

    expect(screen.getByText("Pharmaceutical Science")).toBeInTheDocument();
    expect(screen.getByText("30 Soal Tersedia")).toBeInTheDocument();

    expect(screen.getByText("Social Behavioural Administration of Pharmacy")).toBeInTheDocument();
    expect(screen.getByText("20 Soal Tersedia")).toBeInTheDocument();
  });

  test("triggers onSelectBlock when clicking a block card or button", () => {
    renderComponent();

    const csButton = screen.getAllByRole("button", { name: /buka bank soal/i })[0];
    fireEvent.click(csButton);

    expect(onSelectBlock).toHaveBeenCalledWith("clinical-science");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/admin/components/question-block-selection.test.tsx`
Expected: FAIL with "Cannot find module './question-block-selection'"

- [ ] **Step 3: Write minimal implementation**

Create `src/pages/admin/components/question-block-selection.tsx`:
```typescript
import { Link } from "react-router";
import { ArrowRight, FlaskConical, HeartPulse, Plus, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import Button, { getButtonStyleProps } from "../../../components/ui/button";
import type { BankSoalBlock } from "../questions-page-helpers";

type QuestionBlockSelectionProps = {
  blocks: BankSoalBlock[];
  questionCounts: Record<string, number>;
  basePath: string;
  onSelectBlock: (slug: string) => void;
};

const blockVisuals: Record<
  BankSoalBlock["colorTheme"],
  {
    iconBg: string;
    hoverBorder: string;
  }
> = {
  teal: {
    iconBg: "bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400",
    hoverBorder: "hover:border-teal-500/40 hover:shadow-teal-500/10",
  },
  indigo: {
    iconBg: "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400",
    hoverBorder: "hover:border-indigo-500/40 hover:shadow-indigo-500/10",
  },
  amber: {
    iconBg: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
    hoverBorder: "hover:border-amber-500/40 hover:shadow-amber-500/10",
  },
};

export default function QuestionBlockSelection({
  blocks,
  questionCounts,
  basePath,
  onSelectBlock,
}: QuestionBlockSelectionProps) {
  function renderIcon(iconName: BankSoalBlock["iconName"]) {
    switch (iconName) {
      case "HeartPulse":
        return <HeartPulse className="h-7 w-7" />;
      case "FlaskConical":
        return <FlaskConical className="h-7 w-7" />;
      case "Users":
        return <Users className="h-7 w-7" />;
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full py-4">
      {/* Header Banner Control */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-6 shadow-xs lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            Bank Soal
          </h1>
          <p className="mt-2 text-base text-muted-foreground leading-relaxed">
            Pilih blok bidang farmasi untuk melihat, mengelola, menyunting, dan menyaring bank soal.
          </p>
        </div>
        <Link
          {...getButtonStyleProps({
            className: "gap-2 sm:min-w-[11rem] h-11 px-5 text-sm font-bold shadow-md shadow-primary/20",
            size: "sm",
            variant: "primary",
          })}
          to={`${basePath}/new`}
        >
          <Plus className="h-4 w-4" />
          Tambah soal
        </Link>
      </div>

      {/* 3 Block Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 w-full">
        {blocks.map((block) => {
          const visuals = blockVisuals[block.colorTheme];
          const count = questionCounts[block.slug] ?? 0;

          return (
            <Card
              key={block.slug}
              className={`group relative flex flex-col justify-between overflow-hidden border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${visuals.hoverBorder} cursor-pointer`}
              onClick={() => onSelectBlock(block.slug)}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${visuals.iconBg} transition-transform group-hover:scale-105`}>
                    {renderIcon(block.iconName)}
                  </div>
                  <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-1">
                    {count} Soal Tersedia
                  </Badge>
                </div>

                <div>
                  <CardTitle className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                    {block.name}
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    {block.description}
                  </CardDescription>
                </div>
              </div>

              <div className="pt-6 mt-4 border-t border-border/40">
                <Button
                  className="w-full justify-between font-bold"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectBlock(block.slug);
                  }}
                  variant="outline"
                >
                  <span>Buka Bank Soal</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/admin/components/question-block-selection.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/components/question-block-selection.tsx src/pages/admin/components/question-block-selection.test.tsx
git commit -m "feat: add QuestionBlockSelection component with 3 block cards and Tambah Soal CTA"
```

---

### Task 3: Block Question List UI with Strict Topic Filtering (`QuestionBlockListView`)

**Files:**
- Create: `src/pages/admin/components/question-block-list.tsx`
- Test: `src/pages/admin/components/question-block-list.test.tsx`

**Interfaces:**
- Consumes:
  - `BankSoalBlock`, `extractBlockTopics`, `filterQuestionsByTopic` from `src/pages/admin/questions-page-helpers.ts`
  - `QuestionBankItemViewModel` from `src/lib/mappers/question-authoring-mappers.ts`
- Produces: `QuestionBlockList` component with props:
  ```typescript
  type QuestionBlockListProps = {
    activeBlock: BankSoalBlock;
    questions: QuestionBankItemViewModel[];
    basePath: string;
    onBack: () => void;
    onDeleteQuestion: (id: string) => void;
    onBulkDelete: (ids: string[]) => void;
    isDeleting: boolean;
  };
  ```

- [ ] **Step 1: Write the failing test**

Create `src/pages/admin/components/question-block-list.test.tsx`:
```typescript
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, test, vi } from "vitest";
import { BANK_SOAL_BLOCKS } from "../questions-page-helpers";
import QuestionBlockList from "./question-block-list";
import type { QuestionBankItemViewModel } from "../../../lib/mappers/question-authoring-mappers";

describe("QuestionBlockList", () => {
  const activeBlock = BANK_SOAL_BLOCKS[0]; // Clinical Science
  const onBack = vi.fn();
  const onDeleteQuestion = vi.fn();
  const onBulkDelete = vi.fn();

  const mockQuestions: QuestionBankItemViewModel[] = [
    {
      id: "q-1",
      stem: "Soal Hipertensi CKD",
      status: "published",
      statusLabel: "Published",
      blockId: "b-1",
      blockName: "Clinical Science",
      topicId: "t-1",
      topicName: "Kardiologi",
      hasQuestionImage: false,
      hasExplanationText: true,
      hasExplanationImage: false,
      updatedAt: "2026-05-01",
    },
    {
      id: "q-2",
      stem: "Soal DM Tipe 2",
      status: "draft",
      statusLabel: "Draft",
      blockId: "b-1",
      blockName: "Clinical Science",
      topicId: "t-2",
      topicName: "Endokrin",
      hasQuestionImage: false,
      hasExplanationText: false,
      hasExplanationImage: false,
      updatedAt: "2026-05-02",
    },
    {
      id: "q-3",
      stem: "Soal Klinis Tanpa Topik",
      status: "draft",
      statusLabel: "Draft",
      blockId: "b-1",
      blockName: "Clinical Science",
      topicId: null,
      topicName: null,
      hasQuestionImage: false,
      hasExplanationText: false,
      hasExplanationImage: false,
      updatedAt: "2026-05-03",
    },
  ];

  function renderComponent() {
    return render(
      <MemoryRouter>
        <QuestionBlockList
          activeBlock={activeBlock}
          basePath="/admin/questions"
          isDeleting={false}
          onBack={onBack}
          onBulkDelete={onBulkDelete}
          onDeleteQuestion={onDeleteQuestion}
          questions={mockQuestions}
        />
      </MemoryRouter>
    );
  }

  test("renders back button, active block title, and Tambah Soal CTA", () => {
    renderComponent();

    const backButton = screen.getByRole("button", { name: /kembali ke pilihan blok/i });
    expect(backButton).toBeInTheDocument();
    fireEvent.click(backButton);
    expect(onBack).toHaveBeenCalled();

    expect(screen.getByRole("heading", { name: /bank soal: clinical science/i })).toBeInTheDocument();

    const tambahSoalLink = screen.getByRole("link", { name: /tambah soal/i });
    expect(tambahSoalLink).toHaveAttribute("href", "/admin/questions/new?block=clinical-science");
  });

  test("does not show Blok filter dropdown, only Materi dropdown", () => {
    renderComponent();

    expect(screen.queryByLabelText(/blok/i)).not.toBeInTheDocument();
    const topicSelect = screen.getByLabelText(/materi/i);
    expect(topicSelect).toBeInTheDocument();

    expect(screen.getByRole("option", { name: /semua materi/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /tanpa materi/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Kardiologi" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Endokrin" })).toBeInTheDocument();
  });

  test("filters strictly by topic: hides other questions completely", () => {
    renderComponent();

    expect(screen.getByText(/soal hipertensi ckd/i)).toBeInTheDocument();
    expect(screen.getByText(/soal dm tipe 2/i)).toBeInTheDocument();
    expect(screen.getByText(/soal klinis tanpa topik/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/materi/i), {
      target: { value: "Kardiologi" },
    });

    expect(screen.getByText(/soal hipertensi ckd/i)).toBeInTheDocument();
    expect(screen.queryByText(/soal dm tipe 2/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/soal klinis tanpa topik/i)).not.toBeInTheDocument();
  });

  test("filters by 'unassigned' (Tanpa Materi) strictly", () => {
    renderComponent();

    fireEvent.change(screen.getByLabelText(/materi/i), {
      target: { value: "unassigned" },
    });

    expect(screen.getByText(/soal klinis tanpa topik/i)).toBeInTheDocument();
    expect(screen.queryByText(/soal hipertensi ckd/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/soal dm tipe 2/i)).not.toBeInTheDocument();
  });

  test("handles question selection and bulk delete", () => {
    renderComponent();

    const checkbox = screen.getByLabelText(/pilih soal soal hipertensi ckd/i);
    fireEvent.click(checkbox);

    const bulkDeleteBtn = screen.getByRole("button", { name: /hapus terpilih/i });
    expect(bulkDeleteBtn).not.toBeDisabled();
    fireEvent.click(bulkDeleteBtn);

    expect(onBulkDelete).toHaveBeenCalledWith(["q-1"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/admin/components/question-block-list.test.tsx`
Expected: FAIL with "Cannot find module './question-block-list'"

- [ ] **Step 3: Write minimal implementation**

Create `src/pages/admin/components/question-block-list.tsx`:
```typescript
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  ArrowLeft,
  CheckSquare,
  FileText,
  Filter,
  Image as ImageIcon,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Card } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "../../../components/ui/alert";
import Button, { getButtonStyleProps } from "../../../components/ui/button";
import type { BankSoalBlock } from "../questions-page-helpers";
import { extractBlockTopics, filterQuestionsByTopic } from "../questions-page-helpers";
import type { QuestionBankItemViewModel } from "../../../lib/mappers/question-authoring-mappers";

type QuestionBlockListProps = {
  activeBlock: BankSoalBlock;
  questions: QuestionBankItemViewModel[];
  basePath: string;
  onBack: () => void;
  onDeleteQuestion: (id: string) => void;
  onBulkDelete: (ids: string[]) => void;
  isDeleting: boolean;
};

export default function QuestionBlockList({
  activeBlock,
  questions,
  basePath,
  onBack,
  onDeleteQuestion,
  onBulkDelete,
  isDeleting,
}: QuestionBlockListProps) {
  const [topicFilter, setTopicFilter] = useState("all");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

  const { topics, hasUnassigned } = useMemo(() => {
    return extractBlockTopics(questions);
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    return filterQuestionsByTopic(questions, topicFilter);
  }, [questions, topicFilter]);

  useEffect(() => {
    const visibleIds = new Set(filteredQuestions.map((q) => q.id));
    setSelectedQuestionIds((prev) => prev.filter((id) => visibleIds.has(id)));
  }, [filteredQuestions]);

  function handleQuestionSelectionChange(questionId: string, checked: boolean) {
    setSelectedQuestionIds((current) => {
      if (checked) {
        return current.includes(questionId) ? current : [...current, questionId];
      }
      return current.filter((id) => id !== questionId);
    });
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation & Action Banner */}
      <div className="flex flex-col gap-4">
        <div>
          <Button
            className="gap-2 text-xs font-semibold px-3 h-8 text-muted-foreground hover:text-foreground"
            onClick={onBack}
            size="sm"
            variant="outline"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Pilihan Blok
          </Button>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-6 shadow-xs lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                Bank Soal: {activeBlock.name}
              </h1>
              <Badge variant="secondary" className="text-xs font-semibold">
                {filteredQuestions.length} Soal
              </Badge>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              Cari, pilih, lalu rapikan soal blok {activeBlock.name} dari satu tempat.
            </p>
          </div>
          <Link
            {...getButtonStyleProps({
              className: "gap-2 sm:min-w-[11rem] h-10 px-5 text-sm font-bold shadow-md shadow-primary/20",
              size: "sm",
              variant: "primary",
            })}
            to={`${basePath}/new?block=${activeBlock.slug}`}
          >
            <Plus className="h-4 w-4" />
            Tambah soal
          </Link>
        </div>
      </div>

      {/* Main Card Container */}
      <Card className="space-y-6 p-6 border-border/80 bg-card shadow-xs">
        {/* Filter Bar (Only Topic Filter) */}
        <div className="flex flex-col gap-4 rounded-xl border border-border/80 bg-muted/30 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <h3 className="text-base font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              Filter Materi
            </h3>
            <p className="mt-1 text-xs text-muted-foreground leading-normal">
              Saring berdasarkan materi di blok {activeBlock.name}, lalu lanjutkan ke edit atau hapus.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="text-xs font-bold text-foreground grid gap-1.5">
              Materi
              <select
                aria-label="Materi"
                className="h-10 rounded-xl border border-border/80 bg-background px-3 text-xs font-semibold text-foreground transition-all focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer min-w-56"
                onChange={(event) => setTopicFilter(event.target.value)}
                value={topicFilter}
              >
                <option value="all">Semua materi</option>
                {hasUnassigned ? <option value="unassigned">Tanpa materi</option> : null}
                {topics.map((topicName) => (
                  <option key={topicName} value={topicName}>
                    {topicName}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Selection Status Banner */}
        <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs font-medium text-foreground flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-primary" />
            {selectedQuestionIds.length
              ? `${selectedQuestionIds.length} soal dipilih dan siap dirapikan.`
              : "Pilih soal untuk dihapus bila memang sudah tidak dipakai."}
          </span>
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={selectedQuestionIds.length === 0 || isDeleting}
              onClick={() => onBulkDelete(selectedQuestionIds)}
              size="sm"
              variant="destructive"
              className="h-9 text-xs font-bold px-4"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Hapus terpilih
            </Button>
          </div>
        </div>

        {/* Question Cards Grid */}
        {filteredQuestions.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredQuestions.map((question) => (
              <Card
                key={question.id}
                className="p-5 border-border/80 bg-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <label className="inline-flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer">
                        <input
                          aria-label={`Pilih soal ${question.stem}`}
                          checked={selectedQuestionIds.includes(question.id)}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                          onChange={(event) => handleQuestionSelectionChange(question.id, event.target.checked)}
                          type="checkbox"
                        />
                        <span>Pilih soal</span>
                      </label>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant={question.status === "published" ? "outline" : "secondary"}
                          className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 ${
                            question.status === "published"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                          }`}
                        >
                          {question.statusLabel}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-semibold px-2 py-0.5 ${
                            !question.topicName
                              ? "text-destructive/80 border-destructive/20 bg-destructive/10"
                              : "text-muted-foreground"
                          }`}
                        >
                          {question.topicName || "Tidak memiliki materi"}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col">
                      <Link
                        {...getButtonStyleProps({
                          size: "sm",
                          variant: "outline",
                          className: "h-8 text-xs font-semibold px-3",
                        })}
                        to={`${basePath}/${question.id}/edit`}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit soal
                      </Link>
                      <Button
                        disabled={isDeleting}
                        onClick={() => onDeleteQuestion(question.id)}
                        size="sm"
                        variant="destructive"
                        className="h-8 text-xs font-semibold px-3"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Hapus soal
                      </Button>
                    </div>
                  </div>

                  <h4 className="text-sm font-semibold leading-relaxed text-foreground line-clamp-3">
                    {question.stem}
                  </h4>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-3 mt-3 border-t border-border/40">
                  {question.hasQuestionImage ? (
                    <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground bg-muted/30">
                      <ImageIcon className="h-3 w-3 mr-1 text-primary" />
                      Gambar soal
                    </Badge>
                  ) : null}
                  {question.hasExplanationText ? (
                    <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground bg-muted/30">
                      <FileText className="h-3 w-3 mr-1 text-emerald-500" />
                      Pembahasan
                    </Badge>
                  ) : null}
                  {question.hasExplanationImage ? (
                    <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground bg-muted/30">
                      <ImageIcon className="h-3 w-3 mr-1 text-amber-500" />
                      Gambar pembahasan
                    </Badge>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Alert className="border-border/80 bg-card/60">
            <AlertTitle>Soal tidak ditemukan</AlertTitle>
            <AlertDescription>Tidak ada soal yang cocok dengan filter materi ini.</AlertDescription>
          </Alert>
        )}
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/admin/components/question-block-list.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/components/question-block-list.tsx src/pages/admin/components/question-block-list.test.tsx
git commit -m "feat: add QuestionBlockList component with strict topic filtering and unassigned support"
```

---

### Task 4: Integrate Block Selection & Question List in `QuestionsPage` & Update Tests

**Files:**
- Modify: `src/pages/admin/questions-page.tsx`
- Modify: `src/pages/admin/questions-page.test.tsx`

**Interfaces:**
- Reads `useSearchParams` (`block` param).
- Uses `BANK_SOAL_BLOCKS`, `findBankSoalBlock`, `filterBlockQuestions` to calculate block statistics and isolate active block.
- If `!activeBlock`: renders `QuestionBlockSelection`.
- If `activeBlock`: renders `QuestionBlockList`.
- Wrap both in appropriate Shell (`AdminShell` or `ProductShell` for mentor).
- Ensure consistent `h1` rendering so existing test assertions pass.

- [ ] **Step 1: Write the updated test cases in `questions-page.test.tsx`**

Update `src/pages/admin/questions-page.test.tsx` to:
1. Verify initial view renders `QuestionBlockSelection` (3 cards + Tambah Soal link) on both `/admin/questions` and `/app/questions`.
2. Verify clicking a card selects the block and enters block question list.
3. Verify direct navigation with `?block=clinical-science` enters block question list directly.
4. Verify clicking "Kembali ke Pilihan Blok" returns to 3 cards.
5. Verify topic filter within a block filters out other questions strictly.
6. Verify single and bulk delete still function properly.

- [ ] **Step 2: Run test to verify failure on current implementation**

Run: `npx vitest run src/pages/admin/questions-page.test.tsx`
Expected: FAIL on the new block selection assertions.

- [ ] **Step 3: Update `src/pages/admin/questions-page.tsx` implementation**

Replace contents of `src/pages/admin/questions-page.tsx` with clean integration of `QuestionBlockSelection` and `QuestionBlockList`.

- [ ] **Step 4: Run full test suite for questions page**

Run: `npx vitest run src/pages/admin/questions-page.test.tsx`
Expected: PASS (8/8 tests pass)

- [ ] **Step 5: Run router tests to ensure no regressions**

Run: `npx vitest run src/router/app-router.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin/questions-page.tsx src/pages/admin/questions-page.test.tsx
git commit -m "feat: integrate 3-block selection page and strict topic filter into QuestionsPage"
```

---

### Task 5: Final Review & Verification

**Files:**
- Review all touched files: `git diff master`

- [ ] **Step 1: Run type check & build**

Run: `npm run build`
Expected: PASS with 0 type errors.

- [ ] **Step 2: Run all relevant test suites**

Run: `npm test -- src/pages/admin/questions-page.test.tsx src/router/app-router.test.tsx`
Expected: PASS

- [ ] **Step 3: Commit any final cleanup**

```bash
git commit --allow-empty -m "chore: verify bank soal block selection and topic filter implementation"
```
