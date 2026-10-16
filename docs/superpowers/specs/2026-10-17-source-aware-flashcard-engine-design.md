# Spesifikasi Desain: Source-Aware Flashcard Engine, BYOK, dan Migrasi Gemini 3.8 Flash

**Status:** Draft Disetujui (Menunggu Review Akhir Dokumen)  
**Tanggal:** 2026-10-17  
**Penulis:** AI Architecture Team & Lead Engineer Pawang Masuk Apoteker  
**Scope:** AI Quality Engine (Flash Card Generator & Student AI Insight)  

---

## 1. Ringkasan Eksekutif & Latar Belakang

Sistem pembelajaran Pawang Masuk Apoteker saat ini mengandalkan dua modalitas utama materi perkuliahan:
1. **Slide Presentasi (PDF):** Hasil ekspor PowerPoint (PPT) mentor yang memuat struktur materi, tabel perbandingan, formula farmasetika, alur terapi, dan referensi visual.
2. **Transkrip Rekaman Kelas Online (Teks):** Rekaman audio-ke-teks (ASR) yang memuat elaborasi lisan mentor, studi kasus di rumah sakit, penekanan ujian UKAI/OSCE, dan sesi tanya jawab interaktif mahasiswa.

Sebelum addendum ini, pipeline flashcard memperlakukan transkrip dan slide secara monolitik dalam satu pemanggilan generik, rentan terhadap noise rekaman (pemeriksaan audio, obrolan non-akademik), distorsi ucapan ASR, serta ketiadaan audit independen atas kontradiksi fakta klinis antara slide dan penjelasan lisan.

Spesifikasi ini menetapkan arsitektur **AI Quality Engine** berbasis 8 tahapan terstruktur dengan model target **`gemini-3.8-flash`**, kepatuhan mutlak terhadap prinsip **Bring Your Own Key (BYOK)**, tata kelola isolasi kredensial pengguna, provenance sumber terverifikasi multi-referensi, pelaporan token usage resmi, serta penegakan pembatasan publikasi (*publish gating*) di level backend terhadap konflik klinis berisiko tinggi.

---

## 2. Keputusan Arsitektur Utama (Architectural Decision Records)

| ID | Keputusan | Pilihan Terpilih | Rasional & Manfaat |
|---|---|---|---|
| **ADR-01** | Model AI Target | `gemini-3.8-flash` dengan allowlist terisolasi | Memenuhi target generasi model terbaru Google; hemat biaya dan cepat. Terbatas pada Flash Card Generator dan Student AI Insight. |
| **ADR-02** | Isolasi Realtime OSCE Live | Isolasi penuh (tidak diubah) | OSCE Live menggunakan protokol WebSocket streaming audio dua arah pada Live API yang memiliki spesifikasi terpisah; dilarang diubah secara global. |
| **ADR-03** | Skema Penyimpanan Metadata | Kolom `metadata jsonb default '{}'::jsonb` non-destruktif | Menghindari migrasi tabel destruktif; 100% kompatibel dengan data kartu lama; menjaga `front_text` dan `back_text` tetap bersih dari tag teknis. |
| **ADR-04** | Alur Eksekusi Quality Engine | Hybrid (Otomatis saat generate + On-demand di review editor) | Menjamin draf awal memiliki mutu tinggi sebelum dilihat mentor, sekaligus memberi kontrol bagi mentor untuk meminta re-audit setelah kartu diedit manual. |
| **ADR-05** | Penanganan Konflik Substantif | Flagging eksplisit + Blokir publikasi backend | Dilarang keras menebak atau mengubah isi slide diam-diam. Konflik berderajat `critical`/`high` wajib diselesaikan mentor disertai catatan klarifikasi klinis. |
| **ADR-06** | Struktur Knowledge Graph | In-Memory Lightweight Directed Graph di Edge Runtime | Menghindari dependensi graph database eksternal (Neo4j) atau pgvector yang berlebihan untuk skala materi per sesi. |
| **ADR-07** | Siklus Targeted Repair | Dibatasi tepat 1 siklus (*Hard cap 1 cycle*) | Mencegah loop regenerasi tanpa akhir dan pemborosan kuota token BYOK pengguna. |
| **ADR-08** | Akuntansi Token Resmi | Menangkap `promptTokenCount`, `candidatesTokenCount`, `totalTokenCount`, dan `thoughtsTokenCount` | Transparansi penuh rincian pemakaian token dan estimasi biaya per tahap (Cleaning, Generation, Review, Repair). |

