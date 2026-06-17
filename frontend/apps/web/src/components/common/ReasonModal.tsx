"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ErrorAlert } from "@/components/ui/error-alert";

interface ReasonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  label?: string;
  defaultReason?: string;
  submitLabel?: string;
  successMessage?: string;
  isPending?: boolean;
  onSubmit: (reason: string) => Promise<void>;
}

export function ReasonModal({
  open,
  onOpenChange,
  title,
  description = "Enter the reason for this workflow action. It will be recorded in the audit trail.",
  label = "Audit reason",
  defaultReason = "",
  submitLabel = "Submit",
  successMessage = "Done",
  isPending,
  onSubmit,
}: ReasonModalProps) {
  const [reason, setReason] = useState(defaultReason);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReason(defaultReason);
      setError(null);
    }
  }, [defaultReason, open]);

  async function submit() {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("A reason is required for the audit trail.");
      return;
    }
    setError(null);
    try {
      await onSubmit(trimmed);
      toast.success(successMessage);
      onOpenChange(false);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Could not complete the action. Please try again.");
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <div className="space-y-3">
        {error && <ErrorAlert title="Action required" message={error} />}
        <div className="space-y-1.5">
          <Label htmlFor="workflow-reason">{label} *</Label>
          <Textarea
            id="workflow-reason"
            rows={4}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Describe why this action is being taken"
          />
        </div>
        <p className="text-label text-muted-foreground">
          This reason supports the workflow audit trail. Electronic signature actions continue to use the signature ceremony.
        </p>
      </div>
      <ModalFooter className="gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={isPending}>
          {isPending ? "Saving..." : submitLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
