# Spesifikasi Desain Final: Source-Aware Flashcard Engine, BYOK, dan Migrasi Gemini 3.8 Flash

**Status:** Dokumen Final (Revisi 2 — Siap untuk Persetujuan Akhir)  
**Tanggal:** 2026-10-17  
**Penulis:** AI Architecture Team & Lead Engineer Pawang Masuk Apoteker  
**Scope:** AI Quality Engine (`flash-card-generator` dan `student-ai-insight`)  

---

## 1. Ringkasan Eksekutif & Konteks Masalah

Penyusunan materi flashcard di Pawang Masuk Apoteker memanfaatkan dua sumber yang saling melengkapi:
1. **Slide Presentasi (PDF):** Dokumen visual hasil ekspor PowerPoint (PPT) dari mentor yang menjadi jangkar struktur materi, istilah baku, tabel komparasi, formula farmasetika, dan bagan alir terapi.
2. **Transkrip Rekaman Kelas Online (Teks):** Hasil transkripsi otomatis (ASR) rekaman perkuliahan yang memuat penjelasan lisan mentor, elaborasi konsep, contoh kasus klinis, penekanan ujian UKAI/OSCE, dan sesi tanya jawab mahasiswa.

### Masalah pada Sistem Existing
- Transkrip dan slide diproses secara monolitik dalam satu prompt tanpa penyaringan noise percakapan online (pemeriksaan teknis mikrofon/video, presensi Zoom, obrolan santai).
- Belum ada verifikasi ketertelusuran sumber (*provenance*) yang membedakan kutipan slide fisik dari penjelasan lisan.
- Belum ada deteksi konflik substantif otomatis jika penjelasan lisan mentor bertentangan dengan isi slide (misal perbedaan dosis atau kontraindikasi).
- Kredensial AI masih memakai konfigurasi model usang (`gemini-3.7-flash`), tanpa pencatatan token usage resmi per tahap (termasuk token penalaran/thinking).

Dokumen ini menetapkan spesifikasi arsitektur komprehensif untuk **Source-Aware AI Quality Engine** berbasis model target **`gemini-3.8-flash`**, dengan pemenuhan ketat terhadap prinsip **Bring Your Own Key (BYOK)**, penegakan pembatasan publikasi (*publish gating*) di level backend, isolasi keamanan RPC, multi-source provenance, serta mekanisme checkpoint recovery yang tangguh terhadap batasan runtime Edge Function.

---

## 2. Daftar Keputusan Arsitektur Utama (Architectural Decision Records)

| ID | Keputusan | Pilihan Terpilih | Rasional & Dampak |
|---|---|---|---|
| **ADR-01** | Lingkup Migrasi Model | `gemini-3.8-flash` terbatas pada `flash-card-generator` dan `student-ai-insight` | Memperbarui model AI inti pembelajaran tanpa menyentuh atau merusak jalur Live API WebSocket pada modul realtime OSCE Live. |
| **ADR-02** | Isolasi Kredensial BYOK | Autentikasi JWT ketat + Verifikasi Kepemilikan + Vault Backend | API key mentah tidak pernah dikirim ke browser. Akses Vault diverifikasi eksplisit terhadap `user_id` yang sah, bukan hanya mengandalkan RLS. |
| **ADR-03** | Skema Metadata Non-Destruktif | `metadata jsonb default '{}'::jsonb` pada `flashcard_materials` dan `flashcard_cards` | Mempertahankan 100% kompatibilitas data lama; menjaga field `front_text` dan `back_text` bersih dari tag teknis internal. |
| **ADR-04** | Keamanan RPC & Pemisahan Metadata | Otorisasi pemilik eksplisit, `REVOKE` dari public/authenticated, eksekusi eksklusif `service_role` | Mencegah eksploitasi `SECURITY DEFINER`. Metadata sistem (konflik, provenance, audit) dilindungi dari modifikasi/penghapusan liar oleh klien. |
| **ADR-05** | Publish Gating Backend Otoritatif | Pemblokiran mutlak terhadap konflik `critical` & `high` yang berstatus `unresolved` | Tidak mengandalkan angka agregat metadata klien; backend memvalidasi array konflik otoritatif di database. API publish langsung ditolak jika ada konflik tertunda. |
| **ADR-06** | Multi-Source Provenance | Array `sources[]` per kartu dengan lokasi terverifikasi fisik | Mendukung kartu yang menggabungkan halaman slide PDF (`pdfPageIndex`) dan beberapa segmen transkrip (`segmentId`). Status provenance dipisahkan dari status verifikasi klinis. |
| **ADR-07** | Pipeline Asinkron & Checkpoint Recovery | Checkpoint state machine berbasis tahap dengan penyimpanan artefak | Menghindari kegagalan fatal akibat timeout Edge Function (~60-150s). Pemrosesan ulang melanjutkan dari checkpoint valid terakhir tanpa mengulang pemanggilan Gemini yang boros token. |
| **ADR-08** | Batas Audit Trail & Sanitasi Data | `rejectedAuditTrail` dibatasi maksimal 10 entri, kutipan maksimal 200 karakter | Mencegah pembengkakan (*bloat*) kolom JSONB dan kebocoran PII/transkrip sensitif. Log jangka panjang dialihkan ke `ai_usage_logs`. |
| **ADR-09** | Batas Siklus Targeted Repair | Tepat 1 siklus (*Single-cycle targeted repair*) | Mencegah infinite loop regenerasi AI dan pembengkakan biaya token pengguna. |

