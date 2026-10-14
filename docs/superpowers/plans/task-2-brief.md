# Task 2 Brief: Implement Back Button & Block Header in TryoutTopicSelectionPage

## Files
- Modify: `src/pages/app/tryout-topic-selection-page.tsx`

## Requirements
Implement the back navigation and active block header in `src/pages/app/tryout-topic-selection-page.tsx`, removing the obsolete block filter pill buttons.

Specifically:
1. Derive `activeBlock`:
   ```tsx
   const activeBlock = uniqueBlocks.find((b) => b.id === activeFilter);
   ```
2. Replace `{/* Filter Tabs */}` block with `{/* Navigation & Header */}`:
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
3. Update `useSearchParams`:
   Change `const [searchParams, setSearchParams] = useSearchParams();` to:
   `const [searchParams] = useSearchParams();`
4. Clean up unused imports (such as `Filter` if it is no longer referenced). Keep existing comments and docstrings intact.
5. Verify build and type check:
   - Run `npx tsc --noEmit` -> Must exit with code 0.
   - Run `npm run build` -> Must succeed.
6. Commit:
   `git add src/pages/app/tryout-topic-selection-page.tsx`
   `git commit -m "feat(tryout): replace block filter pills with back button and active block header"`

## Report Contract
Write your full report to: `docs/superpowers/plans/task-2-report.md`.
