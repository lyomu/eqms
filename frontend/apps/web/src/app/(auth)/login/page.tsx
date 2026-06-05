"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AxiosError } from "axios";
import { useAuth } from "@/hooks/useAuth";
import type { LoginResponse } from "@/types/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorAlert } from "@/components/ui/error-alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// Client-side shape check only. The backend is the source of truth for credentials.
const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
type LoginForm = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [formError, setFormError] = useState<string | null>(
    searchParams.get("session") === "expired" ? "Your session expired. Please sign in again." : null
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  function routeByStatus(status: LoginResponse["status"]) {
    switch (status) {
      case "MFA_REQUIRED":
        router.push("/mfa?mode=verify");
        break;
      case "ENROLLMENT_REQUIRED":
        router.push("/mfa?mode=enroll");
        break;
      case "AUTHENTICATED":
        router.push("/");
        break;
      case "LOCKED":
        setFormError("This account is locked due to too many failed attempts. Try again later.");
        break;
      default:
        setFormError("Invalid email or password.");
    }
  }

  const onSubmit = (values: LoginForm) => {
    setFormError(null);
    login.mutate(values, {
      onSuccess: (data) => routeByStatus(data.status),
      onError: (error) => {
        // 401 (invalid) / 423 (locked) still carry a LoginResponse body with the status.
        const status = (error as AxiosError<LoginResponse>).response?.data?.status;
        if (status) routeByStatus(status);
        else setFormError("Unable to sign in. Please try again.");
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {formError && <ErrorAlert title="Sign-in failed" message={formError} />}

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email && <p className="text-label text-error">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            {errors.password && <p className="text-label text-error">{errors.password.message}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={login.isPending}>
            {login.isPending ? <LoadingSpinner label="Signing in…" /> : "Continue"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  // useSearchParams requires a Suspense boundary in the App Router.
  return (
    <Suspense fallback={<LoadingSpinner label="Loading…" />}>
      <LoginForm />
    </Suspense>
  );
}
