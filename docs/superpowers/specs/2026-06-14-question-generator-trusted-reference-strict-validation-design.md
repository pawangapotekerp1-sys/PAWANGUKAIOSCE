# Question Generator Trusted Reference Strict Validation Design

**Context**

Question Generator saat ini masih memakai dua mode variasi yang terlalu dekat satu sama lain, yaitu `copy_concept` dan `paraphrase`. Dalam praktiknya, keduanya sering menghasilkan soal yang terasa seperti rewording ringan, bukan soal yang benar-benar fresh.

Di saat yang sama, produk ingin menaikkan mutu referensi output secara signifikan. Target behavior yang disetujui adalah:
- draft soal tetap dekat dengan topik referensi,
- setiap output generated item wajib membawa tepat satu link utama yang bisa diakses,
- link wajib berasal dari sumber terpercaya dengan allowlist domain ketat,
- link wajib divalidasi dari backend,
- batch generate gagal total bila satu item saja tidak lolos aturan referensi.

Frontend input referensi tetap mempertahankan pustaka sebagai opsional. Kenaikan standar hanya berlaku pada output generated item, bukan pada input referensi mentor/admin.

Gemini structured output contract juga perlu tetap konsisten dengan dokumentasi resmi. Referensi teknis yang dipakai untuk desain ini:
- Context7 `/websites/googleapis_github_io_js-genai`
- `responseMimeType` / `responseSchema`
- catatan bahwa `response_schema` butuh `response_mime_type`
- opsi `responseJsonSchema` bila schema subset OpenAPI bermasalah

**Goals**

- Mengganti mode variasi generator menjadi mode yang benar-benar berbeda secara pedagogis.
- Mengharuskan setiap output soal memiliki satu referensi utama berbasis link `https`.
- Membatasi referensi hanya ke domain terpercaya yang sudah disetujui.
- Memvalidasi akses link dari backend dengan HTTP check dan hanya menerima `2xx`.
- Menggagalkan seluruh batch bila ada satu item yang tidak lolos validasi referensi.

**Non-Goals**

- Menambah crawler sumber eksternal atau sistem retrieval baru.
- Melakukan fallback otomatis ke pencarian referensi dari backend.
- Mengendurkan strict gate menjadi warning-only review state.
- Menerima DOI polos, nama buku, atau homepage umum sebagai pengganti link utama.

**Approved Behavior**

1. Variasi soal output:
- `copy_concept` dan `paraphrase` diganti sepenuhnya.
- Mode baru:
  `new_case_same_concept`
  `different_trap_same_objective`
  `reverse_reasoning`

2. Aturan referensi output:
- Setiap soal wajib memiliki tepat satu `reference.url`.
- URL wajib berupa link `https` penuh.
- URL tidak boleh berupa DOI polos, ISBN, nama buku, atau daftar banyak link.
- URL wajib berasal dari host exact yang ada di allowlist backend.
- URL wajib lolos HTTP accessibility check dari backend dengan respons `2xx`.

3. Kelas sumber yang diizinkan:
- jurnal klinis yang diakses melalui domain allowlist,
- guideline terapi resmi,
- regulasi kesehatan resmi seperti Permenkes.

4. Strict gate:
- Bila satu item gagal validasi referensi, seluruh batch generate gagal.
- Batch yang gagal tidak dipersist ke storage draft generator.

5. Input referensi user:
- Stem, opsi A-E, correct option, dan pembahasan tetap wajib.
- Pustaka pada referensi input tetap opsional.
- Referensi input tetap boleh memakai sitasi buku, sitasi bebas, atau tanpa pustaka sama sekali.

**Variation Model**

Mode variasi yang baru harus dipahami sebagai kontrak behavior, bukan sekadar label:

1. `new_case_same_concept`
- Konsep klinis tetap sama.
- Vignette pasien, urutan informasi, atau konteks kasus diubah.
- Tujuan utamanya adalah memberi rasa baru tanpa drift topik.

2. `different_trap_same_objective`
- Learning objective tetap sama.
- Distraktor dan jebakan jawaban salah diubah.
- Fokus utamanya adalah menyegarkan pola pilihan, bukan hanya narasi stem.

