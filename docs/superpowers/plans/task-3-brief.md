### Task 3: Update App Router

**Files:**
- Modify: `src/router/app-router.tsx`

**Interfaces:**
- Consumes: `TryoutSelectionPage`

- [ ] **Step 1: Modify app-router.tsx**

Update `src/router/app-router.tsx` to lazy load the new page and add the route:
1. Add lazy import near the other page imports:
```typescript
const TryoutSelectionPage = lazy(() => import("../pages/app/tryout-selection-page"));
```
2. Add the route inside `<Route path="/app">` right before the `tryout` route:
```tsx
            <Route path="tryout-selection" element={<TryoutSelectionPage />} />
```

- [ ] **Step 2: Typecheck modifications**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/router/app-router.tsx
git commit -m "feat: add tryout-selection route"
```
