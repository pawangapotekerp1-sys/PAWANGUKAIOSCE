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
    const { config, history, newMessage } = await req.json();

    const credential = await readUserCredential(service, user.id);
    if (!credential?.secret_id) {
      throw new HttpError(400, "BYOK_MISSING", "API Key Gemini diperlukan (BYOK). Harap atur di Pengaturan AI.");
    }

    const apiKey = await readVaultSecret(service, credential.secret_id);

    // Build prompt combining actor instructions and chat history
    let systemPrompt = `Anda adalah aktor pasien simulasi OSCE. Ikuti instruksi ini dengan ketat:\n${config.actorInstructions}\n\nBerperanlah senatural mungkin sesuai skenario. Jangan keluar dari karakter. Batasi respon Anda menjadi maksimal 2 atau 3 kalimat singkat yang relevan.`;
    
    // Format history for Gemini
    let conversationContext = "Riwayat Percakapan:\n";
    for (const msg of history) {
      conversationContext += `${msg.role === 'user' ? 'Kandidat' : 'Pasien'}: ${msg.content}\n`;
    }
    conversationContext += `Kandidat: ${newMessage}\nPasien: `;

    const finalPrompt = `${systemPrompt}\n\n${conversationContext}`;

    const aiResponse = await generateGeminiText({
      apiKey,
      model: credential.model || "gemini-3.6-flash", 
      prompt: finalPrompt,
      maxOutputTokens: 2048,
    });

    return jsonResponse({ text: aiResponse });
  } catch (error) {
    console.error("SIMULATE OSCE ERROR:", error);
    if (error instanceof HttpError) {
      return jsonResponse({ error: error.code, message: error.message }, error.status);
    }
    return jsonResponse({ error: "UNEXPECTED_ERROR", message: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