---

## 3. Arsitektur Pipeline 8 Tahap AI Quality Engine

```
[1. Source Ingestion] 
     │ Validasi file PDF & transkrip di Supabase Storage, autentikasi JWT, baca Vault secret.
     ▼
[2. Transcript Cleaning & Noise Filtering] 
     │ Tier 1: Normalisasi deterministik aman (stripping ASR tag/timestamp).
     │ Tier 2: Klasifikasi kontekstual (Gemini 3.8 Flash, thinkingLevel: "low"): relevant | noise | uncertain.
     ▼
[3. Concept Mapping] 
     │ Ekstraksi in-memory knowledge graph: domain taksonomi farmasi, subtopik, konsep inti, relasi antar-entitas.
     ▼
[4. PDF-Transcript Alignment & Provenance Tracking] 
     │ Pemetaan halaman PDF (pdfPageIndex & printedSlideNumber) ke segmen transkrip (segmentId).
     │ Deteksi awal konflik fakta vs elaborasi kompatibel.
     ▼
[5. Flashcard Generation] 
     │ Sintesis multimodal (Gemini 3.8 Flash, thinkingLevel: "low"): menghasilkan draf kartu berformat bersih.
     ▼
[6. Independent Reviewer Pass] 
     │ Audit adversarial independen (Gemini 3.8 Flash, thinkingLevel: "medium"):
     │ Evaluasi 3 sumbu: Source Fidelity, Cross-Source Consistency, Clinical/Safety Rigor.
     ▼
[7. Targeted Repair Pass (Maksimal 1 Siklus)] 
     │ Hanya memproses kartu REPAIRABLE_DEFECT (Gemini 3.8 Flash, thinkingLevel: "low").
     │ Re-review deterministik dan semantik. SUBSTANTIVE_CONFLICT tidak ditebak.
     ▼
[8. Final Quality Validation & Persistence] 
     │ Validasi Zod ketat, penyimpanan atomik ke database via RPC terproteksi, pencatatan metrik audit.
```

---

## 4. Rincian Teknis per Tahapan Pipeline

### Tahap 1: Source Ingestion & BYOK Zero-Trust Verification
- **Input:** `materialId` (UUID) dan identitas pengguna terautentikasi (`user_id` dari JWT terverifikasi).
- **Prosedur:**
  1. Verifikasi kepemilikan materi: `flashcard_materials.created_by == user_id` (atau pengguna memiliki wewenang `admin`/`mentor`).
  2. Unduh `slide_pdf` (PDF) dan `transcript` (TXT/Markdown) dari Supabase Storage bucket `flashcard-sources`.
  3. Verifikasi ketersediaan kredensial BYOK: Query ke `user_ai_credentials` memastikan `secret_id` terdaftar untuk `user_id` tersebut.
  4. Ambil API key melalui RPC backend Vault `read_vault_secret`. **Dilarang keras mengekspos API key mentah ke frontend atau mencatatnya di log.**

### Tahap 2: Transcript Cleaning & Noise Filtering
Pembersihan dilakukan dalam dua lapis (*two-tier processing*):
1. **Tier 1 — Normalisasi Deterministik Aman:**
   - Hapus pola timestamp ASR: `\[\d{2}:\d{2}(?::\d{2})?\]`, `\(\d{2}:\d{2}\)`, serta format SRT/VTT.
   - Hapus label pembicara generik: `^(?:Speaker \d+|Mentor|Audience|Host):`.
   - Normalisasi spasi dan baris kosong ganda.
   - Hapus gagap (*stutter*) HANYA pada kata sambung aman (misal: "dan dan", "yang yang").
   - **Aturan Proteksi Negasi:** Dilarang menggunakan regex massal untuk menghapus filler words lisan ("anu", "gitu", "nah", "jadi") jika berdekatan dengan partikel negasi ("tidak", "bukan", "jangan") atau angka/dosis.