3. `reverse_reasoning`
- Topik inti tetap sama.
- Arah penalaran dibalik.
- Contoh: dari pertanyaan efek samping menjadi identifikasi obat penyebab, kontraindikasi, atau implikasi monitoring yang masih satu kompetensi.

Distribusi mode dapat dibuat seimbang sedekat mungkin terhadap target count, tetapi tidak perlu memaksa pembagian persis sama bila jumlah soal ganjil.

**Output Contract**

Generated item tidak lagi cukup hanya membawa pembahasan bebas. Setiap item wajib mengikuti shape konseptual berikut:

```ts
type GeneratedQuestionItem = {
  stem: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
    E: string;
  };
  correctOptionKey: "A" | "B" | "C" | "D" | "E";
  explanationText: string;
  variationMode:
    | "new_case_same_concept"
    | "different_trap_same_objective"
    | "reverse_reasoning";
  reference: {
    label: string;
    url: string;
  };
};
```

Rules:
- `variationMode` wajib satu dari tiga nilai approved.
- `reference.label` wajib ringkas dan manusiawi untuk reviewer.
- `reference.url` wajib hanya satu string URL penuh.
- Penjelasan teks (`explanationText`) tetap boleh menyebut sumber secara naratif, tetapi tidak lagi menjadi satu-satunya tempat validasi referensi.

**Trusted Domain Allowlist**

Allowlist backend harus disimpan eksplisit sebagai exact host list, bukan regex longgar. Initial list yang disetujui:

- `pubmed.ncbi.nlm.nih.gov`
- `www.ncbi.nlm.nih.gov`
- `www.cochranelibrary.com`
- `www.who.int`
- `kdigo.org`
- `www.escardio.org`
- `perki.id`
- `papdi.or.id`
- `www.kemkes.go.id`
- `jdih.kemkes.go.id`
- `peraturan.bpk.go.id`

Implementation note:
- host matching harus exact match setelah URL diparse,
- subdomain baru tidak otomatis lolos,
- penambahan domain baru harus melalui perubahan backend eksplisit.

**Validation Pipeline**

Validation batch dilakukan berurutan pada backend:

1. Validate structured JSON shape
- output harus berupa array dengan jumlah item tepat sesuai target count,
- setiap item harus memiliki stem, opsi A-E, correct option, explanation, variation mode, dan source object.

2. Validate pedagogical mode
- `variationMode` harus satu dari tiga nilai approved.

3. Validate reference shape
- `reference.url` wajib ada,
- harus tepat satu URL string,
- harus memakai skema `https`,
- tidak boleh berupa domain umum tanpa path dokumen bila prompt/schema bisa mendorong sumber lebih spesifik.

4. Validate trusted host
- parse URL,
- ambil `hostname`,
- reject bila host tidak ada di allowlist exact.

5. Validate accessibility
- backend melakukan HTTP request ringan ke URL,
- hanya respons `2xx` yang diterima,
- status `3xx`, `4xx`, dan `5xx` dianggap gagal,
- tidak ada fallback `403` / `405`,
- tidak ada redirect allowance untuk host di luar allowlist.

6. Fail batch atomically
- bila satu item gagal pada langkah 3-5, seluruh batch dianggap gagal,
- batch tidak dipersist,
- user menerima pesan error yang spesifik.

**Error Model**

Error yang dikembalikan ke UI perlu cukup spesifik untuk debugging dan penggunaan harian:

- `INVALID_REFERENCE_URL_FORMAT`
  Pesan:
  `Generator belum menghasilkan satu link https utama yang valid untuk setiap soal.`

- `REFERENCE_DOMAIN_NOT_ALLOWED`
  Pesan:
  `Generator menghasilkan domain referensi yang tidak termasuk sumber terpercaya yang diizinkan.`

- `REFERENCE_URL_UNREACHABLE`
  Pesan:
  `Generator menghasilkan link referensi yang tidak bisa diakses dari server.`