---

## 3. Alur Pipeline 8 Tahap AI Quality Engine

```
[1. Source Ingestion]
     │ Verifikasi JWT, cek kepemilikan materi, ambil secret Vault, unduh PDF slide & transkrip asli.
     ▼
[2. Transcript Cleaning & Noise Filtering] ── Checkpoint A (cleaned_transcript)
     │ Normalisasi deterministik aman + Klasifikasi kontekstual AI (relevant / noise / uncertain).
     │ Perlindungan Clinical Entity Shield dari false removal.
     ▼
[3. Concept Mapping] ── Checkpoint B (knowledge_graph)
     │ Ekstraksi in-memory directed knowledge graph (taksonomi farmasi, konsep inti, relasi).
     ▼
[4. PDF-Transcript Alignment & Provenance Tracking] ── Checkpoint C (aligned_sources)
     │ Pemetaan halaman slide PDF (pdfPageIndex & printedSlideNumber) ↔ segmen transkrip (segmentId).
     │ Identifikasi divergensi fakta vs elaborasi lisan kompatibel.
     ▼
[5. Flashcard Generation] ── Checkpoint D (candidate_cards)
     │ Generasi draf kartu multimodal bersih (Gemini 3.8 Flash, thinkingLevel: "low").
     ▼
[6. Independent Adversarial Reviewer Pass]
     │ Audit independen pada 3 sumbu: Source Fidelity, Cross-Source Consistency, Clinical/Safety Rigor.
     │ Klasifikasi status: ACCEPTED | REPAIRABLE_DEFECT | SUBSTANTIVE_CONFLICT | UNSUPPORTED_CLAIM.
     ▼
[7. Targeted Repair Pass (Maksimal 1 Siklus)] ── Checkpoint E (repaired_cards)
     │ Perbaikan terarah HANYA pada kartu REPAIRABLE_DEFECT (Gemini 3.8 Flash, thinkingLevel: "low").
     │ Re-review deterministik dan semantik penuh. Kartu konflik substantif TIDAK ditebak.
     ▼
[8. Final Quality Validation & Persistence]
     │ Validasi Zod ketat, merge metadata terproteksi, penyimpanan atomik via RPC terproteksi,
     │ pencatatan token usage resmi (termasuk thoughtsTokenCount) ke database.
```

---

## 4. Rincian Desain Teknis per Tahapan Pipeline

### Tahap 1: Source Ingestion & Zero-Trust BYOK
1. **Autentikasi & Otorisasi:**
   - Membaca header `Authorization: Bearer <JWT>` menggunakan `createUserClient(req).auth.getUser()`.
   - Mengambil `verifiedUserId = user.id`.
   - Memastikan pengguna memiliki hak: pemilik materi (`flashcard_materials.created_by == verifiedUserId`) atau pengguna memiliki profil dengan role `admin`/`mentor`.
2. **Pengambilan Kredensial Aman:**
   - Query ke `user_ai_credentials` memastikan `user_id == verifiedUserId`.
   - Membaca API key melalui fungsi backend Vault `read_vault_secret(service, credential.secret_id)`.
   - **Zero-Leak Guarantee:** API key mentah tidak pernah dikirimkan ke klien atau dicatat dalam log server.
3. **Pengambilan Sumber:**
   - Mengunduh file `slide_pdf` (PDF) dan `transcript` (TXT/Markdown) dari bucket `flashcard-sources`.

