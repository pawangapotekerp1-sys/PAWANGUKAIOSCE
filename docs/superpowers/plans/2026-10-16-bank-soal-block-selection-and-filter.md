# Bank Soal Block Selection & Topic Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan halaman seleksi 3 blok (Clinical Science, Pharmaceutical Science, Social Behavioural Administration of Pharmacy) sebelum masuk ke daftar soal Bank Soal, menampilkan fitur "Tambah Soal" di halaman seleksi 3 blok, mengisolasi daftar soal per blok, dan memperbaiki filter agar hanya ada filter materi yang menyaring soal secara ketat tanpa meloloskan soal yang tidak sesuai ke bagian bawah.

**Architecture:** Menggunakan pola URL query parameter (`?block=<block-slug>`) pada rute eksisting `/admin/questions` dan `/app/questions`. Saat parameter `block` tidak ada, halaman menampilkan `QuestionBlockSelectionView` (3 kartu blok dan tombol "Tambah Soal"). Saat parameter `block` ada, halaman menampilkan `QuestionBlockListView` (tombol kembali, filter materi saja, dan daftar soal blok). Logika isolasi dan penyaringan diekstraksi ke modul utilitas tersendiri (`questions-page-blocks.ts`) untuk mempermudah pengujian unit secara mandiri.

**Tech Stack:** React 19, TypeScript, React Router 7, TanStack Query 5, Tailwind CSS, Lucide React, Vitest, React Testing Library.

## Global Constraints

- **Scope:** Berlaku untuk panel Admin (`/admin/questions`) dan Mentor (`/app/questions`).
- **Standard Blocks (3 Blok):**
  1. `clinical-science`: "Clinical Science"
  2. `pharmaceutical-science`: "Pharmaceutical Science"
  3. `social-behavioural-administration`: "Social Behavioural Administration of Pharmacy" (mendukung alias: "Social, Behavioral & Administrative Pharmacy", "Social Behavioural Administrative Pharmacy").
- **UI Elements on 3-Block Selection:**
  - `h1` "Bank Soal"
  - Deskripsi panduan
  - Tombol "Tambah Soal" beraksen primer (mengarah ke `${basePath}/new`)
  - 3 kartu blok dengan ikon tematik, deskripsi, badge jumlah soal, dan tombol navigasi
- **UI Elements on Block Question List:**
  - Tombol "Kembali ke Pilihan Blok" (menghapus parameter `?block`)
  - Judul `Bank Soal: <Nama Blok>` dan badge jumlah soal
  - Tombol "Tambah Soal"
  - Filter bar **hanya materi** (tanpa dropdown blok)
  - Opsi materi: `Semua materi`, `Tanpa materi` (jika ada soal belum bermateri), dan daftar nama materi yang ada di blok aktif
- **Filter Bug Fix:**
  - Perbandingan materi wajib dinormalisasi (`trim()`, case-insensitive).
  - Soal dengan materi lain atau tanpa materi saat materi spesifik dipilih wajib 100% disaring keluar dari array yang dirender.

---

### Task 1: Block Definitions & Filtering Helper Module

**Files:**
- Create: `src/pages/admin/questions-page-blocks.ts`
- Test: `src/pages/admin/questions-page-blocks.test.ts`

**Interfaces:**
- Consumes: `QuestionBankItemViewModel` dari `src/lib/mappers/question-authoring-mappers.ts`
- Produces:
  ```typescript
  export type BlockDefinition = {
    id: string;
    name: string;
    description: string;
    colorTheme: "teal" | "indigo" | "amber";
    matchNames: string[];
  };
  export const STANDARD_BLOCKS: BlockDefinition[];
  export function findBlockDefinition(blockParam?: string | null): BlockDefinition | null;
  export function isQuestionInBlock(question: { blockName: string | null }, block: BlockDefinition): boolean;
  export function getBlockQuestionCount(questions: Array<{ blockName: string | null }>, block: BlockDefinition): number;
  export function getUniqueTopicsForBlock(questions: Array<{ blockName: string | null; topicName: string | null }>, block: BlockDefinition): string[];
  export function filterBlockQuestions(
    questions: Array<{ blockName: string | null; topicName: string | null }>,
    block: BlockDefinition,
    topicFilter: string
  ): Array<any>;
  ```

- [ ] **Step 1: Write failing tests for block helpers**

