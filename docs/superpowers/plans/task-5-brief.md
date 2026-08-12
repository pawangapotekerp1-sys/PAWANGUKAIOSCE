### Task 5: App UI - Block Selection Refactor

**Files:**
- Modify: `src/pages/app/tryout-block-selection-page.tsx`

**Interfaces:**
- Consumes: The `TryoutTemplate` data with `iconName` and `colorTheme` from the API response.

- [ ] **Step 1: Create Visuals Mapper**
In `src/pages/app/tryout-block-selection-page.tsx` (or in a new UI utility file), create a function `mapBlockVisuals(iconName?: string | null, colorTheme?: string | null)`.
This function should map string names (e.g. `'Stethoscope'`) to the actual Lucide React icon components.
It should map `colorTheme` string names (e.g. `'teal'`) to the correct Tailwind classes (e.g. `border-teal-500/20 bg-teal-500/10 text-teal-600` for active state).
Provide safe fallbacks (e.g., a default `LayoutGrid` icon and `slate` color theme) if the database value is null/unknown.

- [ ] **Step 2: Apply in Component**
Refactor the UI component mapping in `src/pages/app/tryout-block-selection-page.tsx`. Remove the hardcoded `getBlockVisuals` function (which relies on `block.name`).
Instead, in the `renderBlockCard` or block loop, call `mapBlockVisuals(block.iconName, block.colorTheme)` to get the `icon: Icon` and `colorClass` to render.

- [ ] **Step 3: Commit**

```bash
git add src/pages/app/tryout-block-selection-page.tsx
git commit -m "refactor: use dynamic block visuals from api in block selection"
```
