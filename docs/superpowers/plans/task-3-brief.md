### Task 3: Admin UI - Blocks Management API

**Files:**
- Create: `src/lib/api/admin-blocks-api.ts`

**Interfaces:**
- Produces: Functions to fetch, create, update, and delete blocks and topics for the Admin panel.

- [ ] **Step 1: Write CRUD functions**
Create the following exported functions using `getSupabaseBrowserClient()`:
- `getAdminBlocks()`: Returns all blocks (including `icon_name` and `color_theme`) sorted by `sort_order` or `created_at`.
- `createAdminBlock(data: { name: string, slug: string, description?: string, sort_order?: number, icon_name?: string, color_theme?: string })`
- `updateAdminBlock(id: string, data: Partial<...>)`
- `deleteAdminBlock(id: string)`

And for topics (materi):
- `getAdminTopics(blockId: string)`: Returns topics for a specific block.
- `createAdminTopic(data: { block_id: string, name: string, slug: string, description?: string, sort_order?: number })`
- `updateAdminTopic(id: string, data: Partial<...>)`
- `deleteAdminTopic(id: string)`

Use existing `supabase/browser-client` patterns (like `src/lib/api/tryout-api.ts`).
Remember that the database columns use snake_case (`icon_name`, `color_theme`). Let the functions accept camelCase inputs and map them to snake_case for the database insertion/update if necessary, or just accept the mapped objects. It's best to return mapped objects in camelCase (e.g., `iconName`, `colorTheme`).

- [ ] **Step 2: Commit**

```bash
git add src/lib/api/admin-blocks-api.ts
git commit -m "feat: add admin blocks and topics api methods"
```