Buat file `src/pages/admin/questions-page-blocks.test.ts`:
```typescript
import { describe, expect, test } from "vitest";
import {
  STANDARD_BLOCKS,
  findBlockDefinition,
  isQuestionInBlock,
  getBlockQuestionCount,
  getUniqueTopicsForBlock,
  filterBlockQuestions,
} from "./questions-page-blocks";

describe("questions-page-blocks helpers", () => {
  const mockQuestions = [
    {
      id: "q-1",
      stem: "Soal klinis 1",
      blockName: "Clinical Science",
      topicName: "Kardiologi",
    },
    {
      id: "q-2",
      stem: "Soal klinis 2",
      blockName: "Clinical Science",
      topicName: "Onkologi ",
    },
    {
      id: "q-3",
      stem: "Soal klinis tanpa materi",
      blockName: "Clinical Science",
      topicName: null,
    },
    {
      id: "q-4",
      stem: "Soal farmasetika",
      blockName: "Pharmaceutical Science",
      topicName: "Teknologi Steril",
    },
    {
      id: "q-5",
      stem: "Soal administrasi alias",
      blockName: "Social, Behavioral & Administrative Pharmacy",
      topicName: "Manajemen Farmasi",
    },
  ];

  test("defines 3 standard blocks", () => {
    expect(STANDARD_BLOCKS).toHaveLength(3);
    expect(STANDARD_BLOCKS.map((b) => b.id)).toEqual([
      "clinical-science",
      "pharmaceutical-science",
      "social-behavioural-administration",
    ]);
  });

  test("finds block definition by id or name slug", () => {
    expect(findBlockDefinition("clinical-science")?.name).toBe("Clinical Science");
    expect(findBlockDefinition("pharmaceutical-science")?.name).toBe("Pharmaceutical Science");
    expect(findBlockDefinition("social-behavioural-administration")?.id).toBe("social-behavioural-administration");
    expect(findBlockDefinition("unknown")).toBeNull();
    expect(findBlockDefinition(null)).toBeNull();
  });

  test("matches questions accurately including block alias variations", () => {
    const adminBlock = findBlockDefinition("social-behavioural-administration")!;
    expect(isQuestionInBlock(mockQuestions[4], adminBlock)).toBe(true);

    const clinicalBlock = findBlockDefinition("clinical-science")!;
    expect(isQuestionInBlock(mockQuestions[0], clinicalBlock)).toBe(true);
    expect(isQuestionInBlock(mockQuestions[3], clinicalBlock)).toBe(false);
  });

  test("counts questions per block accurately", () => {
    const clinicalBlock = findBlockDefinition("clinical-science")!;
    expect(getBlockQuestionCount(mockQuestions, clinicalBlock)).toBe(3);

    const pharmaBlock = findBlockDefinition("pharmaceutical-science")!;
    expect(getBlockQuestionCount(mockQuestions, pharmaBlock)).toBe(1);
  });

  test("extracts unique trimmed topics for a block", () => {
    const clinicalBlock = findBlockDefinition("clinical-science")!;
    const topics = getUniqueTopicsForBlock(mockQuestions, clinicalBlock);
    expect(topics).toEqual(["Kardiologi", "Onkologi"]);
  });

  test("filters questions strictly by topic and handles unassigned", () => {
    const clinicalBlock = findBlockDefinition("clinical-science")!;

    // 'all' returns all 3 clinical questions
    const allClinical = filterBlockQuestions(mockQuestions, clinicalBlock, "all");
    expect(allClinical).toHaveLength(3);

    // Specific topic only returns matching question (trimmed and case-insensitive)
    const cardio = filterBlockQuestions(mockQuestions, clinicalBlock, "kardiologi");
    expect(cardio).toHaveLength(1);
    expect(cardio[0].id).toBe("q-1");

    // 'unassigned' returns only questions without topic
    const unassigned = filterBlockQuestions(mockQuestions, clinicalBlock, "unassigned");
    expect(unassigned).toHaveLength(1);
    expect(unassigned[0].id).toBe("q-3");

    // Non-existent topic returns empty array
    const nonExistent = filterBlockQuestions(mockQuestions, clinicalBlock, "Pulmonologi");
    expect(nonExistent).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/admin/questions-page-blocks.test.ts`
Expected: FAIL with "Cannot find module './questions-page-blocks'"

- [ ] **Step 3: Implement `src/pages/admin/questions-page-blocks.ts`**