2. **Tier 2 — Klasifikasi Kontekstual Semantik:**
   - Transkrip dipecah menjadi segmen berurutan dengan identifier stabil: `seg-001`, `seg-002`, dst.
   - Setiap segmen mempertahankan metadata asal: `rawText`, `timestampSpan`, `lineOffset`.
   - Pemrosesan chunk dibatasi 15–20 segmen per panggilan dengan 1 segmen *sliding context overlap* untuk menjaga kontinuitas kalimat.
   - Model Gemini 3.8 Flash (`thinkingLevel: "low"`) mengklasifikasikan segmen menjadi:
     - `relevant`: Konsep farmasi, mekanisme kerja obat, pedoman klinis, studi kasus nyata, tanya jawab substansial.
     - `noise`: Pemeriksaan teknis audio/video, presensi, link chat Zoom, pengumuman administratif non-materi.
     - `uncertain`: Kalimat terpotong, rujukan samar, atau kecurigaan kesalahan transkripsi ASR (`suspected_transcription_error`).
3. **Clinical Entity Shield:**
   - Filter deterministik memindai keberadaan:
     - Angka & unit dosis (`mg`, `mcg`, `g`, `ml`, `IU`, `tetes`, `%`).
     - Frekuensi/regimen aturan pakai (`1x1`, `prn`, `ac`, `pc`, `subkutan`, `iv`, `po`).
     - Terminologi farmakologi (akhiran `-olol`, `-pril`, `-sartan`, `-statin`, `-mab`, dll.).
   - Segmen yang memuat entitas klinis **DILARANG DIKLASIFIKASIKAN SEBAGAI NOISE**. Jika maknanya ambigu, wajib diklasifikasikan sebagai `uncertain` untuk diverifikasi silang dengan slide PDF.

### Tahap 3 & 4: Concept Mapping, PDF-Transcript Alignment & Provenance Tracking
1. **In-Memory Directed Knowledge Graph:**
   - Didefinisikan dalam memori TypeScript tanpa dependensi database graf eksternal:
     - `ConceptNode`: `{ id, name, academicDomain, hierarchyLevel, attributes }`
     - `ConceptRelation`: `{ sourceId, targetId, relationType: "mechanism_of" | "dosage_for" | "contraindicated_in" | "first_line_for" }`
     - `SourceReference`: Tautan ke `pdfPageIndex` dan `segmentIds`.
2. **Penyelarasan Slide PDF & Transkrip:**
   - Slide PDF berfungsi sebagai *Structural Anchor* (hierarki subtopik, bagan visual, tabel dosis baku).
   - Transkrip bersih berfungsi sebagai *Elaborative Content* (contoh kasus, tips ujian, analogi klinis).
   - Pemisahan penomoran:
     - `pdfPageIndex`: Indeks fisik halaman dokumen PDF (1-based integer).
     - `printedSlideNumber`: Angka slide yang tercetak di halaman presentasi (opsional/nullable).
3. **Multi-Source Provenance Kategori (Zero-Hallucination):**
   Setiap kartu dapat memiliki lebih dari satu referensi sumber (`sourceReferences: SourceReference[]`):
   - `verified_exact`: Bukti klaim dan lokasi sumber fisik terverifikasi secara harfiah pada slide/transkrip.
   - `semantic_match`: Memiliki korelasi semantik kuat dengan halaman slide tertentu, ditandai sebagai inferensi semantik.
   - `transcript_only`: Penjelasan lisan mentor yang valid tetapi tidak terdapat dalam slide PPT.
   - `slide_only`: Informasi visual slide yang tidak sempat dibahas secara lisan.
   - **Aturan Integritas:** Dilarang mengarang halaman, nomor slide, atau timestamp palsu. Jika tidak dapat dipastikan, field diisi `null` dengan status penelusuran terbatas.
4. **Kebijakan & Taksonomi Konflik Sumber:**
   - Kategori konflik substantif: `dosage_discrepancy`, `contraindication_mismatch`, `drug_identity_error`, `formula_conflict`, `clinical_guideline_divergence`.
   - Derajat keparahan:
     - `critical`: Dosis toksik, kontraindikasi fatal, identitas zat aktif keliru.
     - `high`: Perbedaan frekuensi terapi, perbedaan first-line vs second-line, perbedaan parameter lab cutoff.
     - `moderate`: Perbedaan istilah/sinonim kimia minor yang tidak berakibat fatal.
   - Bukti konflik dicatat secara berpasangan: `slideEvidence` vs `transcriptEvidence` lengkap dengan kutipan harfiah dan ID segmen/halaman.
   - Elaborasi lisan yang selaras (*compatible elaboration*) **bukan konflik**.

