"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";

interface LoginForm {
  email: string;
  password: string;
}

function PlatformLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = usePlatformAuth();
  const [error, setError] = useState<string | null>(
    searchParams.get("session") === "expired" ? "Your platform session expired." : null
  );
  const form = useForm<LoginForm>();

  function submit(values: LoginForm) {
    setError(null);
    login.mutate(values, {
      onSuccess: () => router.push("/platform/organizations"),
      onError: () => setError("Invalid platform admin email or password."),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Platform admin sign in
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          {error && <ErrorAlert title="Sign-in failed" message={error} />}
          <div className="space-y-1.5">
            <Label htmlFor="platformEmail">Email</Label>
            <Input id="platformEmail" type="email" autoComplete="username" required {...form.register("email")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="platformPassword">Password</Label>
            <Input id="platformPassword" type="password" autoComplete="current-password" required {...form.register("password")} />
          </div>
          <Button type="submit" className="w-full" disabled={login.isPending}>
            {login.isPending ? <LoadingSpinner label="Signing in" /> : "Continue"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function PlatformLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="text-h1 font-bold tracking-tight text-brand-primary">eQMS Platform</span>
          <p className="text-body text-muted-foreground">Organization and licensing control plane</p>
        </div>
        <Suspense fallback={<LoadingSpinner label="Loading" />}>
          <PlatformLoginForm />
        </Suspense>
      </div>
    </div>
  );
}
