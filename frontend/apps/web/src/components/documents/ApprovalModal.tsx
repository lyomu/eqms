"use client";

import { useState } from "react";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { useApproveDocument } from "@/hooks/useDocuments";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ErrorAlert } from "@/components/ui/error-alert";
import { StatusBadge } from "@/components/documents/StatusBadge";
import { SIGNATURE_MEANINGS, type DocumentResponse } from "@/types/documents";

interface ApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: DocumentResponse;
  onApproved?: () => void;
}

/**
 * Part 11 approval ceremony (CLAUDE.md rule 4): re-authentication (password + TOTP for the first
 * signature in the session) plus a controlled signature meaning. All enforcement is on the backend;
 * this only collects and submits the credentials.
 */
export function ApprovalModal({ open, onOpenChange, document, onApproved }: ApprovalModalProps) {
  const approve = useApproveDocument();
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
        return "You can't approve your own document (self-approval is prohibited).";
      case 409:
        return "This document was changed by someone else. Close and reload, then try again.";
      default:
        return "Approval failed. Please try again.";
    }
  }

  async function onSign() {
    setError(null);
    try {
      await approve.mutateAsync({
        id: document.id,
        expectedVersion: document.version,
        reason: reason || undefined,
        password,
        totpCode: totpCode || undefined,
        meaningStatement: `I hereby ${meaning.toLowerCase()} this document and confirm it is ready for release.`,
      });
      toast.success("Approved successfully");
      reset();
      onOpenChange(false);
      onApproved?.();
    } catch (err) {
      setError(mapError(err));
    }
  }

  const canSign = password.trim().length > 0 && !approve.isPending;

  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
      title="Approve Document"
      description="This applies a 21 CFR Part 11 electronic signature."
    >
      <div className="space-y-4">
        <div className="rounded-md border border-border bg-muted/30 p-3 text-body">
          <p className="font-medium">{document.title}</p>
          <p className="text-label text-muted-foreground">{document.documentNumber}</p>
          <div className="mt-1">
            <StatusBadge status={document.status} />
          </div>
        </div>

        {error && <ErrorAlert title="Couldn't approve" message={error} />}

        <div className="space-y-1.5">
          <Label htmlFor="meaning">Signature meaning</Label>
          <Select id="meaning" value={meaning} onChange={(e) => setMeaning(e.target.value)}>
            {SIGNATURE_MEANINGS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="approve-password">Password *</Label>
          <Input
            id="approve-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="approve-totp">Authenticator code</Label>
          <Input
            id="approve-totp"
            inputMode="numeric"
            maxLength={6}
            placeholder="Required for your first signature this session"
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="approve-reason">Reason (optional)</Label>
          <Textarea
            id="approve-reason"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </div>

      <ModalFooter className="gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={approve.isPending}>
          Cancel
        </Button>
        <Button onClick={onSign} disabled={!canSign}>
          {approve.isPending ? "Signing…" : "Sign"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