Jika memungkinkan, tambahkan konteks item ke pesan internal atau log, misalnya indeks soal yang gagal, tetapi pesan UI tetap singkat dan aman.

**Prompt Design**

Prompt builder harus diubah agar model tidak lagi diarahkan ke dua mode lama. Prompt baru wajib menegaskan:

- hasilkan soal dengan tiga mode variasi approved,
- pilih satu `variationMode` per item,
- hasilkan tepat satu `reference.url` utama per item,
- gunakan hanya sumber tepercaya yang diizinkan,
- jangan keluarkan DOI polos,
- jangan keluarkan nama buku tanpa link,
- jangan keluarkan banyak link untuk satu soal,
- pilih link artikel, guideline, atau regulasi yang paling langsung mendukung jawaban.

Prompt juga harus tetap menjaga:
- topic neighborhood,
- learning objective proximity,
- option quality,
- no concept drift.

**Structured Output Strategy**

Schema structured output perlu diubah untuk memasukkan:
- `variationMode`
- `reference.label`
- `reference.url`

Gemini config harus tetap memakai structured JSON output yang kompatibel dengan runtime sekarang. Bila subset `response_schema` sulit memaksa bentuk `reference`, implementasi boleh beralih ke `response_json_schema` selama:
- tetap memakai `application/json`,
- tetap kompatibel dengan documented supported fields,
- tetap lolos pada environment edge function yang sekarang.

**Generation Flow**

Proposed flow:

1. user submits references
2. backend builds prompt and structured schema
3. Gemini returns structured items
4. backend validates shape
5. backend validates `variationMode`
6. backend validates reference URL format
7. backend validates host allowlist
8. backend validates URL accessibility
9. if all pass, persist batch
10. if any fail, reject whole batch

Retry behavior:
- keep retry for malformed JSON or truncated model output,
- do not retry for bad reference URLs, disallowed hosts, or inaccessible links,
- those are treated as output quality failure, not transport failure.

**UI/Review Implications**

Create flow:
- summary copy should no longer mention `copy concept` and `paraphrase`,
- it should describe the three new modes in user-facing Indonesian labels.

Review flow:
- each generated item should display the variation mode label,
- each generated item should display its main source label and URL,
- reviewers should be able to inspect the link directly.

No requirement in this phase to allow reviewer override of failed strict gate, because failed batches never enter review.

**Testing Strategy**

1. Shared unit tests
- new variation mode enum validation,
- output schema requires `reference.label` and `reference.url`,
- reject non-https URL,
- reject host outside allowlist,
- reject missing or malformed source object.

2. Edge function tests
- fail batch when one item uses disallowed domain,
- fail batch when one item URL is unreachable,
- do not persist failed batch,
- continue to retry only for malformed JSON or truncation.

3. Prompt contract tests
- prompt mentions the three new variation modes,
- prompt requires one main link per item,
- prompt forbids DOI-only / book-only output,
- prompt restricts sources to trusted domains/classes.

4. UI tests
- create page count summary uses new mode names,
- review page displays source metadata for each generated item.

**Risks**

- Success rate generate may drop because strict gate is significantly harder than current flow.
- Some official domains may have intermittent availability; because the chosen policy is `2xx only`, those items must fail.
- Gemini may still try to output homepages or generic landing pages instead of document-level links.
- Allowlist maintenance becomes an operational responsibility.
- If model compliance is weak, a future two-pass repair flow may become necessary, but it is intentionally out of scope for this phase.

**Open Implementation Notes**

- Keep current input-reference relaxation intact.
- Remove remaining assumptions in shared generator code that tie quality gates to bibliography text blobs inside `explanationText`.
- Prefer validating structured `reference.url` over parsing citations out of prose.
- Preserve existing topic drift protections and JSON truncation handling.

**Recommended Implementation Direction**

Implement this as an inline strict validation flow inside the existing question generator edge function:
- new variation modes,
- structured source object,
- exact allowlist,
- backend URL validation,
- atomic batch failure.

This keeps the architecture straightforward and aligns directly with the desired product rule: only persist batches whose references are strong, trusted, and actually reachable.
