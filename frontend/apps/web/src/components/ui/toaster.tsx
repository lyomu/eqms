"use client";

import { Toaster as SonnerToaster } from "sonner";

/**
 * App-wide toast host. Mounted once in Providers. Trigger toasts anywhere with
 * `import { toast } from "sonner"` (used by the axios interceptor and forms).
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "text-body",
        },
      }}
    />
  );
}
