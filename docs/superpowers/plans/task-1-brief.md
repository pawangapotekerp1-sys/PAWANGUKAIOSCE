### Task 1: Update Sidebar Navigation

**Files:**
- Modify: `src/mocks/student-dashboard.ts`

**Interfaces:**
- Produces: Updated `productNavItems` with a single `Try Out` menu pointing to `/app/tryout-selection`.

- [ ] **Step 1: Modify student-dashboard.ts**

Update `productNavItems` in `src/mocks/student-dashboard.ts` to look exactly like this:
```typescript
export const productNavItems: ProductNavItem[] = [
  {
    href: "/app/tryout-selection",
    label: "Try Out",
    icon: FileCheck2,
  },
  {
    href: "/app/analytics",
    label: "Analisis",
    icon: ChartColumnBig,
  },
  {
    href: "/app/review",
    label: "Review",
    icon: BookOpenCheck,
  },
  {
    href: "/app/questions",
    label: "Bank Soal",
    icon: FileCheck2,
  },
  {
    href: "/app/leaderboard",
    label: "Leaderboard",
    icon: Trophy,
  },
  {
    href: "/profile",
    label: "Profil",
    icon: IdCard,
  },
] as const;
```
Note: Ensure you keep all other content in `src/mocks/student-dashboard.ts` intact.

- [ ] **Step 2: Typecheck modifications**

Run: `npx tsc --noEmit`
Expected: PASS without type errors.

- [ ] **Step 3: Commit**

```bash
git add src/mocks/student-dashboard.ts
git commit -m "feat: merge try out sidebar menus"
```
