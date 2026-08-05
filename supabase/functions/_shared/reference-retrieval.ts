import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { HttpError } from "./auth.ts";

type ReferenceDocumentRow = {
  id: string;
  title: string;
  state: "active" | "inactive";
};

type ReferenceDocumentVersionRow = {
  id: string;
  reference_document_id: string;
  version_label: string;
  file_name: string;
  storage_path: string | null;
  is_active: boolean;
};

function normalizeStorageLookupPath(storagePath: string) {
  return storagePath.startsWith("reference-library/")
    ? storagePath.slice("reference-library/".length)
    : storagePath;
}

export async function readReferenceDocumentVersion(
  service: SupabaseClient,
  input: {
    referenceDocumentId: string;
    versionId?: string | null;
    storagePath?: string | null;
  },
) {
  const { data: document, error: documentError } = await service
    .from("reference_documents")
    .select("id, title, state")
    .eq("id", input.referenceDocumentId)
    .maybeSingle();

  if (documentError || !document) {
    throw new HttpError(
      404,
      "REFERENCE_DOCUMENT_NOT_FOUND",
      documentError?.message ?? "Dokumen referensi tidak ditemukan.",
    );
  }

  let versionQuery = service
    .from("reference_document_versions")
    .select("id, reference_document_id, version_label, file_name, storage_path, is_active")
    .eq("reference_document_id", input.referenceDocumentId);

  if (input.versionId) {
    versionQuery = versionQuery.eq("id", input.versionId);
  } else if (input.storagePath) {
    versionQuery = versionQuery.eq("storage_path", input.storagePath);
  } else {
    versionQuery = versionQuery.eq("is_active", true);
  }

  const { data: version, error: versionError } = await versionQuery.maybeSingle();

  if (versionError || !version) {
    throw new HttpError(
      404,
      "REFERENCE_VERSION_NOT_FOUND",
      versionError?.message ?? "Versi referensi tidak ditemukan.",
    );
  }

  return {
    document: document as ReferenceDocumentRow,
    version: version as ReferenceDocumentVersionRow,
  };
}

export async function createReferenceSignedUrl(
  service: SupabaseClient,
  storagePath: string | null,
): Promise<string | null> {
  if (!storagePath) {
    return null;
  }

  const { data, error } = await service
    .storage
    .from("reference-library")
    .createSignedUrl(normalizeStorageLookupPath(storagePath), 60 * 30);

  if (error) {
    throw new HttpError(500, "REFERENCE_SIGN_URL_FAILED", error.message);
  }

  return data.signedUrl;
}