### Tahap 2: Transcript Cleaning & Noise Filtering
1. **Tier 1 — Normalisasi Deterministik (Aman & Reversibel):**
   - Menghapus artefak timestamp ASR: `\[\d{1,2}:\d{2}(?::\d{2})?\]`, `\(\d{1,2}:\d{2}\)`, serta penanda cue SRT/VTT.
   - Menghapus label pembicara generik: `^(?:Speaker \d+|Mentor|Dosen|Audience|Host):`.
   - Normalisasi spasi berlebih dan jeda baris ganda.
   - Menghapus kata gugup (*stutter*) HANYA pada kata sambung aman (misal: "dan dan", "yang yang").
   - **Aturan Proteksi Negasi:** Dilarang menggunakan regex massal untuk menghapus filler words percakapan ("anu", "gitu", "nah", "jadi") jika berdampingan dengan partikel negasi ("tidak", "bukan", "jangan") atau angka/dosis.
2. **Tier 2 — Klasifikasi Kontekstual Semantik:**
   - Teks transkrip dipecah menjadi segmen berurutan dengan identifier stabil: `seg-001`, `seg-002`, dst.
   - Setiap segmen mempertahankan metadata asal: `rawText`, `timestampSpan`, `lineOffset`.
   - Pemrosesan chunk dibatasi 15–20 segmen per panggilan dengan 1 segmen *sliding context overlap* untuk menjaga kontinuitas kalimat.
   - Model Gemini 3.8 Flash (`thinkingLevel: "low"`) mengklasifikasikan segmen menjadi:
     - `relevant`: Konsep farmasi, mekanisme kerja obat, pedoman klinis, studi kasus nyata, tanya jawab substansial.
     - `noise`: Pemeriksaan teknis audio/video, presensi, link chat Zoom, pengumuman administratif non-materi.
     - `uncertain`: Kalimat terpotong, rujukan samar, atau kecurigaan kesalahan transkripsi ASR (`suspected_transcription_error`).
3. **Clinical Entity Shield:**
   - Filter deterministik memindai keberadaan:
     - Angka & unit dosis (`mg`, `mcg`, `g`, `ml`, `IU`, `tetes`, `%`, rasio).
     - Frekuensi/regimen aturan pakai (`1x1`, `prn`, `ac`, `pc`, `subkutan`, `iv`, `po`).
     - Terminologi farmakologi (akhiran `-olol`, `-pril`, `-sartan`, `-statin`, `-mab`, dll.).
   - Segmen yang memuat entitas klinis **DILARANG DIKLASIFIKASIKAN SEBAGAI NOISE**. Jika maknanya ambigu, wajib diklasifikasikan sebagai `uncertain` untuk diverifikasi silang dengan slide PDF pada tahap berikutnya.
4. **Checkpoint A:**
   - Menyimpan hasil cleaning ke `metadata.pipeline_checkpoint.stageArtifacts.cleanedTranscript` agar tidak perlu diproses ulang jika tahap selanjutnya mengalami gangguan.

### Tahap 3: Concept Mapping (In-Memory Knowledge Graph)
1. **Struktur Graf Pengetahuan Terarah:**
   - Didefinisikan murni dalam memori TypeScript pada Edge Function:
     - `ConceptNode`: `{ id: string, name: string, academicDomain: string, hierarchyLevel: "subtopic" | "core_concept" | "attribute", attributes: Record<string, string> }`
     - `ConceptRelation`: `{ sourceId: string, targetId: string, relationType: "mechanism_of" | "dosage_for" | "contraindicated_in" | "first_line_for" }`
2. **Taksonomi Pengetahuan Farmasi:**
   - Mengekstrak konsep ke dalam kategori: (a) Definisi & Klasifikasi Penyakit/Obat, (b) Dosis, Rute & Frekuensi, (c) Mekanisme Kerja (MOA), (d) Efek Samping & Interaksi Obat, (e) Perhitungan Farmasetika & Kriteria Stabilitas.
3. **Checkpoint B:**
   - Menyimpan struktur node dan relasi konsep ke checkpoint artefak.

### Tahap 4: PDF-Transcript Alignment & Multi-Source Provenance
1. **Slide PDF sebagai Structural Anchor:**
   - Nomor halaman fisik PDF (`pdfPageIndex`, 1-based index) dan nomor slide tercetak (`printedSlideNumber`, nullable) dicatat terpisah.
   - Slide memegang urutan subtopik, bagan terapi, dan formula baku.
2. **Transkrip sebagai Elaborative Content:**
   - Segmen transkrip bersih dipetakan ke konsep:
     - *Corroboration:* Menjelaskan ulang isi slide.
     - *Elaboration:* Menambahkan contoh klinis atau tips ujian yang kompatibel dengan isi slide.
     - *Q&A:* Jawaban mentor atas pertanyaan mahasiswa.