### Tahap 5: Flashcard Generation
- **Model:** `gemini-3.8-flash` dengan `thinkingLevel: "low"` atau `"medium"`.
- **Format:**
  - `front_text`: Pertanyaan terarah, berbasis pemicu ingatan aktif (*active recall*).
  - `back_text`: Jawaban ringkas, langsung ke inti konsep.
  - **Kebersihan Teks:** `front_text` dan `back_text` dilarang disusupi tag sitasi internal (misal: `[Slide 4]`) atau catatan teknis. Teks sepenuhnya bersih untuk siswa.

### Tahap 6 & 7: Independent Reviewer & Targeted Repair
1. **Audit Adversarial Independen:**
   - Dijalankan pada sesi terpisah dengan `thinkingLevel: "medium"`.
   - Mengevaluasi tiga dimensi secara terpisah:
     - `sourceFidelity`: `"fully_supported"` | `"partially_supported"` | `"unsupported"`.
     - `clinicalVerification`: `"not_assessed"` | `"source_supported_only"` | `"externally_verified"` | `"clinical_review_required"`.
     - `qualityStatus`: `"ACCEPTED"` | `"REPAIRABLE_DEFECT"` | `"SUBSTANTIVE_CONFLICT"` | `"UNSUPPORTED_CLAIM"`.
   - Kartu berstatus `ACCEPTED` hanya menyatakan kesesuaian pedagogis dan keterdukungan sumber, bukan sertifikasi kebenaran medis mutlak.
2. **Targeted Repair (Tepat 1 Siklus):**
   - Hanya kartu dengan `REPAIRABLE_DEFECT` yang dikirim ke prompt perbaikan (misal: perbaikan keterbacaan, penajaman pertanyaan).
   - Kartu `ACCEPTED` tidak dikirim ulang.
   - Kartu `SUBSTANTIVE_CONFLICT` **dilarang ditebak atau diubah oleh AI**; wajib diteruskan ke mentor.
   - Kartu hasil repair melalui re-review deterministik dan semantik:
     - Lolos $\rightarrow$ status `ACCEPTED`.
     - Gagal $\rightarrow$ di-drop atau ditandai `flagged_for_mentor_review`. Siklus repair berhenti (tidak ada siklus kedua).
3. **Audit Trail Klaim yang Ditolak:**
   - Kartu dengan klaim tanpa dasar (`UNSUPPORTED_CLAIM`) tidak dihapus diam-diam.
   - Maksimal 10 draf kartu yang ditolak disimpan dalam `rejectedAuditTrail` pada metadata materi untuk kebutuhan audit mentor.

### Tahap 8: Final Quality Validation & Storage
- Memvalidasi seluruh struktur JSON menggunakan skema Zod sebelum memanggil database.
- Menyimpan subtopik, kartu, metadata provenance, dan laporan audit secara atomik ke PostgreSQL via RPC yang telah diperbarui.

---

## 5. Keamanan BYOK, Pengelolaan Model & Akuntansi Token

### A. Protokol Autentikasi Kredensial
1. Mengambil `user_id` secara aman dari subjek token JWT (`auth.uid()`).
2. Edge function memverifikasi kepemilikan kredensial di `public.user_ai_credentials` sebelum mengeksekusi fungsi Vault.
3. Kredensial API key Gemini tidak pernah dikirim ke browser; browser hanya menerima metadata hint (`••••1234`).
4. Dilarang mengganti API key pengguna dengan API key platform secara diam-diam.

### B. Migrasi dan Allowlist Model Gemini 3.8 Flash
1. Allowlist model awal dibatasi secara ketat:
   ```ts
   export const SUPPORTED_AI_MODELS = ["gemini-3.8-flash"] as const;
   export const DEFAULT_AI_MODEL = "gemini-3.8-flash";
   ```
2. Nilai model lawas (`gemini-3.7-flash` atau `gemini-2.5-flash`) yang tersimpan di baris pengguna dinormalisasi secara otomatis saat runtime ke `gemini-3.8-flash` tanpa menghapus data atau mereset API key pengguna.
3. Form AI Config (`src/pages/app/ai-config-page.tsx`) disinkronkan untuk menampilkan dan menyimpan `gemini-3.8-flash`.

