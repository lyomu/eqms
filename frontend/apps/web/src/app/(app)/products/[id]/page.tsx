"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  useProduct,
  useProductAudit,
  useProductTransition,
  useApproveProduct,
  type ProductAction,
} from "@/hooks/useProduct";
import { useUsers } from "@/hooks/useDocuments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { ErrorAlert } from "@/components/ui/error-alert";
import { ProductStatusBadge } from "@/components/products/ProductStatusBadge";
import { SignatureModal } from "@/components/common/SignatureModal";
import { AuditTrailTable } from "@/components/common/AuditTrailTable";
import { formatDate } from "@/lib/format";
import { DOSAGE_FORM_LABELS } from "@/types/product";

export default function ProductDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  const product = useProduct(id);
  const audit = useProductAudit(id);
  const transition = useProductTransition();
  const approve = useApproveProduct();
  const users = useUsers();
  const [approveOpen, setApproveOpen] = useState(false);

  const ownerName = useMemo(() => {
    const by = product.data?.createdBy;
    if (!by) return "—";
    return users.data?.find((u) => u.id === by)?.fullName ?? `User #${by}`;
  }, [product.data, users.data]);

  if (product.isLoading) return <LoadingScreen label="Loading product…" />;
  if (product.isError || !product.data) return <ErrorAlert title="Error" message="Failed to load this product." />;
  const p = product.data;

  async function runAction(act: ProductAction, reason: string) {
    try {
      await transition.mutateAsync({ id, action: act, expectedVersion: p.version, reason });
      toast.success("Done");
    } catch {
      /* interceptor surfaces errors */
    }
  }

  function promptAction(act: ProductAction, message: string, fallback: string) {
    const reason = window.prompt(message);
    if (reason === null) return;
    runAction(act, reason || fallback);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-label text-muted-foreground">
            <Link href="/products" className="hover:underline">Product Management</Link>
            <span>/</span>
            <span>{p.productCode}</span>
          </div>
          <h1 className="text-h1 text-brand-primary">{p.name}</h1>
          <div className="mt-1"><ProductStatusBadge status={p.status} /></div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {p.status === "DRAFT" && (
            <>
              <Button asChild variant="outline"><Link href={`/products/${id}/edit`}>Edit</Link></Button>
              <Button onClick={() => runAction("submit-for-approval", "Submitted for approval")} disabled={transition.isPending}>Submit for Approval</Button>
            </>
          )}
          {p.status === "PENDING_APPROVAL" && (
            <>
              <Button variant="outline" onClick={() => promptAction("reject", "Reason for rejection:", "Rejected")} disabled={transition.isPending}>Reject</Button>
              <Button onClick={() => setApproveOpen(true)}>Approve</Button>
            </>
          )}
          {p.status === "ACTIVE" && (
            <>
              <Button variant="outline" onClick={() => promptAction("put-on-hold", "Reason for hold:", "On hold")} disabled={transition.isPending}>Put On Hold</Button>
              <Button variant="outline" onClick={() => promptAction("discontinue", "Reason for discontinuation:", "Discontinued")} disabled={transition.isPending}>Discontinue</Button>
            </>
          )}
          {p.status === "ON_HOLD" && (
            <>
              <Button onClick={() => runAction("resume", "Resumed")} disabled={transition.isPending}>Resume</Button>
              <Button variant="outline" onClick={() => promptAction("discontinue", "Reason for discontinuation:", "Discontinued")} disabled={transition.isPending}>Discontinue</Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Master Data</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-3 text-body">
              <Field label="Code" value={p.productCode} />
              <Field label="Name" value={p.name} />
              <Field label="Dosage Form" value={DOSAGE_FORM_LABELS[p.dosageForm]} />
              <Field label="Strength" value={p.strength || "—"} />
              <Field label="Registration No." value={p.registrationNumber || "—"} />
              <Field label="Status" value={<ProductStatusBadge status={p.status} />} />
              <Field label="Owner" value={ownerName} />
              <Field label="Created" value={formatDate(p.createdAt)} />
              <Field label="Last Modified" value={formatDate(p.updatedAt)} />
            </dl>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Description</CardTitle></CardHeader>
          <CardContent><p className="whitespace-pre-wrap text-body">{p.description || "—"}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Audit Trail</CardTitle></CardHeader>
        <CardContent>
          <AuditTrailTable entries={audit.data} isLoading={audit.isLoading} isError={audit.isError} />
        </CardContent>
      </Card>

      <SignatureModal
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="Approve Product"
        recordNumber={p.productCode}
        recordTitle={p.name}
        recordNoun="product"
        statusNode={<ProductStatusBadge status={p.status} />}
        isPending={approve.isPending}
        successMessage="Approved successfully"
        onSign={async (creds) => {
          await approve.mutateAsync({ id, expectedVersion: p.version, password: creds.password, totpCode: creds.totpCode, reason: creds.reason, meaningStatement: creds.meaningStatement });
        }}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-label text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