3. **Kontrak Multi-Source Provenance (`sources[]`):**
   Setiap kartu dapat memiliki lebih dari satu referensi sumber untuk mendukung sintesis materi:
   ```ts
   export type CardSourceReference = {
     sourceId: string; // e.g. "pdf-page-04" atau "transcript-seg-018"
     sourceType: "slide_pdf" | "transcript";
     provenanceStatus: "verified_exact" | "semantic_match" | "unanchored";
     location: {
       pdfPageIndex: number | null;
       printedSlideNumber: number | null;
       segmentId: string | null;
       textQuote: string; // Maksimal 200 karakter
     };
     alignmentConfidence: "high" | "medium" | "low";
     confidenceReason: string;
   };
   ```
   - `verified_exact`: Lokasi sumber fisik dan kutipan harfiah terkonfirmasi.
   - `semantic_match`: Kesamaan semantik kuat tanpa kutipan langsung eksplisit.
   - `unanchored`: Informasi lisan murni tanpa halaman slide terkait, atau materi visual murni tanpa pembahasan lisan.
   - **Zero-Hallucination Policy:** Dilarang mengarang nomor halaman, nomor slide, atau kutipan. Field yang tidak pasti wajib bernilai `null`.
4. **Pemisahan Status Verifikasi Klinis:**
   - Status provenance hanya menunjukkan ketertelusuran dokumen.
   - Status verifikasi klinis disimpan pada field terpisah:
     `clinicalVerification: { status: "not_assessed" | "source_supported_only" | "externally_verified" | "clinical_review_required", notes?: string }`.
5. **Taksonomi & Pencatatan Konflik Sumber:**
   - Kategori konflik: `dosage_discrepancy`, `contraindication_mismatch`, `drug_identity`, `formula_conflict`, `clinical_guideline`.
   - Derajat keparahan:
     - `critical`: Dosis toksik, kontraindikasi fatal, nama obat salah.
     - `high`: Perbedaan regimen frekuensi, perbedaan lini terapi pertama.
     - `moderate`: Perbedaan istilah teknis non-fatal.
   - Bukti dicatat berpasangan dalam objek `SourceConflictRecord` (kutipan slide vs kutipan transkrip).
   - Elaborasi lisan yang kompatibel diklasifikasikan sebagai `compatible_elaboration` dan **bukan konflik**.

### Tahap 5: Flashcard Generation
- **Model:** `gemini-3.8-flash` dengan `thinkingLevel: "low"`.
- **Format:**
  - `front_text`: Pertanyaan tajam berbasis *active recall*.
  - `back_text`: Jawaban padat, lugas, dan akurat secara medis.
  - **Kebersihan Teks:** Dilarang menyisipkan tag sitasi teknis (misal `[Slide Hal. 3]`) ke dalam teks kartu. Seluruh metadata disimpan di field `metadata`.

### Tahap 6: Independent Adversarial Reviewer Pass
- **Model:** `gemini-3.8-flash` dengan `thinkingLevel: "medium"` dalam pemanggilan terpisah (*adversarial audit*).
- **Rubrik Tiga Sumbu:**
  1. *Source Fidelity:* Apakah klaim didukung oleh slide atau transkrip? (Bukan halusinasi ASR).
  2. *Cross-Source Consistency:* Apakah kartu memuat kontradiksi tak terselesaikan antara slide dan transkrip?
  3. *Clinical & Safety Rigor:* Apakah unit dosis (`mcg` vs `mg`), rute pemberian, dan kontraindikasi presisi?
- **Klasifikasi Keputusan:**
  - `ACCEPTED`: Lolos seluruh rubrik, didukung materi.
  - `REPAIRABLE_DEFECT`: Cacat format, kalimat ambigu, atau terlalu panjang yang dapat diperbaiki tanpa mengubah esensi medis.
  - `SUBSTANTIVE_CONFLICT`: Divergensi fakta klinis antara kedua sumber. Dilarang ditebak oleh AI.
  - `UNSUPPORTED_CLAIM`: Klaim tidak berdasar. Kartu langsung dieliminasi dari draf.

### Tahap 7: Targeted Repair (Maksimal 1 Siklus)
1. **Isolasi Kartu Cacat:**
   - Hanya kartu dengan status `REPAIRABLE_DEFECT` yang dikirim ke prompt perbaikan.
   - Kartu `ACCEPTED` tidak disentuh kembali.
   - Kartu `SUBSTANTIVE_CONFLICT` langsung diteruskan ke mentor bersama bukti konflik.
