### Task 2: API & Types Update

**Files:**
- Modify: `src/lib/api/tryout-api.ts`

**Interfaces:**
- Consumes: The new `icon_name` and `color_theme` columns from DB.
- Produces: `TryoutTemplate`, `TryoutCatalogEntry`, and related types include `iconName?: string | null` and `colorTheme?: string | null`.

- [ ] **Step 1: Update Types**
In `src/lib/api/tryout-api.ts`, add `icon_name?: string | null` and `color_theme?: string | null` to `ExamTemplateRow` and `TaxonomyBlockRow`.
Add `iconName: string | null;` and `colorTheme: string | null;` to the `TryoutTemplate` and `TryoutCatalogEntry` types.

- [ ] **Step 2: Update Mappers**
Update the mapping functions (`mapTemplate`, `mapCatalogEntry`) to map the new fields (e.g. `iconName: row.icon_name ?? null`, `colorTheme: row.color_theme ?? null`).
Update `listTryoutCatalogEntriesFallback` function: ensure the database query selects the new columns for `blocks` (update the `select` string from `"id, name, slug, sort_order, topics:topics(id, name, slug, sort_order, is_active)"` to include `icon_name` and `color_theme`, and also map them correctly when building the `fallbackEntries` array for blocks).

- [ ] **Step 3: Commit**

```bash
git add src/lib/api/tryout-api.ts
git commit -m "feat: update tryout api types and mappers for block visuals"
```
