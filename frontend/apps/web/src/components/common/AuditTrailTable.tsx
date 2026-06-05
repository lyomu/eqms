import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ErrorAlert } from "@/components/ui/error-alert";
import { formatDateTime } from "@/lib/format";
import type { AuditEntry } from "@/types/common";

interface AuditTrailTableProps {
  entries: AuditEntry[] | undefined;
  isLoading: boolean;
  isError: boolean;
}

/** Read-only audit-trail table (who / what / when UTC / field change / reason). Reused per module. */
export function AuditTrailTable({ entries, isLoading, isError }: AuditTrailTableProps) {
  if (isLoading) return <LoadingSpinner label="Loading audit trail…" />;
  if (isError)
    return (
      <ErrorAlert
        title="Audit trail unavailable"
        message="You may not have permission to view the audit trail (AUDIT_VIEW required)."
      />
    );
  if (!entries || entries.length === 0)
    return <p className="text-body text-muted-foreground">No audit entries.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-body">
        <thead>
          <tr className="border-b border-border text-left text-label uppercase text-muted-foreground">
            <th className="py-2 pr-4">When (UTC)</th>
            <th className="py-2 pr-4">Who</th>
            <th className="py-2 pr-4">Action</th>
            <th className="py-2 pr-4">Field</th>
            <th className="py-2 pr-4">Old → New</th>
            <th className="py-2">Reason</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-b border-border align-top last:border-0">
              <td className="py-2 pr-4 whitespace-nowrap text-label">{formatDateTime(e.utcTimestamp)}</td>
              <td className="py-2 pr-4">{e.userFullName ?? `User #${e.userId}`}</td>
              <td className="py-2 pr-4">{e.action}</td>
              <td className="py-2 pr-4">{e.fieldName ?? "—"}</td>
              <td className="py-2 pr-4 text-label">
                {e.fieldName ? `${e.oldValue ?? "∅"} → ${e.newValue ?? "∅"}` : (e.newValue ?? "—")}
              </td>
              <td className="py-2">{e.reasonForChange ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