Buat file `src/pages/admin/questions-page-blocks.ts`:
```typescript
export type BlockDefinition = {
  id: string;
  name: string;
  description: string;
  colorTheme: "teal" | "indigo" | "amber";
  matchNames: string[];
};

export const STANDARD_BLOCKS: BlockDefinition[] = [
  {
    id: "clinical-science",
    name: "Clinical Science",
    description: "Farmakoterapi, evaluasi kasus klinis, interaksi obat, dan interpretasi laboratorium klinis.",
    colorTheme: "teal",
    matchNames: ["clinical science"],
  },
  {
    id: "pharmaceutical-science",
    name: "Pharmaceutical Science",
    description: "Formulasi teknologi sediaan padat, cair, dan steril, biofarmasetika, stabilitas, serta analisis farmasi.",
    colorTheme: "indigo",
    matchNames: ["pharmaceutical science"],
  },
  {
    id: "social-behavioural-administration",
    name: "Social Behavioural Administration of Pharmacy",
    description: "Manajemen farmasi, regulasi & perundang-undangan farmasi, farmakoekonomi, etika, dan komunikasi profesi.",
    colorTheme: "amber",
    matchNames: [
      "social behavioural administration of pharmacy",
      "social, behavioral & administrative pharmacy",
      "social behavioural administrative pharmacy",
      "social behavioral administrative pharmacy",
      "social, behavioral and administrative pharmacy",
    ],
  },
];

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function findBlockDefinition(blockParam?: string | null): BlockDefinition | null {
  if (!blockParam) return null;
  const target = normalize(blockParam);
  return (
    STANDARD_BLOCKS.find(
      (b) => b.id === target || normalize(b.name) === target || b.matchNames.includes(target)
    ) ?? null
  );
}

export function isQuestionInBlock(
  question: { blockName: string | null },
  block: BlockDefinition
): boolean {
  const questionBlock = normalize(question.blockName);
  if (!questionBlock) return false;
  return block.matchNames.some((alias) => questionBlock === alias) || questionBlock === normalize(block.name);
}

export function getBlockQuestionCount(
  questions: Array<{ blockName: string | null }>,
  block: BlockDefinition
): number {
  return questions.filter((q) => isQuestionInBlock(q, block)).length;
}

export function getUniqueTopicsForBlock(
  questions: Array<{ blockName: string | null; topicName: string | null }>,
  block: BlockDefinition
): string[] {
  const topics = new Set<string>();
  questions.forEach((q) => {
    if (isQuestionInBlock(q, block)) {
      const topic = q.topicName?.trim();
      if (topic) {
        topics.add(topic);
      }
    }
  });
  return Array.from(topics).sort((a, b) => a.localeCompare(b, "id-ID"));
}

export function filterBlockQuestions<T extends { blockName: string | null; topicName: string | null }>(
  questions: T[],
  block: BlockDefinition,
  topicFilter: string
): T[] {
  const blockQuestions = questions.filter((q) => isQuestionInBlock(q, block));

  if (!topicFilter || topicFilter === "all") {
    return blockQuestions;
  }

  if (topicFilter === "unassigned") {
    return blockQuestions.filter((q) => !q.topicName || !q.topicName.trim());
  }

  const targetTopic = normalize(topicFilter);
  return blockQuestions.filter((q) => normalize(q.topicName) === targetTopic);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/admin/questions-page-blocks.test.ts`
Expected: PASS (all 6 tests passing)

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/questions-page-blocks.ts src/pages/admin/questions-page-blocks.test.ts
git commit -m "feat: add block definitions and strict filtering helper"
```

---

### Task 2: Block Selection UI View Component

**Files:**
- Create: `src/pages/admin/components/question-block-selection-view.tsx`
- Test: `src/pages/admin/components/question-block-selection-view.test.tsx`

**Interfaces:**
- Consumes:
  - `STANDARD_BLOCKS`, `getBlockQuestionCount` dari `../questions-page-blocks`
  - `Card`, `Badge`, `Button`, `getButtonStyleProps` dari `../../../components/ui/`
- Produces:
  ```typescript
  type QuestionBlockSelectionViewProps = {
    basePath: string; // e.g. "/admin/questions" or "/app/questions"
    questions: Array<{ blockName: string | null }>;
    onSelectBlock: (blockId: string) => void;
  };
  export default function QuestionBlockSelectionView(props: QuestionBlockSelectionViewProps): JSX.Element;
  ```

- [ ] **Step 1: Write failing test for QuestionBlockSelectionView**

Buat file `src/pages/admin/components/question-block-selection-view.test.tsx`:
```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, test, vi } from "vitest";
import QuestionBlockSelectionView from "./question-block-selection-view";

