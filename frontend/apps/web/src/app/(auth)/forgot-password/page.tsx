"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { AxiosError } from "axios";
import { ArrowLeft, MailCheck } from "lucide-react";
import { useRequestPasswordReset } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestReset = useRequestPasswordReset();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    requestReset.mutate({ email }, {
      onSuccess: () => setSubmitted(true),
      onError: (err) => {
        const status = (err as AxiosError).response?.status;
        setError(status === 429
          ? "Too many reset requests. Please wait a few minutes and try again."
          : "We couldn't request a reset link. Please try again.");
      },
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{submitted ? "Check your email" : "Reset password"}</CardTitle>
      </CardHeader>
      <CardContent>
        {submitted ? (
          <div className="space-y-4">
            <div className="rounded-md border border-success/30 bg-success/10 p-4">
              <MailCheck className="mb-3 h-6 w-6 text-success" />
              <p className="text-body">
                If an account exists for <span className="font-semibold">{email}</span>, password reset instructions will be sent shortly.
              </p>
            </div>
            <Button asChild className="w-full">
              <Link href="/login">
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {error && <ErrorAlert title="Reset request failed" message={error} />}
            <p className="text-body text-muted-foreground">
              Enter your email address and we will send instructions for resetting your password.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={requestReset.isPending}>
              {requestReset.isPending ? <LoadingSpinner label="Sending..." /> : "Send reset instructions"}
            </Button>
            <Button asChild type="button" variant="outline" className="w-full">
              <Link href="/login">
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
