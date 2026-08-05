import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { HttpError, requireAdmin } from "../_shared/auth.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { extractOcrText } from "./ocr-question-pdf.ts";

type OcrRequestPayload = {
  fileName?: string;
  imagePages?: string[];
};

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);

  if (corsResponse) {
    return corsResponse;
  }

  try {
    await requireAdmin(req);
    const payload = await req.json() as OcrRequestPayload;

    if (!payload.fileName?.trim()) {
      throw new HttpError(400, "FILE_NAME_REQUIRED", "fileName wajib diisi.");
    }

    if (!Array.isArray(payload.imagePages) || payload.imagePages.length === 0) {
      throw new HttpError(400, "IMAGE_PAGES_REQUIRED", "imagePages wajib berisi minimal satu halaman.");
    }

    return jsonResponse(
      extractOcrText({
        fileName: payload.fileName.trim(),
        imagePages: payload.imagePages,
      }),
    );
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(
        {
          error: error.code,
          message: error.message,
        },
        error.status,
      );
    }

    return jsonResponse(
      {
        error: "UNEXPECTED_ERROR",
        message: error instanceof Error ? error.message : "Unexpected OCR error.",
      },
      500,
    );
  }
});