describe("QuestionBlockSelectionView", () => {
  const mockQuestions = [
    { blockName: "Clinical Science" },
    { blockName: "Clinical Science" },
    { blockName: "Pharmaceutical Science" },
  ];

  test("renders 3 standard block cards and Tambah Soal button", () => {
    const handleSelectBlock = vi.fn();
    render(
      <MemoryRouter>
        <QuestionBlockSelectionView
          basePath="/admin/questions"
          questions={mockQuestions}
          onSelectBlock={handleSelectBlock}
        />
      </MemoryRouter>
    );

    // Title and Tambah Soal button
    expect(screen.getByRole("heading", { name: /bank soal/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /tambah soal/i })).toHaveAttribute("href", "/admin/questions/new");

    // 3 Cards exist
    expect(screen.getByText("Clinical Science")).toBeInTheDocument();
    expect(screen.getByText("Pharmaceutical Science")).toBeInTheDocument();
    expect(screen.getByText("Social Behavioural Administration of Pharmacy")).toBeInTheDocument();

    // Badges for question counts
    expect(screen.getByText(/2 soal/i)).toBeInTheDocument();
    expect(screen.getByText(/1 soal/i)).toBeInTheDocument();
    expect(screen.getByText(/0 soal/i)).toBeInTheDocument();
  });

  test("triggers onSelectBlock when clicking Buka Bank Soal button", () => {
    const handleSelectBlock = vi.fn();
    render(
      <MemoryRouter>
        <QuestionBlockSelectionView
          basePath="/admin/questions"
          questions={mockQuestions}
          onSelectBlock={handleSelectBlock}
        />
      </MemoryRouter>
    );

    const buttons = screen.getAllByRole("button", { name: /buka bank soal/i });
    fireEvent.click(buttons[0]);
    expect(handleSelectBlock).toHaveBeenCalledWith("clinical-science");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/admin/components/question-block-selection-view.test.tsx`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement `src/pages/admin/components/question-block-selection-view.tsx`**

```tsx
import { Link } from "react-router";
import { Plus, ArrowRight, Stethoscope, FlaskConical, Users } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import Button, { getButtonStyleProps } from "../../../components/ui/button";
import { STANDARD_BLOCKS, getBlockQuestionCount } from "../questions-page-blocks";

type QuestionBlockSelectionViewProps = {
  basePath: string;
  questions: Array<{ blockName: string | null }>;
  onSelectBlock: (blockId: string) => void;
};

const blockVisuals: Record<string, { icon: typeof Stethoscope; bgClass: string; textClass: string }> = {
  "clinical-science": {
    icon: Stethoscope,
    bgClass: "bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400",
    textClass: "text-teal-600 dark:text-teal-400",
  },
  "pharmaceutical-science": {
    icon: FlaskConical,
    bgClass: "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400",
    textClass: "text-indigo-600 dark:text-indigo-400",
  },
  "social-behavioural-administration": {
    icon: Users,
    bgClass: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
    textClass: "text-amber-600 dark:text-amber-400",
  },
};

export default function QuestionBlockSelectionView({
  basePath,
  questions,
  onSelectBlock,
}: QuestionBlockSelectionViewProps) {
  return (
    <div className="space-y-6">
      {/* Top Header & Tambah Soal Bar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-6 shadow-xs lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
            Bank Soal
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
            Pilih blok bidang farmasi untuk melihat, mengelola, menyunting, dan menyaring bank soal.
          </p>
        </div>
        <Link
          {...getButtonStyleProps({
            className: "gap-2 sm:min-w-[11rem] h-10 px-5 text-sm font-bold shadow-md shadow-primary/20",
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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {STANDARD_BLOCKS.map((block) => {
          const visuals = blockVisuals[block.id] ?? blockVisuals["clinical-science"];
          const Icon = visuals.icon;
          const count = getBlockQuestionCount(questions, block);

          return (
            <Card
              key={block.id}
              className="group relative flex flex-col justify-between overflow-hidden border-border/80 bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/40 cursor-pointer"
              onClick={() => onSelectBlock(block.id)}
            >
              <CardHeader className="pt-7 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`flex h-13 w-13 items-center justify-center rounded-2xl ${visuals.bgClass} transition-transform duration-300 group-hover:scale-105`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <Badge variant="secondary" className="text-xs font-bold px-2.5 py-1">
                    {count} Soal
                  </Badge>
                </div>
                <CardTitle className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                  {block.name}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground/90 mt-2.5 leading-relaxed line-clamp-3">
                  {block.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-2 pb-6">
                <Button
                  className="w-full justify-between font-bold h-10 text-xs shadow-xs group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectBlock(block.id);
                  }}
                  variant="outline"
                >
                  <span>Buka Bank Soal</span>
                  <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/admin/components/question-block-selection-view.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/components/question-block-selection-view.tsx src/pages/admin/components/question-block-selection-view.test.tsx
git commit -m "feat: add QuestionBlockSelectionView component"
```

---

### Task 3: Block Question List View with Strict Topic Filter

**Files:**
- Create: `src/pages/admin/components/question-block-list-view.tsx`
- Test: `src/pages/admin/components/question-block-list-view.test.tsx`

**Interfaces:**
- Consumes:
  - `BlockDefinition`, `getUniqueTopicsForBlock`, `filterBlockQuestions` dari `../questions-page-blocks`
  - `QuestionBankItemViewModel` dari `src/lib/mappers/question-authoring-mappers.ts`
  - UI components (`Card`, `Badge`, `Button`, `Alert`, `ConfirmDialog`)
- Produces:
  ```typescript
  type QuestionBlockListViewProps = {
    basePath: string;
    activeBlock: BlockDefinition;
    questions: QuestionBankItemViewModel[];
    onBack: () => void;
    onDeleteQuestion: (questionId: string) => void;
    onBulkDelete: (questionIds: string[]) => void;
    isDeleting?: boolean;
    deleteError?: string | null;
  };
  export default function QuestionBlockListView(props: QuestionBlockListViewProps): JSX.Element;
  ```

- [ ] **Step 1: Write failing test for QuestionBlockListView**

Buat file `src/pages/admin/components/question-block-list-view.test.tsx`:
```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, test, vi } from "vitest";
import QuestionBlockListView from "./question-block-list-view";
import { findBlockDefinition } from "../questions-page-blocks";

describe("QuestionBlockListView", () => {
  const clinicalBlock = findBlockDefinition("clinical-science")!;
  const mockQuestions = [
    {
      id: "q-1",
      stem: "Apa target tekanan darah pada CKD?",
      status: "draft" as const,
      statusLabel: "Draft",
      blockId: "block-1",
      blockName: "Clinical Science",
      topicId: "topic-1",
      topicName: "Kardiologi",
      questionImageUrl: null,
      hasQuestionImage: false,
      hasExplanationText: true,
      hasExplanationImage: false,
      updatedAt: "2026-05-03T08:00:00.000Z",
    },
    {
      id: "q-2",
      stem: "Pilihan regimen pada DM gestasional?",
      status: "published" as const,
      statusLabel: "Published",
      blockId: "block-1",
      blockName: "Clinical Science",
      topicId: "topic-2",
      topicName: "Endokrinologi",
      questionImageUrl: null,
      hasQuestionImage: false,
      hasExplanationText: false,
      hasExplanationImage: false,
      updatedAt: "2026-05-03T09:00:00.000Z",
    },
    {
      id: "q-3",
      stem: "Soal klinis tanpa topik",
      status: "draft" as const,
      statusLabel: "Draft",
      blockId: "block-1",
      blockName: "Clinical Science",
      topicId: null,
      topicName: null,
      questionImageUrl: null,
      hasQuestionImage: false,
      hasExplanationText: false,
      hasExplanationImage: false,
      updatedAt: "2026-05-03T10:00:00.000Z",
    },
  ];

  test("renders block header, back button, and single Materi filter", () => {
    const handleBack = vi.fn();
    render(
      <MemoryRouter>
        <QuestionBlockListView
          activeBlock={clinicalBlock}
          basePath="/admin/questions"
          onBack={handleBack}
          onBulkDelete={vi.fn()}
          onDeleteQuestion={vi.fn()}
          questions={mockQuestions}
        />
      </MemoryRouter>
    );

    // Back button exists
    expect(screen.getByRole("button", { name: /kembali ke pilihan blok/i })).toBeInTheDocument();

    // Block title in heading
    expect(screen.getByText(/clinical science/i)).toBeInTheDocument();

    // No block dropdown filter!
    expect(screen.queryByLabelText(/semua blok/i)).not.toBeInTheDocument();

    // Materi filter exists with expected options
    const materiSelect = screen.getByLabelText(/materi/i);
    expect(materiSelect).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /semua materi/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /tanpa materi/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /kardiologi/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /endokrinologi/i })).toBeInTheDocument();
  });

  test("strictly filters by chosen materi and eliminates non-matching questions", () => {
    render(
      <MemoryRouter>
        <QuestionBlockListView
          activeBlock={clinicalBlock}
          basePath="/admin/questions"
          onBack={vi.fn()}
          onBulkDelete={vi.fn()}
          onDeleteQuestion={vi.fn()}
          questions={mockQuestions}
        />
      </MemoryRouter>
    );

    // Initial: all 3 questions visible
    expect(screen.getByText(/target tekanan darah pada ckd/i)).toBeInTheDocument();
    expect(screen.getByText(/regimen pada dm gestasional/i)).toBeInTheDocument();
    expect(screen.getByText(/soal klinis tanpa topik/i)).toBeInTheDocument();

    // Filter by Kardiologi
    fireEvent.change(screen.getByLabelText(/materi/i), {
      target: { value: "Kardiologi" },
    });

    // Only q-1 is in the document. Others MUST NOT exist in DOM
    expect(screen.getByText(/target tekanan darah pada ckd/i)).toBeInTheDocument();
    expect(screen.queryByText(/regimen pada dm gestasional/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/soal klinis tanpa topik/i)).not.toBeInTheDocument();
  });

  test("filters by 'Tanpa materi' option", () => {
    render(
      <MemoryRouter>
        <QuestionBlockListView
          activeBlock={clinicalBlock}
          basePath="/admin/questions"
          onBack={vi.fn()}
          onBulkDelete={vi.fn()}
          onDeleteQuestion={vi.fn()}
          questions={mockQuestions}
        />
      </MemoryRouter>
    );

    // Select 'Tanpa materi'
    fireEvent.change(screen.getByLabelText(/materi/i), {
      target: { value: "unassigned" },
    });

    expect(screen.getByText(/soal klinis tanpa topik/i)).toBeInTheDocument();
    expect(screen.queryByText(/target tekanan darah pada ckd/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/regimen pada dm gestasional/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/admin/components/question-block-list-view.test.tsx`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement `src/pages/admin/components/question-block-list-view.tsx`**

```tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  ArrowLeft,
  Plus,
  Filter,
  CheckSquare,
  Trash2,
  Pencil,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { Card } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "../../../components/ui/alert";
import Button, { getButtonStyleProps } from "../../../components/ui/button";
import type { QuestionBankItemViewModel } from "../../../lib/mappers/question-authoring-mappers";
import {
  type BlockDefinition,
  filterBlockQuestions,
  getUniqueTopicsForBlock,
  isQuestionInBlock,
} from "../questions-page-blocks";

type QuestionBlockListViewProps = {
  basePath: string;
  activeBlock: BlockDefinition;
  questions: QuestionBankItemViewModel[];
  onBack: () => void;
  onDeleteQuestion: (questionId: string) => void;
  onBulkDelete: (questionIds: string[]) => void;
  isDeleting?: boolean;
  deleteError?: string | null;
};

export default function QuestionBlockListView({
  basePath,
  activeBlock,
  questions,
  onBack,
  onDeleteQuestion,
  onBulkDelete,
  isDeleting = false,
  deleteError = null,
}: QuestionBlockListViewProps) {
  const [topicFilter, setTopicFilter] = useState("all");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

  // 1. Unique topics available in active block
  const topicOptions = useMemo(() => {
    return getUniqueTopicsForBlock(questions, activeBlock);
  }, [questions, activeBlock]);

  // Check if there are unassigned questions
  const hasUnassignedTopics = useMemo(() => {
    return questions.some(
      (q) => isQuestionInBlock(q, activeBlock) && (!q.topicName || !q.topicName.trim())
    );
  }, [questions, activeBlock]);

  // 2. Strict filtering
  const filteredQuestions = useMemo(() => {
    return filterBlockQuestions(questions, activeBlock, topicFilter);
  }, [questions, activeBlock, topicFilter]);

  // 3. Selection sync when filter changes
  useEffect(() => {
    const visibleIds = new Set(filteredQuestions.map((q) => q.id));
    setSelectedQuestionIds((current) => {
      const nextSelection = current.filter((id) => visibleIds.has(id));
      return nextSelection.length === current.length ? current : nextSelection;
    });
  }, [filteredQuestions]);

  function handleQuestionSelectionChange(questionId: string, checked: boolean) {
    setSelectedQuestionIds((current) => {
      if (checked) {
        return current.includes(questionId) ? current : [...current, questionId];
      }
      return current.filter((id) => id !== questionId);
    });
  }

  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedQuestionIds(filteredQuestions.map((q) => q.id));
    } else {
      setSelectedQuestionIds([]);
    }
  }

  const allSelected =
    filteredQuestions.length > 0 && selectedQuestionIds.length === filteredQuestions.length;

  return (
    <div className="space-y-6">
      {deleteError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive">
          {deleteError}
        </div>
      ) : null}

      {/* Top Navigation & Action Banner */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-6 shadow-xs lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3">
          <Button
            className="w-fit gap-2 text-xs font-bold text-muted-foreground hover:text-foreground -ml-2 h-8 px-2"
            onClick={onBack}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Pilihan Blok
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                {activeBlock.name}
              </h2>
              <Badge variant="secondary" className="text-xs font-bold px-2 py-0.5">
                {filteredQuestions.length} Soal
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-2xl">
              {activeBlock.description}
            </p>
          </div>
        </div>

        <Link
          {...getButtonStyleProps({
            className: "gap-2 sm:min-w-[11rem] h-10 px-5 text-sm font-bold shadow-md shadow-primary/20",
            size: "sm",
            variant: "primary",
          })}
          to={`${basePath}/new?block=${activeBlock.id}`}
        >
          <Plus className="h-4 w-4" />
          Tambah soal
        </Link>
      </div>

      {/* Main Container */}
      <Card className="space-y-6 p-6 border-border/80 bg-card shadow-xs">
        {/* Single Filter Bar: Materi Only */}
        <div className="flex flex-col gap-4 rounded-xl border border-border/80 bg-muted/30 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <h3 className="text-base font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              Filter materi
            </h3>
            <p className="mt-1 text-xs text-muted-foreground leading-normal">
              Saring soal berdasarkan materi pada blok ini, lalu lanjutkan ke penyuntingan atau pembersihan.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-foreground grid gap-1.5 w-full sm:w-auto">
              Materi
              <select
                aria-label="Materi"
                className="h-10 rounded-xl border border-border/80 bg-background px-3 text-xs font-semibold text-foreground transition-all focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer min-w-56"
                onChange={(e) => setTopicFilter(e.target.value)}
                value={topicFilter}
              >
                <option value="all">Semua materi</option>
                {hasUnassignedTopics && <option value="unassigned">Tanpa materi</option>}
                {topicOptions.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Selection Status Banner */}
        <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer">
              <input
                aria-label="Pilih semua soal yang tampil"
                checked={allSelected}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                disabled={filteredQuestions.length === 0}
                onChange={(e) => handleSelectAll(e.target.checked)}
                type="checkbox"
              />
              <span>Pilih semua</span>
            </label>
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 border-l border-border/60 pl-3">
              <CheckSquare className="h-3.5 w-3.5 text-primary" />
              {selectedQuestionIds.length
                ? `${selectedQuestionIds.length} soal dipilih.`
                : "Pilih soal untuk dihapus secara massal."}
            </span>
          </div>

          <Button
            className="h-9 text-xs font-bold px-4"
            disabled={selectedQuestionIds.length === 0 || isDeleting}
            onClick={() => onBulkDelete(selectedQuestionIds)}
            size="sm"
            variant="destructive"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Hapus terpilih
          </Button>
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
                          onChange={(e) => handleQuestionSelectionChange(question.id, e.target.checked)}
                          type="checkbox"
                        />
                        <span>Pilih soal</span>
                      </label>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge
                          className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 ${
                            question.status === "published"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                          }`}
                          variant={question.status === "published" ? "outline" : "secondary"}
                        >
                          {question.statusLabel}
                        </Badge>
                        <Badge
                          className={`text-[10px] font-semibold px-2 py-0.5 ${
                            !question.topicName
                              ? "text-destructive/80 border-destructive/20 bg-destructive/10"
                              : "text-muted-foreground"
                          }`}
                          variant="secondary"
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
                        className="h-8 text-xs font-semibold px-3"
                        disabled={isDeleting}
                        onClick={() => onDeleteQuestion(question.id)}
                        size="sm"
                        variant="destructive"
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
            <AlertDescription>
              Tidak ada soal yang cocok dengan filter materi ini pada blok {activeBlock.name}.
            </AlertDescription>
          </Alert>
        )}
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/admin/components/question-block-list-view.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/components/question-block-list-view.tsx src/pages/admin/components/question-block-list-view.test.tsx
git commit -m "feat: add QuestionBlockListView with strict topic filtering"
```

---

### Task 4: Integrate Block Selection and List in `QuestionsPage`

**Files:**
- Modify: `src/pages/admin/questions-page.tsx`
- Test: `src/pages/admin/questions-page.test.tsx`

**Interfaces:**
- Consumes:
  - `QuestionBlockSelectionView` dari `./components/question-block-selection-view`
  - `QuestionBlockListView` dari `./components/question-block-list-view`
  - `findBlockDefinition` dari `./questions-page-blocks`
- Produces: Integrated `QuestionsPage` reacting to `useSearchParams()` for `?block=...`.

- [ ] **Step 1: Update `src/pages/admin/questions-page.tsx`**

Integrasikan `useSearchParams()` untuk membaca `?block=...`:
- Jika parameter `block` tidak ada atau tidak valid, render `QuestionBlockSelectionView`.
- Jika parameter `block` ada dan valid, render `QuestionBlockListView`.
- Pastikan kedua wrapper (`ProductShell` untuk mentor dan `AdminShell` untuk admin) selalu merender `<h1>Bank Soal</h1>` saat di tampilan pemilihan blok sehingga konsisten dan test-friendly.
- Pastikan modal `ConfirmDialog` untuk single delete dan bulk delete tetap berfungsi secara terpusat di `QuestionsPage`.

```tsx
import { useState } from "react";
import { Alert, AlertTitle, AlertDescription } from "../../components/ui/alert";
import { Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useSearchParams } from "react-router";
import AdminShell from "../../components/layout/admin-shell";
import ConfirmDialog from "../../components/ui/confirm-dialog";
import ProductShell from "../../components/layout/product-shell";
import {
  deleteQuestion,
  deleteQuestions,
  listQuestionBank,
} from "../../lib/api/question-authoring-api";
import { createAdminNavItems } from "../../mocks/admin-content";
import {
  createProductNavItems,
  productShellMeta,
  resolveStudentTierLabel,
} from "../../mocks/student-dashboard";
import { findBlockDefinition } from "./questions-page-blocks";
import QuestionBlockSelectionView from "./components/question-block-selection-view";
import QuestionBlockListView from "./components/question-block-list-view";

function QuestionsPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMentorSurface = location.pathname.startsWith("/app/");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<
    | { kind: "single"; questionId: string }
    | { kind: "bulk"; questionIds: string[] }
    | null
  >(null);

  const queryClient = useQueryClient();
  const questionBankQuery = useQuery({
    queryKey: ["question-bank"],
    queryFn: () => listQuestionBank(),
  });
  const basePath = isMentorSurface ? "/app/questions" : "/admin/questions";

  const blockParam = searchParams.get("block");
  const activeBlock = findBlockDefinition(blockParam);

  const deleteQuestionMutation = useMutation({
    mutationFn: ({ questionId }: { questionId: string }) => deleteQuestion({ questionId }),
    onSuccess: () => {
      setDeleteError(null);
    },
    onError: (error) => {
      setDeleteError(error instanceof Error ? error.message : "Soal belum berhasil dihapus.");
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["question-bank"],
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: ({ questionIds }: { questionIds: string[] }) => deleteQuestions({ questionIds }),
    onSuccess: () => {
      setDeleteError(null);
    },
    onError: (error) => {
      setDeleteError(error instanceof Error ? error.message : "Soal terpilih belum berhasil dihapus.");
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["question-bank"],
      });
    },
  });

  function handleConfirmDelete() {
    if (!pendingDelete) return;
    setDeleteError(null);

    if (pendingDelete.kind === "single") {
      deleteQuestionMutation.mutate({ questionId: pendingDelete.questionId });
      setPendingDelete(null);
      return;
    }

    bulkDeleteMutation.mutate({ questionIds: pendingDelete.questionIds });
    setPendingDelete(null);
  }

  const isDeleting = deleteQuestionMutation.isPending || bulkDeleteMutation.isPending;
  const questions = questionBankQuery.data ?? [];

  const mainContent = (
    <>
      {questionBankQuery.isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4 border rounded-2xl bg-card/60 shadow-sm backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Daftar soal sedang dimuat.</p>
        </div>
      ) : questionBankQuery.isError ? (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
          <AlertTitle>Bank soal belum tersedia</AlertTitle>
          <AlertDescription>Daftar soal belum bisa dimuat.</AlertDescription>
        </Alert>
      ) : activeBlock ? (
        <QuestionBlockListView
          activeBlock={activeBlock}
          basePath={basePath}
          deleteError={deleteError}
          isDeleting={isDeleting}
          onBack={() => {
            searchParams.delete("block");
            setSearchParams(searchParams);
          }}
          onBulkDelete={(questionIds) => {
            setPendingDelete({ kind: "bulk", questionIds });
          }}
          onDeleteQuestion={(questionId) => {
            setPendingDelete({ kind: "single", questionId });
          }}
          questions={questions}
        />
      ) : (
        <QuestionBlockSelectionView
          basePath={basePath}
          onSelectBlock={(blockId) => {
            setSearchParams({ block: blockId });
          }}
          questions={questions}
        />
      )}

      <ConfirmDialog
        confirmLabel={pendingDelete?.kind === "bulk" ? `Hapus ${pendingDelete.questionIds.length} soal` : "Hapus soal"}
        description={
          pendingDelete?.kind === "bulk"
            ? `${pendingDelete.questionIds.length} soal akan dihapus dari bank soal. Tindakan ini tidak bisa dibatalkan.`
            : "Soal ini akan dihapus dari bank soal. Tindakan ini tidak bisa dibatalkan."
        }
        isPending={isDeleting}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
        open={Boolean(pendingDelete)}
        pendingLabel="Menghapus..."
        title={pendingDelete?.kind === "bulk" ? `Hapus ${pendingDelete.questionIds.length} soal?` : "Hapus soal ini?"}
      />
    </>
  );

  if (isMentorSurface) {
    return (
      <ProductShell
        brand={productShellMeta.brand}
        tierLabel={resolveStudentTierLabel("mentor")}
        navItems={createProductNavItems("/app/questions", "mentor")}
      >
        <div className="flex flex-col w-full py-4 space-y-6">
          {mainContent}
        </div>
      </ProductShell>
    );
  }

  return (
    <AdminShell
      title="Bank Soal"
      description="Kelola soal dan rapikan isinya dari halaman ini."
      navItems={createAdminNavItems("/admin/questions")}
    >
      {mainContent}
    </AdminShell>
  );
}

export default QuestionsPage;
```

- [ ] **Step 2: Update `src/pages/admin/questions-page.test.tsx` for new user flows**

Perbarui pengujian di `src/pages/admin/questions-page.test.tsx` agar menguji:
1. Render halaman pemilihan 3 blok secara default pada `/admin/questions` dan `/app/questions`.
2. Klik salah satu card blok membuka daftar soal blok tersebut.
3. Klik tombol "Kembali ke Pilihan Blok" mengembalikan ke 3 card.
4. Filter materi bekerja secara ketat di dalam blok aktif.
5. Tombol "Tambah soal" muncul di halaman pemilihan 3 blok.
6. Penghapusan soal (single & bulk) tetap berjalan lancar.

- [ ] **Step 3: Run tests to verify all pass**

Run: `npx vitest run src/pages/admin/questions-page.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/questions-page.tsx src/pages/admin/questions-page.test.tsx
git commit -m "feat: integrate block selection view and block questions list in QuestionsPage"
```

---

### Task 5: End-to-End Regression Verification

**Files:**
- Test: `src/router/app-router.test.tsx`

**Checklist:**
- [ ] **Step 1: Run full test suite for `questions-page` and `app-router`**

Run: `npx vitest run src/pages/admin/ src/router/app-router.test.tsx`
Expected: ALL PASS with 0 failures

- [ ] **Step 2: Verify build compiles cleanly**

Run: `npm run build`
Expected: TypeScript check passes and Vite build succeeds

- [ ] **Step 3: Commit any final test updates**

```bash
git commit -am "chore: verify tests and clean build for bank soal block selection and topic filter"
```
