### Task 1: Database Migration & Schema Update

**Files:**
- Create: `supabase/migrations/20260805000000_custom_blocks_visuals.sql` (use current date if needed)

**Interfaces:**
- Produces: `public.blocks` now has `icon_name` (text, nullable) and `color_theme` (text, nullable).

- [ ] **Step 1: Write the migration file**

```sql
-- 1. Tambahkan kolom visual ke tabel blocks
ALTER TABLE public.blocks
ADD COLUMN icon_name text,
ADD COLUMN color_theme text;

-- 2. Hapus data lama
-- (Note from Controller: We decided not to delete the existing blocks/questions to avoid data loss. Just add the columns.)
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations
git commit -m "feat: add icon and color columns to blocks table"
```