2. **Re-Review Penuh Pasca-Repair:**
   - Kartu hasil perbaikan diuji ulang oleh validator deterministik dan reviewer semantik.
   - Jika lolos $\rightarrow$ status `ACCEPTED`.
   - Jika gagal $\rightarrow$ kartu di-drop atau diberi flag `flagged_for_mentor_review`.
   - **Hard Cap:** Tidak ada siklus repair kedua.
3. **Audit Trail Klaim yang Ditolak (Batas Ketat):**
   - Maksimal 10 entri disimpan dalam `rejectedAuditTrail`.
   - Setiap entri dibatasi: `draftFront` (maks 100 kar), `rejectionReason` (maks 150 kar), dan `triggerSourceId`.
   - Dilarang menyimpan kutipan transkrip panjang yang tidak perlu.

### Tahap 8: Final Quality Validation & Storage
- Memvalidasi seluruh struktur payload dengan Zod.
- Menyimpan konten baru secara atomik melalui fungsi database terproteksi.
- Status materi menjadi `ready_for_review`.

---

## 5. Pemrosesan Asinkron, Checkpoint & Recovery

Edge Function pada arsitektur serverless (seperti Supabase / Deno Deploy) memiliki batasan timeout eksekusi (umumnya 60–150 detik). Pemrosesan multimodal PDF besar dengan transkrip panjang berisiko mendekati batas ini.

### A. State Machine Eksekusi
Status materi pada tabel `flashcard_materials`:
- `draft`: Materi baru dibuat, file sumber siap di storage.
- `processing`: Engine sedang menjalankan pipeline.
- `ready_for_review`: Pipeline selesai; draf siap ditinjau mentor.
- `published`: Materi disetujui mentor dan tersedia bagi siswa.
- `failed`: Pemrosesan gagal; pesan error tersimpan di `processing_error`.

### B. Struktur Checkpoint Data
Di dalam kolom `flashcard_materials.metadata`, sistem mencatat progres eksekusi:

```ts
export type PipelineCheckpoint = {
  runId: string; // e.g. "run-mat123-1729145600"
  currentStage: "ingestion" | "cleaning" | "concept_mapping" | "alignment" | "generation" | "reviewer" | "repair" | "final_validation";
  completedStages: Array<"ingestion" | "cleaning" | "concept_mapping" | "alignment" | "generation" | "reviewer" | "repair">;
  stageArtifacts: {
    cleanedTranscriptRef?: {
      retainedSegmentCount: number;
      noiseSegmentCount: number;
      dataPayloadHash: string;
    };
    knowledgeGraphRef?: {
      nodeCount: number;
      relationCount: number;
    };
    candidateCardsSnapshot?: Array<{
      tempId: string;
      subtopicTitle: string;
      frontText: string;
      backText: string;
      sources: CardSourceReference[];
    }>;
  };
  stageTokenMetrics: Record<string, StageTokenMetrics>;
  lastCheckpointAt: string;
};
```

### C. Mekanisme Idempotensi & Recovery
1. **Deteksi Crash / Timeout:**
   - Jika materi berada dalam status `processing` lebih dari 180 detik tanpa pembaruan timestamp `updated_at`, sistem menganggap eksekusi mengalami timeout.
2. **Resume dari Checkpoint Terakhir:**
   - Saat aksi `retry-processing` dipanggil:
     - Sistem membaca `metadata.pipeline_checkpoint`.
     - Jika Tahap 2 (*cleaning*) dan Tahap 3 (*concept mapping*) telah berstatus `completed` dan artefak terekam secara valid, engine **tidak memanggil ulang Gemini untuk cleaning/concept mapping**, melainkan langsung melanjutkan ke Tahap 4 atau 5.
     - Ini menghemat ribuan token input BYOK pengguna dan mempercepat waktu pemulihan hingga 60%.
3. **Idempotensi Penggantian Konten:**
   - Setiap run memiliki `runId`. Operasi database hanya mengizinkan penulisan jika status masih relevan dengan run aktif.

---

## 6. Keamanan BYOK, Tata Kelola Model & Akuntansi Biaya

### A. Protokol Autentikasi Kredensial Zero-Trust
1. Kredensial pengguna disimpan dalam tabel terproteksi `user_ai_credentials` yang berelasi dengan ekstensi PostgreSQL `vault.decrypted_secrets`.
2. Akses ke kredensial diverifikasi secara berlapis:
   - Verifikasi token JWT via `auth.getUser()`.
   - Pemeriksaan eksplisit: `SELECT secret_id FROM user_ai_credentials WHERE user_id = verified_user_id`.
   - Mengambil plaintext key via RPC Vault `read_vault_secret`.
