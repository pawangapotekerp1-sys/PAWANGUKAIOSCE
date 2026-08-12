### Task 4: Admin UI - Blocks & Topics Page

**Files:**
- Create: `src/pages/admin/blocks-management-page.tsx`
- Modify: `src/router/app-router.tsx`

**Interfaces:**
- Consumes: `src/lib/api/admin-blocks-api.ts` (functions: `getAdminBlocks`, `createAdminBlock`, `updateAdminBlock`, `deleteAdminBlock`, `getAdminTopics`, `createAdminTopic`, `updateAdminTopic`, `deleteAdminTopic`)

- [ ] **Step 1: Build the Blocks Management Page**
Create `src/pages/admin/blocks-management-page.tsx`. Use `@tanstack/react-query` to fetch blocks.
Display blocks in a grid or table. Include a "Tambah Blok" button that opens a dialog (e.g., Shadcn `Dialog`).
The form should use `react-hook-form` and `zod` for validation.
Fields: Name, Slug, Description, Sort Order, Icon Name (Select input with Lucide names like 'Stethoscope', 'FlaskConical', 'Scale', 'Layers'), Color Theme (Select input with 'teal', 'indigo', 'amber', 'slate', 'fuchsia').
Also include Edit and Delete actions for each block.

- [ ] **Step 2: Add Topics Management**
Inside the blocks page, or within a block's detail view (e.g. an expandable row or a separate dialog "Kelola Materi"), list the topics for that block.
Include actions to Create, Edit, and Delete topics (Name, Slug, Description, Sort Order).

- [ ] **Step 3: Register Route**
In `src/router/app-router.tsx`, add the new route `/admin/blocks` using `BlocksManagementPage`.
Add it to the sidebar navigation if there's an admin shell navigation array defined (e.g. in `src/mocks/student-dashboard.ts` or wherever admin shell nav items are). (Note: The admin dashboard might use its own shell. Just make sure the route is accessible).

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/blocks-management-page.tsx src/router/app-router.tsx
# Add other files if modified for navigation
git commit -m "feat: create admin blocks and topics management page"
```
