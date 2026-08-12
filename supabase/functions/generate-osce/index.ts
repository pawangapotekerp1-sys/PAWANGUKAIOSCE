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
      "objective": "Tujuan Station (Misal: Menguji kemampuan kandidat dalam pengumpulan data dan konseling...)",
      "instructions": "Instruksi Peserta Ujian / Skenario Klinik",
      "actorInstructions": "Instruksi Pemeran/PS (Berisi identitas pasien, riwayat penyakit, dll)",
      "rubrics": [
        {
          "competency": "Pengumpulan Data dan Informasi Pasien",
          "score3": "Deskripsi Skor 3",
          "score2": "Deskripsi Skor 2",
          "score1": "Deskripsi Skor 1",
          "score0": "Deskripsi Skor 0"
        }
      ],
      "worksheetTemplate": "Markdown template untuk Lembar Kerja OSCE Internal (Misal: Tabel, parameter uji, form kosong, dsb). Biarkan string kosong jika tidak diperlukan.",
      "attachments": []
    }
    `;

    const systemPrompt = `Anda adalah asisten ahli pembuat soal UKAI (Uji Kompetensi Apoteker Indonesia) berstandar nasional metode OSCE. 
Buat rancangan stase OSCE Apoteker secara SANGAT MENDETAIL dan LENGKAP mengikuti STANDAR FORMAT TERBARU.

Gunakan format MARKDOWN (tebal, list, tabel) di dalam field string agar hasilnya rapi.

Standar Pemformatan Konten:
1. 'objective' (Gunakan Markdown tebal untuk label, pisahkan baris):
   **Tujuan station:** Menguji kemampuan kandidat dalam...
   **Kompetensi spesifik:** (1. Pengumpulan data & informasi, 2. Penyelesaian masalah, dll)
   **Praktek Kefarmasian:** (R&D / Produksi / QC / Pelayanan / Dispensing, dll)

2. 'instructions' (Instruksi Kandidat) (Gunakan Markdown tebal untuk label):
   **Skenario:** (Latar belakang situasi spesifik)
   **Tugas:** (Daftar list 1, 2, 3... tugas spesifik)
   **Tata letak Stasion:** (Misal: Apotek, Ruang Rawat, QC, dll)
   **Kebutuhan Laboran:** (Ada/Tidak ada)
   **Referensi:** (Misal: Farmakope Edisi VI)

3. 'worksheetTemplate' (Lembar Kerja OSCE INTERNAL):
   - Jika station butuh perhitungan / dokumen yang harus diisi kandidat (seperti Uji Disolusi, Skrining Resep), buatkan template form isian dalam bentuk MARKDOWN (gunakan tabel markdown atau titik-titik untuk diisi).
   - Contoh format Lembar Kerja:
     **Parameter Uji ...**
     | Parameter | Keterangan |
     |-----------|------------|
     | Jenis Medium | ................... |
     | Waktu | ................... |

     **Data Tabel Hasil**
     | Tablet | Perhitungan | % Hasil |
     |--------|-------------|---------|
     | 1 | | |
     
   - Buatkan secara lengkap menyerupai Lembar Kerja ujian asli yang harus diserahkan oleh kandidat. Jika stase murni komunikasi tanpa tulisan, isi string kosong.

4. 'actorInstructions':
   - Jabarkan profil, riwayat, dialog spesifik. Jika tidak ada PS, tulis "Tidak ada".

5. 'rubrics':
   - Buat matriks rubrik konkret untuk Skor 3 (Sempurna), Skor 2, Skor 1, dan Skor 0 (Tidak mampu).

Kembalikan HANYA dalam format JSON yang valid dan persis sesuai skema berikut:
${jsonSchema}
Tidak boleh ada teks penjelasan sebelum atau sesudah JSON, pastikan JSON valid dan proper escaping. (Catatan: gunakan \\n untuk newline di dalam nilai string JSON).`;

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
       resultConfig.id = crypto.randomUUID();
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
