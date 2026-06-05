import { QueryClient } from "@tanstack/react-query";

/** Shared React Query client. Conservative defaults for a regulated app: */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Never retry auth/permission failures — they won't fix themselves.
          const status = (error as { response?: { status?: number } })?.response?.status;
          if (status === 401 || status === 403) return false;
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}
