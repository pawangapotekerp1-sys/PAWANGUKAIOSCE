# Tryout Topic Selection Back Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove redundant block filter buttons on the tryout topic selection page and replace them with a "Kembali ke Pilihan Blok" back button alongside an active block header.

**Architecture:** Update `TryoutTopicSelectionPage` to delete the filter tabs (`Semua Blok` and block list pill buttons), derive the active block name from `uniqueBlocks` and `searchParams`, and render a header containing a back link to `/app/tryout/blocks` and the active block title. Update `tryout-topic-selection-page.test.tsx` to assert the back button and URL-based block filtering.

**Tech Stack:** React 19, TypeScript, React Router v7 (`Link`, `useSearchParams`), Tailwind CSS v4, Vitest, Testing Library.

## Global Constraints
- Target component: `src/pages/app/tryout-topic-selection-page.tsx`
- Target test: `src/pages/app/tryout-topic-selection-page.test.tsx`
- Back button destination: `/app/tryout/blocks`
- Back button test ID: `btn-back-to-blocks`
- Type checking must pass with `npx tsc --noEmit`

---

### Task 1: Update Test Suite for Back Button and Block Header Navigation

**Files:**
- Modify: `src/pages/app/tryout-topic-selection-page.test.tsx`

**Interfaces:**
- Consumes: `TryoutTopicSelectionPage` component, `listTryoutCatalogEntries` mock
- Produces: Updated test assertions matching the new header, back button, and removed filter pills

- [ ] **Step 1: Update `src/pages/app/tryout-topic-selection-page.test.tsx`**

Replace filter-button assertions with tests for the back button and active block header:

```tsx
  it("renders back button to blocks and topic cards by default", async () => {
    vi.mocked(listTryoutCatalogEntries).mockResolvedValue(mockEntries as any);

    renderWithProviders(<TryoutTopicSelectionPage />);

    await waitFor(() => {
      expect(screen.getByText("Farmakoterapi Kardiovaskular & Renologi")).toBeInTheDocument();
      expect(screen.getByText("Teknologi Sediaan Cair & Steril")).toBeInTheDocument();
      expect(screen.getByText("Regulasi & Etika")).toBeInTheDocument();
    });

    const backButton = screen.getByTestId("btn-back-to-blocks");
    expect(backButton).toBeInTheDocument();
    expect(backButton).toHaveAttribute("href", "/app/tryout/blocks");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Semua Materi");
    expect(screen.queryByTestId("filter-all")).not.toBeInTheDocument();
  });

  it("displays active block name and filters topics when block param is in URL", async () => {
    vi.mocked(listTryoutCatalogEntries).mockResolvedValue(mockEntries as any);

    renderWithProviders(<TryoutTopicSelectionPage />, ["/?block=b1"]);

    await waitFor(() => {
      expect(screen.getByText("Farmakoterapi Kardiovaskular & Renologi")).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Clinical Science");
    expect(screen.queryByText("Teknologi Sediaan Cair & Steril")).not.toBeInTheDocument();
    expect(screen.queryByText("Regulasi & Etika")).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Verify type-check passes**

Run: `npx tsc --noEmit`
Expected: Exits with code 0.

- [ ] **Step 3: Commit**

```bash
git add src/pages/app/tryout-topic-selection-page.test.tsx
git commit -m "test(tryout): update topic selection tests for back button and block header"
```

---

### Task 2: Implement Back Button & Block Header in `TryoutTopicSelectionPage`

**Files:**
- Modify: `src/pages/app/tryout-topic-selection-page.tsx`

**Interfaces:**
- Consumes: `uniqueBlocks`, `activeFilter`, `filteredTopics`
- Produces: UI with back button to `/app/tryout/blocks`, active block heading, and removal of block filter buttons

- [ ] **Step 1: Update `src/pages/app/tryout-topic-selection-page.tsx`**

1. Derive `activeBlock`:
```tsx
  const activeBlock = uniqueBlocks.find((b) => b.id === activeFilter);
```

2. Replace `{/* Filter Tabs */}` with `{/* Navigation & Header */}`:
```tsx
            {/* Navigation & Header */}
            {!isLoading && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <Link
                    {...getButtonStyleProps({
                      variant: "outline",
                      size: "sm",
                      className: "rounded-lg text-xs font-semibold gap-2 shadow-xs",
                    })}
                    to="/app/tryout/blocks"
                    data-testid="btn-back-to-blocks"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Kembali ke Pilihan Blok
                  </Link>
                  <div className="h-4 w-px bg-border hidden sm:block" />
                  <h1 className="text-lg font-bold tracking-tight text-foreground">
                    {activeBlock ? activeBlock.name : "Semua Materi"}
                  </h1>
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  Menampilkan {filteredTopics.length} materi
                </span>
              </div>
            )}
```

3. Remove unused `setSearchParams` from `useSearchParams`:
```tsx
  const [searchParams] = useSearchParams();
```

- [ ] **Step 2: Verify typecheck and build**

Run: `npx tsc --noEmit`
Expected: Exits with code 0.

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/pages/app/tryout-topic-selection-page.tsx
git commit -m "feat(tryout): replace block filter pills with back button and active block header"
```