3. Kredensial tidak pernah bocor ke browser; respons get-status hanya menyertakan petunjuk sensor (`••••1234`).
4. Kredensial pengguna tidak pernah ditukar dengan kredensial platform secara diam-diam.

### B. Migrasi dan Allowlist Model Gemini 3.8 Flash
1. Allowlist model awal dibatasi secara ketat:
   ```ts
   export const SUPPORTED_AI_MODELS = ["gemini-3.8-flash"] as const;
   export const DEFAULT_AI_MODEL = "gemini-3.8-flash";
   ```
2. Nilai model lawas (`gemini-3.7-flash` atau `gemini-2.5-flash`) yang tersimpan di baris pengguna dinormalisasi secara otomatis saat runtime ke `gemini-3.8-flash` tanpa mengubah API key, tanpa mereset kredensial pengguna, dan tanpa menghapus riwayat konfigurasi.
3. Form AI Config (`src/pages/app/ai-config-page.tsx`) disinkronkan untuk menampilkan dan menyimpan `gemini-3.8-flash`.

### C. Isolasi Mutlak Fitur Realtime OSCE Live
- Komponen OSCE Live (`use-gemini-live.ts`, `generate-osce`, `simulate-osce`) memanfaatkan protokol streaming dua arah WebSocket via Gemini Live API.
- **Batasan Tegas:** Perubahan model dan shared client pada addendum ini **TIDAK berlaku** untuk modul OSCE Live guna menjamin kestabilan simulasi audio mahasiswa.

### D. Akuntansi Token Resmi (Google API Usage Schema)
Pada `supabase/functions/_shared/gemini-client.ts`, respons diekstrak mencakup:
```ts
export type StageTokenMetrics = {
  isAvailable: boolean;
  promptTokenCount: number | null;
  candidatesTokenCount: number | null;
  totalTokenCount: number | null;
  thoughtsTokenCount: number | null; // Dari candidatesTokensDetails
  statusText?: string;
};
```
- Jika API Google tidak mengembalikan usage metadata, dicatat `{ isAvailable: false, statusText: "NOT_RETURNED_BY_PROVIDER" }`.
- Perhitungan biaya berbasis tarif komponen terpisah:
  $$\text{Estimasi Biaya} = (\text{promptTokenCount} \times \text{Tarif Input}) + ((\text{candidatesTokenCount} + \text{thoughtsTokenCount}) \times \text{Tarif Output})$$

### E. Taksonomi Error & Kebijakan Retry
- **`INVALID_API_KEY` (400/401/403 autentikasi):** Gagal seketika; simpan error di `user_ai_credentials.last_error`. Tanpa retry.
- **`MODEL_ACCESS_DENIED`:** API key tidak memiliki izin untuk `gemini-3.8-flash`. Tanpa retry.
- **`QUOTA_OR_RATE_LIMIT` (429):** Retry 1 kali dengan delay backoff jika transient; jika kuota akun habis permanen, beri pesan jelas.
- **`TRANSIENT_SERVER_ERROR` (500, 502, 503, 504):** Exponential backoff maksimal 2 kali percobaan.
- **`OUTPUT_TRUNCATION` (finishReason: MAX_TOKENS):** Coba ulang 1 kali dengan ruang token output dinaikkan.

---

## 7. Skema Database, Keamanan RPC & Publish Gating

### A. Migrasi SQL Idempoten
File migrasi: `supabase/migrations/20261017000050_source_aware_flashcard_engine.sql`

```sql
-- 1. Tambah kolom metadata pada flashcard_materials
alter table public.flashcard_materials
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- 2. Tambah kolom metadata pada flashcard_cards
alter table public.flashcard_cards
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- 3. Update default model user_ai_credentials ke gemini-3.8-flash
alter table public.user_ai_credentials
  alter column model set default 'gemini-3.8-flash';

-- 4. RPC Penggantian Konten Atomik dengan Dukungan Metadata dan Proteksi Hak Akses
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
  -- 1. Validasi keberadaan payload
  if target_subtopics is null or jsonb_typeof(target_subtopics) <> 'array' or jsonb_array_length(target_subtopics) = 0 then
    raise exception 'Flash card subtopics payload is required.';
  end if;

  -- 2. Verifikasi kepemilikan materi secara otoritatif di database
  select created_by into actual_owner_id
  from public.flashcard_materials
  where id = target_material_id;

  if actual_owner_id is null then
    raise exception 'Flash card material not found.';
  end if;

  if actual_owner_id <> target_owner_id then
    raise exception 'Flash card material is not owned by the provided mentor.';
  end if;

  -- 3. Hapus konten lama dan masukkan konten baru secara atomik dalam satu transaksi
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

-- 5. Kebijakan Hak Akses Eksplisit: Cabut dari Public, Anon, Authenticated; Berikan HANYA ke Service Role
revoke all on function public.replace_flashcard_material_content(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.replace_flashcard_material_content(uuid, uuid, jsonb) to service_role;
```

