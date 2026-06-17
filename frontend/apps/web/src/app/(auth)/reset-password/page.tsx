"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AxiosError } from "axios";
import { ArrowLeft, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useConfirmPasswordReset } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const resetSchema = z.object({
  password: z.string().min(12, "Use at least 12 characters").max(128, "Use 128 characters or fewer"),
  confirmPassword: z.string().min(1, "Confirm your new password"),
}).refine((values) => values.password === values.confirmPassword, {
  path: ["confirmPassword"],
  message: "Passwords do not match",
});

type ResetForm = z.infer<typeof resetSchema>;

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const confirmReset = useConfirmPasswordReset();
  const [formError, setFormError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetForm>({ resolver: zodResolver(resetSchema) });

  const onSubmit = (values: ResetForm) => {
    if (!token) {
      setFormError("This reset link is missing its token. Request a new password reset link.");
      return;
    }
    setFormError(null);
    confirmReset.mutate(
      { token, newPassword: values.password },
      {
        onSuccess: () => setCompleted(true),
        onError: (err) => {
          const status = (err as AxiosError).response?.status;
          setFormError(status === 400
            ? "This reset link is invalid or has expired. Request a new password reset link."
            : "We couldn't reset your password. Please try again.");
        },
      }
    );
  };

  if (completed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Password updated</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-success/30 bg-success/10 p-4">
            <CheckCircle2 className="mb-3 h-6 w-6 text-success" />
            <p className="text-body">Your password has been reset. You can now sign in with the new password.</p>
          </div>
          <Button asChild className="w-full">
            <Link href="/login">
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create new password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {formError && <ErrorAlert title="Reset failed" message={formError} />}
          {!token && (
            <ErrorAlert
              title="Invalid reset link"
              message="This link is missing its token. Request a new password reset link."
            />
          )}

          <div className="space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                className="pr-11"
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-md text-muted-foreground transition hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-label text-error">{errors.password.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                aria-invalid={!!errors.confirmPassword}
                className="pr-11"
                {...register("confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((current) => !current)}
                className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-md text-muted-foreground transition hover:text-foreground"
                aria-label={showConfirmPassword ? "Hide password confirmation" : "Show password confirmation"}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-label text-error">{errors.confirmPassword.message}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={confirmReset.isPending || !token}>
            {confirmReset.isPending ? <LoadingSpinner label="Resetting..." /> : "Reset password"}
          </Button>
          <Button asChild type="button" variant="outline" className="w-full">
            <Link href="/forgot-password">
              <ArrowLeft className="h-4 w-4" />
              Request a new link
            </Link>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingSpinner label="Loading..." />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
