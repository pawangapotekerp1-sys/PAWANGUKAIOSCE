# Custom Blocks and Materials Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a full CRUD system for Blocks and Materials (Topics) in the Admin dashboard, store visual customizations in the database, delete existing hardcoded blocks, and render these dynamic blocks in the App UI.

**Architecture:** We will create a Supabase migration to add `icon_name` and `color_theme` columns to `public.blocks` and truncate existing blocks. We will update the Typescript types for Supabase clients and API mappers to consume these new fields. We will build Admin UI pages (Blocks Management) with React Hook Form and Shadcn UI components. Finally, we'll refactor the existing block selection page to consume dynamic visuals instead of hardcoded rules.

**Tech Stack:** React, TypeScript, Supabase, Tailwind CSS, Lucide React, React Query, React Hook Form.

## User Review Required
> [!WARNING]
> Menghapus semua Blok saat ini akan gagal jika ada Soal (Questions) yang terikat pada blok tersebut, karena `questions` memiliki relasi ketat (restrict) dengan `blocks`.
> **Apakah Anda setuju jika semua data Soal (Questions) yang ada saat ini juga dihapus untuk mereset sistem blok dari nol?** Jika tidak, kita harus melakukan migrasi data perlahan dengan memindahkan soal lama ke blok baru.

## Global Constraints
- Follow existing patterns for `tryout-api.ts`.
- Ensure clear handling if `icon_name` or `color_theme` is null (provide visual fallbacks).

---

### Task 1: Database Migration & Schema Update

**Files:**
- Create: `supabase/migrations/20260805000000_custom_blocks_visuals.sql`

**Interfaces:**
- Produces: `public.blocks` now has `icon_name` (text, nullable) and `color_theme` (text, nullable).

- [ ] **Step 1: Write the migration file**

```sql
-- 1. Tambahkan kolom visual ke tabel blocks
ALTER TABLE public.blocks
ADD COLUMN icon_name text,
ADD COLUMN color_theme text;

-- 2. Hapus data lama (Opsional, tergantung jawaban User Review)
-- Jika setuju menghapus semua:
-- DELETE FROM public.question_options;
-- DELETE FROM public.question_explanations;
-- DELETE FROM public.questions;
-- DELETE FROM public.topics;
-- DELETE FROM public.blocks;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations
git commit -m "feat: add icon and color columns to blocks table"
```

### Task 2: API & Types Update

**Files:**
- Modify: `src/lib/api/tryout-api.ts`

**Interfaces:**
- Consumes: The new `icon_name` and `color_theme` columns from DB.
- Produces: `TryoutTemplate`, `TryoutCatalogEntry`, and related types include `iconName` and `colorTheme`.

- [ ] **Step 1: Update Types**
In `src/lib/api/tryout-api.ts`, add `icon_name?: string | null` and `color_theme?: string | null` to `ExamTemplateRow` and `TaxonomyBlockRow`. Add `iconName` and `colorTheme` to `TryoutTemplate` and `TryoutCatalogEntry`.

- [ ] **Step 2: Update Mappers**
Update `mapTemplate`, `mapCatalogEntry`, and `listTryoutCatalogEntriesFallback` to map the new fields.
Ensure the fallback method queries the new columns: `select("id, name, slug, sort_order, icon_name, color_theme, ...")`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/api/tryout-api.ts
git commit -m "feat: update tryout api types and mappers for block visuals"
```

### Task 3: Admin UI - Blocks Management API

**Files:**
- Create: `src/lib/api/admin-blocks-api.ts`

**Interfaces:**
- Produces: Functions to fetch, create, update, and delete blocks and topics for the Admin panel.

- [ ] **Step 1: Write CRUD functions**
Create `getAdminBlocks`, `createAdminBlock`, `updateAdminBlock`, `deleteAdminBlock`. Include operations for `topics` inside the same file (e.g. `getAdminTopics`, `createAdminTopic`, `deleteAdminTopic`).

- [ ] **Step 2: Commit**

```bash
git add src/lib/api/admin-blocks-api.ts
git commit -m "feat: add admin blocks and topics api methods"
```

### Task 4: Admin UI - Blocks & Topics Page

**Files:**
- Create: `src/pages/admin/blocks-management-page.tsx`
- Modify: `src/router/app-router.tsx` (to add the new admin route)

**Interfaces:**
- Consumes: `admin-blocks-api.ts`

- [ ] **Step 1: Build the Page**
Implement a layout with a list/table of blocks.
Include a button to "Tambah Blok". Use Shadcn UI Dialog containing a form with inputs for Name, Description, Slug, Icon (select from Lucide names), and Color Theme (select from presets like teal, indigo, amber).

- [ ] **Step 2: Add Topics Management**
Inside the blocks management page, allow clicking a block to see its sub-topics (materi). Provide a way to add/remove topics.

- [ ] **Step 3: Register Route**
Add the route `/admin/blocks` in the router and link it in the admin sidebar navigation (if applicable).

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/blocks-management-page.tsx src/router/app-router.tsx
git commit -m "feat: create admin blocks management page"
```

### Task 5: App UI - Block Selection Refactor

**Files:**
- Modify: `src/pages/app/tryout-block-selection-page.tsx`

**Interfaces:**
- Consumes: The `TryoutCatalogEntry` which now contains `iconName` and `colorTheme`.

- [ ] **Step 1: Create Visuals Mapper**
Remove the hardcoded `getBlockVisuals` text-matching logic.
Create a new function that maps `colorTheme` (e.g. 'teal', 'indigo') to the corresponding Tailwind classes (accentBg, badgeBg), and `iconName` to the actual `lucide-react` icon component.
Provide fallbacks if `colorTheme` or `iconName` are null.

- [ ] **Step 2: Apply in Component**
Update the rendering loop to use the new dynamic visual mapping.

- [ ] **Step 3: Commit**

```bash
git add src/pages/app/tryout-block-selection-page.tsx
git commit -m "feat: use dynamic visuals for block selection page"
```
