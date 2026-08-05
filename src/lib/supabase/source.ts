export type SupabaseSource = {
  kind: "local" | "cloud";
  label: string;
  host: string;
  note: string;
};

function isLocalSupabaseHost(hostname: string) {
  return (
    hostname === "localhost"
    || hostname === "127.0.0.1"
    || hostname === "0.0.0.0"
    || hostname === "::1"
  );
}

export function resolveSupabaseSource(
  sourceUrl: string | null | undefined,
): SupabaseSource | null {
  const trimmedSourceUrl = sourceUrl?.trim();

  if (!trimmedSourceUrl) {
    return null;
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(trimmedSourceUrl);
  } catch {
    return null;
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  if (isLocalSupabaseHost(hostname)) {
    return {
      kind: "local",
      label: "Supabase Local",
      host: parsedUrl.host,
      note: "Perubahan di Supabase cloud tidak akan muncul di app ini.",
    };
  }

  return {
    kind: "cloud",
    label: "Supabase Cloud",
    host: parsedUrl.host,
    note: "App ini membaca project cloud yang sedang aktif.",
  };
}

export function readSupabaseSource(): SupabaseSource | null {
  return resolveSupabaseSource(
    typeof import.meta.env.VITE_SUPABASE_URL === "string"
      ? import.meta.env.VITE_SUPABASE_URL
      : null,
  );
}
