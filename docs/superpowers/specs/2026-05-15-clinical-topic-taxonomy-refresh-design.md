# Clinical Topic Taxonomy Refresh Design

**Goal**

Rename the Clinical Science topic `Respirasi dan Pernafasan` to `Pernafasan dan Pencernaan`, add a new Clinical Science topic `Farmakokinetik, Interaksi Obat dan Antidotum`, and keep admin taxonomy, upload guidance, and student tryout catalog aligned from the same backend source of truth.

**Scope**

- Update the canonical Supabase taxonomy data through a forward-only migration.
- Keep the stable topic id for the renamed topic so existing tagged rows continue to resolve correctly.
- Insert the new Clinical Science topic as a distinct taxonomy row.
- Re-sort Clinical Science topics alphabetically via `sort_order` so editor selectors and tryout cards stay consistent.
- Sync the local seed and upload guidance with the new taxonomy.
- Remove hardcoded topic-count copy from the student catalog so the UI remains accurate when taxonomy changes.

**Out of Scope**

- Auto-publishing new tryout templates for the new topic.
- Retrofitting legacy CSV aliases unless a compatibility need appears later.

**Data Design**

- Rename topic id `55555555-5555-5555-5555-555555555555` to slug `pernafasan-dan-pencernaan` with name `Pernafasan dan Pencernaan`.
- Insert a new topic row under block `Clinical Science` for `Farmakokinetik, Interaksi Obat dan Antidotum`.
- Reset Clinical Science `sort_order` alphabetically to:
  1. Antiinfeksi, Antivirus dan Antiparasit
  2. Biologi Sel
  3. Endokrin dan Tiroid
  4. Farmakokinetik, Interaksi Obat dan Antidotum
  5. Kardiologi
  6. Mata, Kulit, Tulang dan Sendi
  7. Pernafasan dan Pencernaan

**Application Design**

- Admin tagging continues to read taxonomy rows from Supabase, so the renamed and new topics flow into selectors without mapper changes.
- Student tryout topic cards continue to flow from taxonomy-driven catalog entries; the new topic appears automatically and stays disabled until a published template and enough valid questions exist.
- The topic section copy on the catalog page should derive its count from the grouped topic data instead of hardcoding `15 materi`.

**Verification**

- Add failing tests first for seed taxonomy expectations, migration contents, and topic count copy on the catalog page.
- Run focused Vitest coverage for seed, migration, mapper, catalog page, and question-authoring taxonomy fixtures.
- Run `npm run build` before declaring completion.