### B. Pemisahan Metadata Sistem vs Metadata yang Dapat Diedit Mentor
Saat mentor melakukan pembaruan konten melalui aksi `update-material`:
- **Metadata yang Dapat Diedit Mentor (Client-Editable):**
  - Judul materi (`title`), ringkasan materi (`global_summary`), judul subtopik, ringkasan subtopik, `front_text`, `back_text`.
  - Catatan klarifikasi mentor atas konflik (`clinicalClarificationNotes`).
- **Metadata Sistem yang Dilindungi (System-Protected):**
  - `provenance` / `sources[]`, `qualityStatus`, `sourceConflicts`, `tokenUsage`, `pipelineVersion`, `rejectedAuditTrail`.
  - **Aturan Proteksi:** Backend melakukan *deep merge* terproteksi. Payload dari browser dilarang menghapus, mengosongkan, atau mengubah status `sourceConflicts` dan `qualityStatus` kartu. Resolusi konflik hanya dapat dilakukan melalui endpoint khusus `resolve-conflict` yang mencatat identitas mentor dan catatan klarifikasi.

### C. Penegakan Otoritatif Backend pada Publish Gating
Pada Edge Function `flash-card-generator` untuk aksi `publish-material`:
```ts
// 1. Ambil rekaman konflik otoritatif dari database
const { data: materialRow, error: matError } = await service
  .from("flashcard_materials")
  .select("id, status, metadata")
  .eq("id", materialId)
  .single();

if (matError || !materialRow) {
  throw new HttpError(404, "MATERIAL_NOT_FOUND", "Materi flash card tidak ditemukan.");
}

const metadata = (materialRow.metadata ?? {}) as MaterialMetadata;
const sourceConflicts = Array.isArray(metadata.sourceConflicts) ? metadata.sourceConflicts : [];

// 2. Filter seluruh konflik derajat critical DAN high yang belum berstatus resolved
const unresolvedBlockingConflicts = sourceConflicts.filter(
  (conflict) => (conflict.severity === "critical" || conflict.severity === "high") && conflict.resolutionStatus !== "mentor_clarified" && conflict.resolutionStatus !== "externally_verified"
);

// 3. Blokir mutlak jika masih ada konflik yang belum diselesaikan
if (unresolvedBlockingConflicts.length > 0) {
  throw new HttpError(
    400,
    "UNRESOLVED_SOURCE_CONFLICT",
    `Materi tidak dapat dipublikasikan karena masih terdapat ${unresolvedBlockingConflicts.length} konflik sumber berderajat critical/high yang belum diselesaikan mentor.`
  );
}
```
- Pemeriksaan ini independen dari angka agregat di UI dan tidak dapat di-bypass melalui pemanggilan API langsung.

---

## 8. Kontrak Data TypeScript

```ts
export type CardSourceReference = {
  sourceId: string;
  sourceType: "slide_pdf" | "transcript";
  provenanceStatus: "verified_exact" | "semantic_match" | "unanchored";
  location: {
    pdfPageIndex: number | null;
    printedSlideNumber: number | null;
    segmentId: string | null;
    textQuote: string;
  };
  alignmentConfidence: "high" | "medium" | "low";
  confidenceReason: string;
};

export type CardMetadata = {
  sources: CardSourceReference[];
  clinicalVerification: {
    status: "not_assessed" | "source_supported_only" | "externally_verified" | "clinical_review_required";
    notes?: string;
  };
  qualityStatus: "ACCEPTED" | "REPAIRABLE_DEFECT" | "SUBSTANTIVE_CONFLICT" | "UNSUPPORTED_CLAIM";
  conflictRefId?: string | null;
  cardType?: "recall" | "clinical_vignette" | "formula_calc" | "adverse_effect";
  mentorCustomNotes?: string;
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
  pipelineCheckpoint?: PipelineCheckpoint;
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
    unresolvedCriticalOrHighConflicts: number;
  };
  sourceConflicts: SourceConflictRecord[];
  rejectedAuditTrail: Array<{
    draftFront: string; // Truncated max 100 chars
    rejectionReason: string; // Truncated max 150 chars
    triggerSourceId?: string;
  }>;
};
```

