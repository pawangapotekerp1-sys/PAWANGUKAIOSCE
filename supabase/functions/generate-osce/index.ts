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
    const { prompt, mode } = await req.json();

    const credential = await readUserCredential(service, user.id);
    if (!credential?.secret_id) {
      throw new HttpError(400, "BYOK_MISSING", "API Key Gemini diperlukan (BYOK). Harap atur di Pengaturan AI.");
    }

    const apiKey = await readVaultSecret(service, credential.secret_id);

    // Schema yang diharapkan (berdasarkan StationConfigSchema yang baru diperbarui)
    const jsonSchema = `
    {
      "title": "Judul Stase",
      "type": "komunikasi", // harus "komunikasi" | "dokumen" | "hybrid"
      "durationMinutes": 10,
      "objective": "Tujuan Station (Misal: Kandidat mampu melakukan pengumpulan data dan konseling...)",
      "instructions": "Instruksi Peserta Ujian / Skenario Klinik (Berisi skenario, keluhan, resep jika ada, dan tugas spesifik untuk kandidat)",
      "actorInstructions": "Instruksi Pemeran/PS (Berisi identitas pasien, riwayat penyakit, hal-hal yang harus dikatakan atau dijawab saat ditanya kandidat, respon sikap, dll)",
      "rubrics": [
        {
          "competency": "Pengumpulan Data dan Informasi Pasien",
          "score3": "Deskripsi jika kandidat melakukan dengan sempurna (Skor 3)",
          "score2": "Deskripsi untuk Skor 2",
          "score1": "Deskripsi untuk Skor 1",
          "score0": "Deskripsi untuk Skor 0 (Kandidat tidak melakukan sama sekali)"
        }
      ],
      "attachments": [] // biarkan array kosong
    }
    `;

    const systemPrompt = `Anda adalah asisten ahli pembuat soal UKAI (Uji Kompetensi Apoteker Indonesia) berstandar nasional metode OSCE. 
Buat rancangan stase OSCE Apoteker secara SANGAT MENDETAIL dan LENGKAP mengikuti STANDAR FORMAT TERBARU.

Standar Pemformatan Konten:
1. 'objective' harus diformat berisi 3 bagian:
   - Tujuan station: Menguji kemampuan kandidat dalam...
   - Kompetensi spesifik: (Sebutkan poin kompetensi yang diuji, pilih dari: 1. Pengumpulan data & informasi, 2. Penetapan masalah, 3. Penyelesaian masalah, 4. Pencatatan & pelaporan, 5. Komunikasi efektif, 6. Sikap dan perilaku professional)
   - Praktek Kefarmasian: (Pilih area yang relevan, misal: R&D, Produksi, QC/QA, Pelayanan obat tanpa resep, Skrining resep, Dispensing/KIE, dll).

2. 'instructions' (Instruksi Kandidat) harus diformat berisi:
   - Skenario: (Latar belakang situasi klinik/industri yang spesifik)
   - Tugas: (Daftar poin tugas 1, 2, 3... untuk kandidat)
   - Tata letak Station: (Misal: Apotek, Ruang Rawat, QC, dll)
   - Kebutuhan Laboran: (Ada/Tidak ada)
   - Referensi: (Misal: Farmakope, ISO, DIH, dll)

3. 'actorInstructions' (Instruksi Pemeran Standar):
   - Jika ada pemeran, jabarkan detail profil, keluhan, riwayat, dan dialog respons spesifik.
   - Jika murni soal perhitungan/dokumen tanpa PS, tulis "Tidak ada".

4. 'rubrics':
   - Buat matriks rubrik yang berkesinambungan dengan Kompetensi spesifik yang diuji.
   - Jabarkan deskripsi perilaku secara konkret untuk Skor 3 (Sempurna), Skor 2, Skor 1, dan Skor 0 (Tidak mampu/Tidak melakukan).

Kembalikan HANYA dalam format JSON yang valid dan persis sesuai skema berikut:
${jsonSchema}
Tidak boleh ada teks penjelasan sebelum atau sesudah JSON, pastikan JSON valid dan proper escaping.`;

    const modelToUse = credential.model || 'gemini-3.6-flash';
    
    let jsonString = await generateGeminiText({
      apiKey,
      model: modelToUse,
      prompt: systemPrompt + '\n\nInstruksi Mentor:\n' + (prompt || "Buat skenario OSCE apoteker acak yang relevan."),
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
       resultConfig.id = 'stase-' + Date.now();
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