### C. Akuntansi Token Resmi (Google API Usage Schema)
Modifikasi pada `supabase/functions/_shared/gemini-client.ts` untuk menangkap struktur resmi Google API:
```ts
export type GeminiUsageMetadata = {
  isAvailable: boolean;
  promptTokenCount: number | null;
  candidatesTokenCount: number | null;
  totalTokenCount: number | null;
  thoughtsTokenCount: number | null;
  statusText?: string;
};
```
- Jika Google API tidak mengembalikan token usage (misal mock testing atau error transient), dicatat status `{ isAvailable: false, status: "NOT_RETURNED_BY_PROVIDER" }`.
- Perhitungan estimasi biaya dihitung menggunakan komponen terpisah:
  $$\text{Biaya} = (\text{promptTokenCount} \times \text{Tarif Input}) + ((\text{candidatesTokenCount} + \text{thoughtsTokenCount}) \times \text{Tarif Output})$$

### D. Taksonomi Error & Kebijakan Retry
- **`INVALID_API_KEY` (400/401/403 spesifik autentikasi):** Langsung gagal, catat error di `user_ai_credentials.last_error`. Tanpa retry.
- **`MODEL_ACCESS_DENIED`:** API key tidak memiliki izin model `gemini-3.8-flash`. Tanpa retry.
- **`QUOTA_OR_RATE_LIMIT` (429):** Tunggu backoff transient (1 kali retry); jika kuota akun pengguna habis, kembalikan pesan jelas bahwa saldo/kuota Gemini habis.
- **`TRANSIENT_SERVER_ERROR` (500, 502, 503, 504):** Exponential backoff maksimal 2 kali percobaan.
- **`OUTPUT_TRUNCATION` (finishReason: MAX_TOKENS):** Coba ulang 1 kali dengan ruang token output dinaikkan.

---

## 6. Perubahan Database, RPC, API & Frontend

### A. Skema Database (Migrasi SQL Idempoten)
File migrasi: `supabase/migrations/20261017000050_source_aware_flashcard_engine.sql`

```sql
-- 1. Tambah kolom metadata pada flashcard_materials
alter table public.flashcard_materials
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- 2. Tambah kolom metadata pada flashcard_cards
alter table public.flashcard_cards
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- 3. Update default model user_ai_credentials
alter table public.user_ai_credentials
  alter column model set default 'gemini-3.8-flash';

-- 4. RPC Penggantian Konten Atomik dengan Dukungan Metadata
create or replace function public.replace_flashcard_material_content(
  target_material_id uuid,
  target_owner_id uuid,
  target_subtopics jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actual_owner_id uuid;
begin
  if target_subtopics is null or jsonb_typeof(target_subtopics) <> 'array' or jsonb_array_length(target_subtopics) = 0 then
    raise exception 'Flash card subtopics payload is required.';
  end if;

  select created_by into actual_owner_id
  from public.flashcard_materials
  where id = target_material_id;

  if actual_owner_id is null then
    raise exception 'Flash card material not found.';
  end if;

  if actual_owner_id <> target_owner_id then
    raise exception 'Flash card material is not owned by the provided mentor.';
  end if;

  -- Hapus subtopik lama (cascade menghapus cards lama secara atomik dalam transaksi)
  delete from public.flashcard_subtopics
  where material_id = target_material_id;

  with inserted_subtopics as (
    insert into public.flashcard_subtopics (
      material_id,
      title,
      summary,
      sort_order
    )
    select
      target_material_id,
      trim(subtopic_payload ->> 'title'),
      trim(subtopic_payload ->> 'summary'),
      subtopic_order::integer
    from jsonb_array_elements(target_subtopics) with ordinality as subtopic(subtopic_payload, subtopic_order)
    returning id, sort_order
  )
  insert into public.flashcard_cards (
    subtopic_id,
    front_text,
    back_text,
    sort_order,
    metadata
  )
  select
    inserted_subtopics.id,
    trim(card_payload ->> 'front_text'),
    trim(card_payload ->> 'back_text'),
    card_order::integer,
    coalesce(card_payload -> 'metadata', '{}'::jsonb)
  from inserted_subtopics
  inner join jsonb_array_elements(target_subtopics) with ordinality as subtopic(subtopic_payload, subtopic_order)
    on inserted_subtopics.sort_order = subtopic_order::integer
  inner join jsonb_array_elements(subtopic.subtopic_payload -> 'cards') with ordinality as card(card_payload, card_order)
    on true;
end;
$$;

revoke all on function public.replace_flashcard_material_content(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.replace_flashcard_material_content(uuid, uuid, jsonb) to service_role;
```

