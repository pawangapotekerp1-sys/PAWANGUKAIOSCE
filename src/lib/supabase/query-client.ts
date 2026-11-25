import { QueryClient } from "@tanstack/react-query";

let browserQueryClient: QueryClient | undefined;

export function shouldRetrySupabaseQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) {
    return false;
  }

  const message = error instanceof Error ? error.message : String(error ?? "");

  if (/statement timeout|canceling statement|57014|sesi login berakhir/i.test(message)) {
    return false;
  }

  return true;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetrySupabaseQuery,
        refetchOnWindowFocus: false,
        staleTime: 300_000, // 5 menit
      },
    },
  });
}

export function getQueryClient(): QueryClient {
  if (!browserQueryClient) {
    browserQueryClient = createQueryClient();
  }

  return browserQueryClient;
}
