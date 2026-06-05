"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { makeQueryClient } from "@/lib/query-client";
import { Toaster } from "@/components/ui/toaster";

/** App-wide client providers: React Query (server state) + toast host. */
export function Providers({ children }: { children: React.ReactNode }) {
  // One client per browser session; created lazily so it isn't shared across requests.
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
