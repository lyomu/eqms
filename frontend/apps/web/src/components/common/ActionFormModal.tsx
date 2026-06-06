"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ErrorAlert } from "@/components/ui/error-alert";

export interface FieldDef {
  name: string;
  label: string;
  type?: "text" | "textarea" | "select" | "date" | "number";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}

interface ActionFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: FieldDef[];
  submitLabel?: string;
  isPending?: boolean;
  successMessage?: string;
  /** Submit the collected values; throw to surface an inline error. */
  onSubmit: (values: Record<string, string>) => Promise<void>;
}

/**
 * Config-driven form modal reused across modules for structured sub-actions
 * (investigate, record root cause, add finding, hazard analysis, …). Signature
 * ceremonies use SignatureModal instead.
 */
export function ActionFormModal({
  open,
  onOpenChange,
  title,
  description,
  fields,
  submitLabel = "Submit",
  isPending,
  successMessage = "Saved",
  onSubmit,
}: ActionFormModalProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  // Reset to defaults whenever the modal opens.
  useEffect(() => {
    if (open) {
      const init: Record<string, string> = {};
      fields.forEach((f) => {
        init[f.name] = f.defaultValue ?? (f.type === "select" ? (f.options?.[0]?.value ?? "") : "");
      });
      setValues(init);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const missingRequired = fields.some((f) => f.required && !values[f.name]?.trim());

  async function submit() {
    setError(null);
    try {
      await onSubmit(values);
      toast.success(successMessage);
      onOpenChange(false);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Could not save. Please try again.");
    }
  }

  function set(name: string, v: string) {
    setValues((prev) => ({ ...prev, [name]: v }));
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <div className="space-y-3">
        {error && <ErrorAlert title="Couldn't save" message={error} />}
        {fields.map((f) => {
          const id = `af-${f.name}`;
          return (
            <div key={f.name} className="space-y-1.5">
              <Label htmlFor={id}>{f.label}{f.required ? " *" : ""}</Label>
              {f.type === "textarea" ? (
                <Textarea id={id} rows={3} value={values[f.name] ?? ""} placeholder={f.placeholder} onChange={(e) => set(f.name, e.target.value)} />
              ) : f.type === "select" ? (
                <Select id={id} value={values[f.name] ?? ""} onChange={(e) => set(f.name, e.target.value)}>
                  {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              ) : (
                <Input
                  id={id}
                  type={f.type === "date" ? "date" : f.type === "number" ? "text" : "text"}
                  inputMode={f.type === "number" ? "numeric" : undefined}
                  value={values[f.name] ?? ""}
                  placeholder={f.placeholder}
                  onChange={(e) => set(f.name, e.target.value)}
                />
              )}
            </div>
          );
        })}
      </div>
      <ModalFooter className="gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
        <Button onClick={submit} disabled={isPending || missingRequired}>{isPending ? "Saving…" : submitLabel}</Button>
      </ModalFooter>
    </Modal>
  );
}
