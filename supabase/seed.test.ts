import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const seedPath = resolve(dirname(currentFilePath), "seed.sql");
const seedSql = readFileSync(seedPath, "utf8");

describe("supabase seed", () => {
  test("seeds auth.identities with uuid ids and text provider ids", () => {
    expect(seedSql).toMatch(
      /insert into auth\.identities[\s\S]*\(\s*admin_user_id,\s*admin_user_id::text,\s*admin_user_id,/i,
    );
    expect(seedSql).toMatch(
      /insert into auth\.identities[\s\S]*\(\s*pro_user_id,\s*pro_user_id::text,\s*pro_user_id,/i,
    );
    expect(seedSql).toMatch(
      /insert into auth\.identities[\s\S]*\(\s*mentor_user_id,\s*mentor_user_id::text,\s*mentor_user_id,/i,
    );
    expect(seedSql).toMatch(
      /insert into auth\.identities[\s\S]*\(\s*pendaftar_user_id,\s*pendaftar_user_id::text,\s*pendaftar_user_id,/i,
    );
  });

  test("seeds a mentor account with login credentials and mentor role", () => {
    expect(seedSql).toMatch(/mentor_user_id constant uuid := '44444444-4444-4444-4444-444444444444';/i);
    expect(seedSql).toMatch(/'mentor@pawang\.test'/i);
    expect(seedSql).toMatch(/crypt\('Mentor12345!', gen_salt\('bf'\)\)/i);
    expect(seedSql).toMatch(/update public\.profiles\s+set role = 'mentor'\s+where id = mentor_user_id;/i);
  });

  test("marks only diagnosis-approved full tryouts with diagnostic_source = true", () => {
    expect(seedSql).toMatch(
      /insert into public\.exam_templates[\s\S]*diagnostic_source[\s\S]*'tryout-besar'[\s\S]*50,\s*60,\s*true,\s*'published'/i,
    );
    expect(seedSql).toMatch(
      /insert into public\.exam_templates[\s\S]*'clinical-science'[\s\S]*30,\s*40,\s*false,\s*'published'/i,
    );
    expect(seedSql).toMatch(
      /insert into public\.exam_templates[\s\S]*format\('materi-%s', topics\.slug\)[\s\S]*20,\s*30,\s*false,\s*'published'/i,
    );
  });

  test("upserts seeded full and block templates by slug so seed stays compatible with backfilled template rows", () => {
    expect(seedSql).toMatch(
      /insert into public\.exam_templates[\s\S]*'dddddddd-dddd-dddd-dddd-ddddddddd101'[\s\S]*'tryout-besar'[\s\S]*'dddddddd-dddd-dddd-dddd-ddddddddd104'[\s\S]*'social-behavior-administrative'[\s\S]*on conflict\s*\(slug\)\s*do update/i,
    );
  });

  test("resolves seeded template relations by slug so later seed rows survive backfilled template ids", () => {
    expect(seedSql).toMatch(
      /insert into public\.exam_template_items[\s\S]*join public\.exam_templates as template[\s\S]*template\.slug = item\.template_slug/i,
    );
    expect(seedSql).toMatch(
      /insert into public\.attempts[\s\S]*from public\.exam_templates as template[\s\S]*where template\.slug = 'tryout-besar'/i,
    );
  });

  test("seeds Biologi Sel and Bahan Alam Farmasi under their corrected blocks", () => {
    expect(seedSql).toMatch(
      /\('55555555-5555-5555-5555-555555555562',\s*'44444444-4444-4444-4444-444444444441',\s*'biologi-sel',\s*'Biologi Sel',\s*2\)/i,
    );
    expect(seedSql).toMatch(
      /\('55555555-5555-5555-5555-555555555561',\s*'44444444-4444-4444-4444-444444444442',\s*'bahan-alam-farmasi',\s*'Bahan Alam Farmasi',\s*6\)/i,
    );
  });

  test("seeds Clinical Science topics with the refreshed names and alphabetical sort order", () => {
    expect(seedSql).toMatch(
      /\('55555555-5555-5555-5555-555555555552',\s*'44444444-4444-4444-4444-444444444441',\s*'antiinfeksi-antivirus-antiparasit',\s*'Antiinfeksi, Antivirus dan Antiparasit',\s*1\)/i,
    );
    expect(seedSql).toMatch(
      /\('55555555-5555-5555-5555-555555555562',\s*'44444444-4444-4444-4444-444444444441',\s*'biologi-sel',\s*'Biologi Sel',\s*2\)/i,
    );
    expect(seedSql).toMatch(
      /\('55555555-5555-5555-5555-555555555553',\s*'44444444-4444-4444-4444-444444444441',\s*'endokrin-dan-tiroid',\s*'Endokrin dan Tiroid',\s*3\)/i,
    );
    expect(seedSql).toMatch(
      /\('55555555-5555-5555-5555-555555555566',\s*'44444444-4444-4444-4444-444444444441',\s*'farmakokinetik-interaksi-obat-dan-antidotum',\s*'Farmakokinetik, Interaksi Obat dan Antidotum',\s*4\)/i,
    );
    expect(seedSql).toMatch(
      /\('55555555-5555-5555-5555-555555555551',\s*'44444444-4444-4444-4444-444444444441',\s*'kardiologi',\s*'Kardiologi',\s*5\)/i,
    );
    expect(seedSql).toMatch(
      /\('55555555-5555-5555-5555-555555555554',\s*'44444444-4444-4444-4444-444444444441',\s*'mata-kulit-tulang-dan-sendi',\s*'Mata, Kulit, Tulang dan Sendi',\s*6\)/i,
    );
    expect(seedSql).toMatch(
      /\('55555555-5555-5555-5555-555555555555',\s*'44444444-4444-4444-4444-444444444441',\s*'pernafasan-dan-pencernaan',\s*'Pernafasan dan Pencernaan',\s*7\)/i,
    );
  });
});
