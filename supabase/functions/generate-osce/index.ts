import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { generateGeminiText } from "../_shared/gemini-client.ts";
import { HttpError, createServiceClient, requireAuthenticatedUser } from "../_shared/auth.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";

async function readUserCredential(service: ReturnType<typeof createServiceClient>, userId: string) {
  const { data, error } = await service
    .from("user_ai_credentials")
    .select("id, model, secret_id, last_validated_at, last_error")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, "BYOK_READ_FAILED", error.message);
  }

  return data;
}

async function readVaultSecret(service: ReturnType<typeof createServiceClient>, secretId: string) {
  const { data, error } = await service.rpc("read_vault_secret", {
    target_secret_id: secretId,
  });

  if (error || typeof data !== "string" || data.length === 0) {
    throw new HttpError(500, "VAULT_READ_FAILED", error?.message ?? "Secret BYOK belum tersedia.");
  }

  return data;
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const user = await requireAuthenticatedUser(req);
    const service = createServiceClient();
    const { prompt, mode, fileBase64, fileType, scenarioType } = await req.json();

    const credential = await readUserCredential(service, user.id);
    if (!credential?.secret_id) {
      throw new HttpError(400, "BYOK_MISSING", "API Key Gemini diperlukan (BYOK). Harap atur di Pengaturan AI.");
    }

    const apiKey = await readVaultSecret(service, credential.secret_id);

    // Schema yang diharapkan (berdasarkan StationConfigSchema yang baru diperbarui dan Guideline 38 Halaman)
    const jsonSchema = `
    {
      "title": "Judul Stase",
      "type": "komunikasi", // harus "komunikasi" | "dokumen" | "hybrid"
      "durationMinutes": 10,
      "objective": "Tujuan Station (Misal: Menguji kemampuan kandidat dalam pengumpulan data dan konseling...)",
      "competence": "Kompetensi Spesifik (Misal: 1. Pengumpulan data & informasi, 2. Penetapan masalah, dll)",
      "practiceArea": "Praktek Kefarmasian (Misal: R&D, QC/QA, Pelayanan obat tanpa resep, dll)",
      "instructions": "Skenario dan Tugas untuk kandidat",
      "reference": "Referensi Utama Station (Misal: Farmakope Edisi VI)",
      "actorInstructions": "Instruksi Pemeran/PS (Berisi identitas pasien, riwayat penyakit, dll)",
      "rubrics": [
        {
          "rubricId": "ID Unik (Misal: DATA-01)",
          "competencyDomain": "Area Kompetensi (Misal: Pengumpulan Data dan Informasi)",
          "criterion": "Kriteria penilaian (Misal: Menggali riwayat alergi obat pasien)",
          "description": "Deskripsi opsional tambahan",
          "expectedEvidence": "Evidence minimal yang membuat kriteria dianggap terpenuhi",
          "criticalElements": ["Daftar elemen kritis yang menentukan keselamatan/keberhasilan"],
          "supportingElements": ["Daftar elemen tambahan yang mendukung"],
          "acceptedSemanticVariants": ["Contoh variasi kalimat yang bermakna sama"],
          "acceptedClinicalAlternatives": ["Pendekatan klinis alternatif yang valid"],
          "unacceptableResponses": ["Respons salah / tidak relevan"],
          "dangerousResponses": ["Respons yang membahayakan keselamatan"],
          "score3Anchor": "Definisi skor 3 (COMPLETE / CORRECT)",
          "score2Anchor": "Definisi skor 2 (CORRECT BUT INCOMPLETE)",
          "score1Anchor": "Definisi skor 1 (PARTIAL / INADEQUATE)",
          "score0Anchor": "Definisi skor 0 (NOT DEMONSTRATED / INCORRECT)",
          "weight": 10,
          "isCriticalItem": true,
          "criticalErrorRule": "Aturan spesifik jika terjadi critical error",
          "patientSafetyRule": "Aturan spesifik pelanggaran keselamatan pasien",
          "sequenceSensitive": false,
          "conditionalRule": "Kriteria kondisional jika ada",
          "evidenceSource": "Sumber evidence (Misal: Transcript/audio, tindakan virtual)",
          "reference": "Referensi spesifik untuk item rubrik ini",
          "referenceVersion": "Versi/tahun referensi",
          "humanReviewTrigger": "Kondisi yang memicu review manusia (Misal: audio tidak jelas)"
        }
      ],
      "worksheetTemplate": "Markdown template untuk Lembar Kerja OSCE Internal",
      "attachments": []
    }
    `;

    const systemPrompt = `Anda adalah Asisten Ahli Pembuat Soal UKAI OSCE. Buat rancangan stase OSCE Apoteker SANGAT MENDETAIL mematuhi GUIDELINE RUBRIK OSCE VIRTUAL AI TERBARU.

ATURAN WAJIB PENYUSUNAN RUBRIK (TIDAK BOLEH DILANGGAR):
1. PRINSIP DASAR: Valid, Observable, Specific, Discriminative, Safe, Traceable, AI-Interpretable.
2. HINDARI COMPOUND CRITERIA: Satu item rubrik = satu konstruk penilaian. Jangan gabungkan banyak perilaku dalam satu kriteria. Hindari Micro-Checklist yang berlebihan.
3. SCORING 0-3: 
   - Skor 3: COMPLETE/CORRECT (tindakan utama dilakukan, isi benar, cukup lengkap).
   - Skor 2: CORRECT BUT INCOMPLETE (inti benar, komponen pendukung terlewat).
   - Skor 1: PARTIAL/INADEQUATE (informasi penting terlewat, belum cukup mencapai tujuan).
   - Skor 0: NOT DEMONSTRATED/INCORRECT (jawaban salah prinsip, tidak dilakukan).
   - Jangan gunakan anchor subjektif seperti "sangat baik", "baik", "cukup". Harus spesifik.
4. CRITICAL & SUPPORTING: Bedakan informasi esensial penentu keselamatan (Critical) dan informasi tambahan (Supporting).
5. OMISSION vs MISINFORMATION: Bedakan lupa memberi tahu (omission) dengan aktif memberi tahu hal yang salah (misinformation).
6. ACCEPTED ALTERNATIVES: Pertimbangkan pendekatan klinis alternatif yang valid (Accepted Clinical Alternatives & Semantic Variants).
7. TIDAK BOLEH: Memberikan double penalty/reward, mendasarkan pada personality, menilai gaya bahasa berlebihan, menggunakan Halo Effect, dan mengarang (invent) evidence.

FORMAT RUBRIK (25 PARAMETER):
Untuk bagian "rubrics", WAJIB gunakan format 25 properti sesuai dengan jsonSchema. Jabarkan sejelas-jelasnya elemen kritis, respons berbahaya, dan trigger review manusia.

Kembalikan HANYA dalam format JSON yang valid dan persis sesuai skema berikut:
${jsonSchema}
Tidak boleh ada teks penjelasan sebelum atau sesudah JSON, pastikan JSON valid dan proper escaping. (Catatan: gunakan \\n untuk newline di dalam nilai string JSON).`;

    const modelToUse = credential.model || 'gemini-3.7-flash';
    
    let scenarioTypeContext = "";
    if (scenarioType) {
      scenarioTypeContext = `\n\nPERHATIAN: Pastikan jenis stase OSCE (field "type") di set ke "${scenarioType === 'pemeran_standar' ? 'komunikasi' : scenarioType}" dan skenario dibuat menyesuaikan dengan jenis tersebut.\n`;
    }
    
    let textPrompt = systemPrompt + scenarioTypeContext + '\nInstruksi Mentor:\n' + (prompt || "Buat skenario OSCE apoteker acak yang relevan.");
    let parts: any[] = [{ text: textPrompt }];
    
    // Default fileType if missing
    let resolvedFileType = fileType;
    if (mode === "file" && fileBase64) {
      if (!resolvedFileType) {
         // Fallback guess based on mode (if it's a file upload without mime type, usually PDF)
         resolvedFileType = "application/pdf";
      }
      
      textPrompt = systemPrompt + '\n\nEkstrak informasi dari dokumen terlampir untuk membuat skenario OSCE. Jika ada instruksi tambahan:\n' + (prompt || "Buat sesuai dokumen.");
      parts = [
        { text: textPrompt },
        {
          inlineData: {
            mimeType: resolvedFileType,
            data: fileBase64
          }
        }
      ];
    }
    
    let jsonString = await generateGeminiText({
      apiKey,
      model: modelToUse,
      prompt: textPrompt,
      parts,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    });
    // Bersihkan jika ada markdown code block ```json ... ```
    jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let resultConfig;
    try {
       resultConfig = JSON.parse(jsonString);
    } catch (e) {
       console.error("Gagal parsing JSON dari Gemini:", jsonString);
       throw new HttpError(500, "GENERATION_FAILED", "Format respons AI tidak valid JSON");
    }

    // Default id untuk frontend
    if (!resultConfig.id) {
       resultConfig.id = crypto.randomUUID();
    }

    // Mapping fallback untuk menjaga kompatibilitas dengan frontend lama
    if (resultConfig.rubrics && Array.isArray(resultConfig.rubrics)) {
      resultConfig.rubrics = resultConfig.rubrics.map((r: any) => ({
        ...r,
        competency: r.competency || r.competencyDomain,
        score3: r.score3 || r.score3Anchor,
        score2: r.score2 || r.score2Anchor,
        score1: r.score1 || r.score1Anchor,
        score0: r.score0 || r.score0Anchor,
      }));
    }

    return jsonResponse(resultConfig);
  } catch (error) {
    console.error("GENERATE OSCE ERROR:", error);
    if (error instanceof HttpError) {
      return jsonResponse({ error: error.code, message: error.message }, error.status);
    }
    return jsonResponse({ error: "UNEXPECTED_ERROR", message: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