### B. Penegakan Otoritatif Backend pada Publikasi (Publish Gating)
Pada fungsi Edge Function `publishFlashCardMaterial` atau RPC pendukung:
- Memeriksa langsung data otoritatif pada `flashcard_materials.metadata -> 'sourceConflicts'`:
  ```ts
  const unresolvedCriticalOrHigh = (material.metadata?.sourceConflicts ?? []).filter(
    (conflict) => (conflict.severity === "critical" || conflict.severity === "high") && conflict.resolutionStatus === "unresolved"
  );
  if (unresolvedCriticalOrHigh.length > 0) {
    throw new HttpError(400, "UNRESOLVED_SOURCE_CONFLICT", 
      `Materi tidak dapat dipublikasikan karena terdapat ${unresolvedCriticalOrHigh.length} konflik sumber klinis (derajat critical/high) yang belum diselesaikan mentor.`
    );
  }
  ```
- Aturan ini berlaku mutlak pada backend, menggagalkan pemanggilan API langsung meskipun UI dimanipulasi.

### C. Kontrak Tipe TypeScript

```ts
export type SourceReference = {
  sourceKind: "verified_exact" | "semantic_match" | "transcript_only" | "slide_only";
  pdfPageIndex: number | null;
  printedSlideNumber?: number | null;
  segmentId?: string | null;
  alignmentConfidence: "high" | "medium" | "low";
  alignmentEvidence?: string;
};

export type CardMetadata = {
  sourceReferences: SourceReference[];
  clinicalVerification: "not_assessed" | "source_supported_only" | "externally_verified" | "clinical_review_required";
  qualityStatus: "ACCEPTED" | "REPAIRABLE_DEFECT" | "SUBSTANTIVE_CONFLICT" | "UNSUPPORTED_CLAIM";
  conflictRefId?: string | null;
  cardType?: "recall" | "clinical_vignette" | "formula_calc" | "adverse_effect";
};

export type SourceConflictRecord = {
  conflictId: string;
  conceptId: string;
  category: "dosage_discrepancy" | "contraindication_mismatch" | "drug_identity" | "formula_conflict" | "clinical_guideline";
  severity: "critical" | "high" | "moderate";
  slideEvidence: {
    pdfPageIndex: number | null;
    printedSlideNumber?: number | null;
    exactQuote: string;
  };
  transcriptEvidence: {
    segmentId: string;
    exactQuote: string;
  };
  distinctionType: "substantive_contradiction";
  resolutionStatus: "unresolved" | "mentor_clarified" | "externally_verified";
  clinicalClarificationNotes?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
};

export type MaterialMetadata = {
  pipelineVersion: "gemini-3.8-source-aware-v1";
  modelUsed: "gemini-3.8-flash";
  executionDurationMs: number;
  tokenUsage: {
    cleaning: StageTokenMetrics;
    generation: StageTokenMetrics;
    reviewer: StageTokenMetrics;
    repair: StageTokenMetrics;
    cumulativeTotal: StageTokenMetrics;
  };
  qualityReport: {
    totalCardsGenerated: number;
    acceptedCount: number;
    repairedCount: number;
    droppedCount: number;
    conflictsCount: number;
    unresolvedCriticalConflicts: number;
  };
  sourceConflicts: SourceConflictRecord[];
  rejectedAuditTrail: Array<{
    draftFront: string;
    rejectionReason: string;
    triggerSourceId?: string;
  }>;
};
```

### D. Pembaruan Antarmuka Pengguna (UI Updates)
1. **`src/pages/app/ai-config-page.tsx`:**
   - Memperbarui teks panduan: *"Model bawaan (`gemini-3.8-flash`) aktif untuk Student AI Insight dan Flash Card Generator."*
   - Payload simpan menetapkan default `model: "gemini-3.8-flash"`.
