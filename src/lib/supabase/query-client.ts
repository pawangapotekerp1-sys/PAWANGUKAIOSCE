import { QueryClient } from "@tanstack/react-query";

let browserQueryClient: QueryClient | undefined;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
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