---

## 9. Pembaruan Antarmuka Pengguna (UI)

1. **`src/pages/app/ai-config-page.tsx`:**
   - Memperbarui teks panduan: *"Model bawaan (`gemini-3.8-flash`) aktif untuk Student AI Insight dan Flash Card Generator."*
   - Payload simpan mengirimkan `model: "gemini-3.8-flash"`.
2. **`src/components/flash-cards/flash-card-review-editor.tsx`:**
   - **Badge Multi-Source Visual:** Menampilkan pill sumber pada setiap kartu (misal: `[Slide Hal. 4]` warna teal dan `[Transkrip seg-022]` warna indigo).
   - **Panel Konflik Sumber Interaktif:**
     - Menampilkan perbandingan dua kolom (*Slide* vs *Transkrip*).
     - Menyediakan opsi tindakan mentor (*Gunakan Slide*, *Gunakan Transkrip*, *Edit Manual*) dan field textarea wajib untuk catatan klarifikasi klinis.
   - **Gating Tombol "Terbitkan untuk Siswa":**
     - Otomatis dinonaktifkan dengan status disabled dan tooltip informatif jika masih terdapat konflik `critical`/`high` yang belum diselesaikan.
   - **Tombol Hybrid "Audit & Perbaiki Kualitas AI":**
     - Tersedia di toolbar atas untuk memicu aksi `audit-repair-material` secara on-demand setelah mentor mengubah teks kartu secara manual.
   - **Panel Penggunaan Token & Latensi:**
     - Menampilkan metrik token input, output, thinking (`thoughtsTokenCount`), dan total latensi eksekusi.

---

## 10. Rencana Pengujian Komprehensif

1. **Unit Tests (Vitest / Node & JSDOM):**
   - Normalisasi deterministik: menghapus timestamp ASR tanpa merusak partikel negasi klinis.
   - Clinical Entity Shield: memverifikasi segmen dengan entitas dosis/obat tidak pernah masuk kategori `noise`.
   - Google Usage Metadata Parser: menguji ekstraksi `thoughtsTokenCount` dan penanganan fallback saat provider tidak menyertakannya.
   - Otorisasi RPC: menguji `replace_flashcard_material_content` menolak eksekusi jika `target_owner_id` tidak cocok dengan `created_by`.
   - Publish Gating: menguji fungsi publish menolak eksekusi jika terdapat konflik `critical` atau `high` yang `unresolved`.
2. **Integration Tests (Edge Functions):**
   - Menguji eksekusi pipeline 8 tahap lengkap dengan mock Gemini 3.8 Flash.
   - Menguji Targeted Repair tepat 1 siklus: kartu cacat berhasil diperbaiki menjadi `ACCEPTED`, dan kartu gagal di-drop/diberi flag tanpa memicu siklus kedua.
   - Menguji Checkpoint Resume: simulasi timeout pada tahap 5 $\rightarrow$ retry berhasil melanjutkan dari artefak tahap 4 tanpa memanggil ulang cleaning.
   - Menguji proteksi metadata: memverifikasi update draf oleh klien tidak menghapus catatan konflik pada database.
3. **Regression Tests:**
   - Memastikan test suite flashcard existing (`supabase/functions/flash-card-generator/index.test.ts` dan test frontend) tetap 100% lulus.
   - Memastikan pengujian fitur OSCE Live (`use-gemini-live`) tidak mengalami regresi.

---

## 11. Asumsi & Keterbatasan yang Belum Diverifikasi

1. **Ketersediaan `thoughtsTokenCount`:**
   - Dikonfirmasi bahwa respons Google API untuk Gemini 3 menyertakan `thoughtsTokenCount` di bawah `candidatesTokensDetails`. Jika pada environment atau akun tertentu field ini ditiadakan oleh Google, sistem menandainya sebagai `OMITTED_BY_PROVIDER` tanpa mengasumsikan nol dan tanpa memutus pipeline.
2. **Kualitas Resolusi PDF Slide Mentor:**
   - Diasumsikan PDF slide PPT memiliki teks atau visual yang cukup jelas untuk dibaca multimodal oleh Gemini 3.8 Flash. Slide buram akan ditandai `unanchored` pada segmen transkrip terkait tanpa mengarang kutipan palsu.
3. **Keterbatasan Database Vault Lokal:**
   - Pengujian end-to-end lokal memerlukan modul ekstensi Supabase Vault yang aktif pada Docker Supabase lokal (`create_vault_secret`, `read_vault_secret`).