2. **`src/components/flash-cards/flash-card-review-editor.tsx`:**
   - **Badge Multi-Provenance Visual:** Menampilkan pill referensi (misal: `[Slide Hal. 4]` dan `[Transkrip seg-022]`).
   - **Panel Penyelesaian Konflik Sumber:**
     - Menampilkan kartu berkonflik dalam kotak bergaris amber.
     - Menyediakan tombol pembanding: *"Gunakan Klaim Slide"*, *"Gunakan Klaim Transkrip"*, atau *"Kustomisasi Jawaban"*.
     - Menyediakan input textarea wajib: *"Catatan Klarifikasi Klinis Mentor"*.
   - **Gating Tombol "Terbitkan untuk Siswa":**
     - Dinonaktifkan dengan tooltip peringatan jika masih ada konflik berderajat `critical`/`high` yang belum diselesaikan.
   - **Tombol Hybrid "Audit & Perbaiki Kualitas AI":**
     - Memungkinkan mentor memicu audit ulang terhadap draf hasil edit manual.
   - **Panel Metrik AI & Biaya:**
     - Menampilkan token input, output, thinking (`thoughtsTokenCount`), serta total latensi eksekusi.

---

## 7. Rencana Pengujian & Kriteria Penerimaan (Acceptance Criteria)

### A. Rencana Pengujian
1. **Unit Tests (Vitest):**
   - Normalisasi regex deterministik: stripping timestamp tanpa memotong kata negasi klinis.
   - Clinical Entity Shield: memverifikasi segmen berisi dosis tidak pernah terbuang ke `noise`.
   - Parsing token usage: memverifikasi `thoughtsTokenCount` terekam jika dikembalikan API Google.
   - Gating backend: memverifikasi RPC/Edge Function menolak penerbitan materi yang memiliki konflik kritis `unresolved`.
2. **Integration Tests (Edge Functions dengan Mock Gemini Provider):**
   - Menguji alur 8 tahap dari PDF + Transkrip mentah hingga hasil draf tersimpan di database.
   - Menguji targeted repair tepat 1 siklus: kartu lolos menjadi `ACCEPTED`, kartu gagal di-drop/flagged.
   - Menguji isolasi kredensial: memverifikasi pemanggilan ditolak jika `user_id` tidak memiliki hak atas `materialId`.
3. **Regression Tests:**
   - Memastikan pengujian suite kartu lama (`flash-card-generator/index.test.ts`) tetap 100% lulus.
   - Memastikan suite tes `use-gemini-live` dan modul OSCE Live tetap utuh dan lulus.

### B. Kriteria Penerimaan (Checklist Penyelesaian)
- [ ] Dua sumber materi (PDF slide PPT dan Transkrip teks) terbukti diproses sebagai pasangan saling melengkapi.
- [ ] Transkrip dibersihkan dari noise tanpa menghapus entitas farmasi, dosis, atau contoh klinis.
- [ ] Nomor halaman PDF (`pdfPageIndex`) dan segmen transkrip (`segmentId`) terlacak jujur tanpa sitasi palsu.
- [ ] Konflik substantif antara slide dan transkrip ditandai eksplisit dan diblokir dari publikasi sebelum ada verifikasi mentor.
- [ ] Model `gemini-3.8-flash` digunakan secara konsisten pada Flash Card Generator dan Student AI Insight.
- [ ] Fitur realtime OSCE Live tetap stabil menggunakan jalur Live API aslinya.
- [ ] Kredensial BYOK tetap aman di Vault; tidak ada kebocoran API key mentah ke browser atau log server.
- [ ] Token input, output, dan thinking (`thoughtsTokenCount`) tercatat transparan per tahap.
- [ ] Seluruh migrasi database bersifat non-destruktif dan data lama tetap terbaca sempurna.

---

## 8. Asumsi & Keterbatasan yang Belum Diverifikasi

1. **Ketersediaan `thoughtsTokenCount` di Seluruh Endpoint Google:**
   - Respons API Google Gemini 3.8 Flash biasanya menyertakan `thoughtsTokenCount` di bawah `candidatesTokensDetails`. Jika pada API key tertentu atau region tertentu field ini tidak disertakan, sistem mengantisipasinya dengan mencatat `null` dan menandai status `OMITTED_BY_PROVIDER` tanpa menyebabkan kegagalan sistem.
2. **Keterbacaan Visual PDF Slide:**
   - Diasumsikan file PDF hasil ekspor PPT memiliki resolusi yang memadai untuk diproses multimodal oleh Gemini 3.8 Flash. Jika terdapat slide yang berupa foto buram/rusak, sistem menandai segmen tersebut sebagai `unanchored` atau `unreadable_slide` tanpa mengarang teks slide.
3. **Ekstensi DB Vault Lokal:**
   - Pengujian integrasi lokal mengasumsikan RPC Supabase Vault (`create_vault_secret`, `read_vault_secret`) aktif sesuai konfigurasi docker/local Supabase repository ini.
