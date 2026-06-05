"use client";

import { useState } from "react";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ErrorAlert } from "@/components/ui/error-alert";

export interface SignatureCredentials {
  password: string;
  totpCode?: string;
  meaningStatement: string;
  reason?: string;
}

interface SignatureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Modal heading, e.g. "Approve Change Request". */
  title: string;
  /** Record identity shown in the modal. */
  recordNumber: string;
  recordTitle: string;
  statusNode?: React.ReactNode;
  /** Verb used to compose the signature statement (e.g. "approve"). */
  recordNoun?: string;
  isPending: boolean;
  /** Performs the signed action; throws on failure (the modal maps the error). */
  onSign: (creds: SignatureCredentials) => Promise<void>;
  successMessage?: string;
  /** Optional extra fields rendered above the credentials (e.g. an effectiveness-result note). */
  children?: React.ReactNode;
}

const MEANINGS = ["Authored", "Reviewed", "Approved", "Released"] as const;

/**
 * Reusable 21 CFR Part 11 signing ceremony (CLAUDE.md rule 4): re-authentication
 * (password + TOTP for the first signature in the session) plus a controlled signature
 * meaning. Backend enforces everything; this collects and submits credentials.
 */
export function SignatureModal({
  open,
  onOpenChange,
  title,
  recordNumber,
  recordTitle,
  statusNode,
  recordNoun = "record",
  isPending,
  onSign,
  successMessage = "Signed successfully",
  children,
}: SignatureModalProps) {
  const [meaning, setMeaning] = useState<string>("Approved");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setPassword("");
    setTotpCode("");
    setReason("");
    setError(null);
  }

  function mapError(err: unknown): string {
    const status = (err as AxiosError).response?.status;
    switch (status) {
      case 401:
        return "Re-authentication failed — check your password and authenticator code.";
      case 403:
        return `You can't sign this ${recordNoun} (self-approval is prohibited).`;
      case 409:
        return "This record was changed by someone else. Close and reload, then try again.";
      default:
        return "Signing failed. Please try again.";
    }
  }

  async function submit() {
    setError(null);
    try {
      await onSign({
        password,
        totpCode: totpCode || undefined,
        reason: reason || undefined,
        meaningStatement: `I hereby ${meaning.toLowerCase()} this ${recordNoun} and confirm it is ready to proceed.`,
      });
      toast.success(successMessage);
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(mapError(err));
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
      title={title}
      description="This applies a 21 CFR Part 11 electronic signature."
    >
      <div className="space-y-4">
        <div className="rounded-md border border-border bg-muted/30 p-3 text-body">
          <p className="font-medium">{recordTitle}</p>
          <p className="text-label text-muted-foreground">{recordNumber}</p>
          {statusNode && <div className="mt-1">{statusNode}</div>}
        </div>

        {error && <ErrorAlert title="Couldn't sign" message={error} />}

        {children}

        <div className="space-y-1.5">
          <Label htmlFor="sig-meaning">Signature meaning</Label>
          <Select id="sig-meaning" value={meaning} onChange={(e) => setMeaning(e.target.value)}>
            {MEANINGS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sig-password">Password *</Label>
          <Input
            id="sig-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sig-totp">Authenticator code</Label>
          <Input
            id="sig-totp"
            inputMode="numeric"
            maxLength={6}
            placeholder="Required for your first signature this session"
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sig-reason">Reason (optional)</Label>
          <Textarea id="sig-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      </div>

      <ModalFooter className="gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={isPending || password.trim().length === 0}>
          {isPending ? "Signing…" : "Sign"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
