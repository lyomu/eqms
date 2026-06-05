"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AxiosError } from "axios";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { LoginResponse, MfaEnrollResponse } from "@/types/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorAlert } from "@/components/ui/error-alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const codeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app"),
});
type CodeForm = z.infer<typeof codeSchema>;

function MfaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") === "enroll" ? "enroll" : "verify";
  const { verifyMfa } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  // Enrollment material via a *cached query* (not a mutation-in-effect): fires exactly
  // once per page load even under React StrictMode, so the secret shown always matches
  // the one the backend stored. Each enroll regenerates the secret server-side, so we
  // never refetch on focus/mount.
  const enrollQuery = useQuery({
    queryKey: ["auth", "mfa", "enroll"],
    queryFn: async (): Promise<MfaEnrollResponse> => {
      const { data } = await api.post<MfaEnrollResponse>("/api/auth/mfa/enroll");
      return data;
    },
    enabled: mode === "enroll",
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CodeForm>({ resolver: zodResolver(codeSchema) });

  const onSubmit = (values: CodeForm) => {
    setFormError(null);
    verifyMfa.mutate(
      { code: values.code },
      {
        onSuccess: (data) => {
          if (data.status === "AUTHENTICATED") router.push("/");
          else setFormError("That code wasn't valid. Please try again.");
        },
        onError: (error) => {
          const status = (error as AxiosError<LoginResponse>).response?.status;
          if (status === 401) setFormError("That code wasn't valid. Please try again.");
          else setFormError("Verification failed. Please try again.");
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === "enroll" ? "Set up two-factor authentication" : "Two-factor authentication"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {mode === "enroll" && (
          <div className="space-y-3">
            {enrollQuery.isLoading && <LoadingSpinner label="Preparing enrollment…" />}
            {enrollQuery.isError && (
              <ErrorAlert
                title="Couldn't start enrollment"
                message="Your sign-in session may have expired. Go back and sign in again."
              />
            )}
            {enrollQuery.data && (
              <div className="space-y-3">
                <p className="text-body text-muted-foreground">
                  Add this account to an authenticator app (Google Authenticator, Microsoft
                  Authenticator, Authy…), then enter the 6-digit code it generates.
                </p>
                <div className="space-y-1.5">
                  <Label>Secret key (manual entry)</Label>
                  <code className="block break-all rounded-md border border-border bg-muted/50 p-3 text-center text-base font-semibold tracking-widest text-brand-primary">
                    {enrollQuery.data.secret}
                  </code>
                  <p className="text-label text-muted-foreground">
                    Account: <span className="font-medium">eQMS</span> · Type: time-based (TOTP),
                    6 digits, 30s
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {mode === "verify" && (
          <p className="text-body text-muted-foreground">
            Enter the 6-digit code from your authenticator app.
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {formError && <ErrorAlert title="Verification failed" message={formError} />}

          <div className="space-y-1.5">
            <Label htmlFor="code">Authentication code</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              aria-invalid={!!errors.code}
              {...register("code")}
            />
            {errors.code && <p className="text-label text-error">{errors.code.message}</p>}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={verifyMfa.isPending || (mode === "enroll" && !enrollQuery.data)}
          >
            {verifyMfa.isPending ? <LoadingSpinner label="Verifying…" /> : "Verify"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function MfaPage() {
  return (
    <Suspense fallback={<LoadingSpinner label="Loading…" />}>
      <MfaForm />
    </Suspense>
  );
}
