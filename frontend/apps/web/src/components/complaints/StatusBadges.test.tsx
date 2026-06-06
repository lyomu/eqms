import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ComplaintStatusBadge } from "@/components/complaints/ComplaintStatusBadge";
import { AuditStatusBadge } from "@/components/audits/AuditStatusBadge";
import { RiskStatusBadge } from "@/components/risks/RiskStatusBadge";
import type { ComplaintStatus } from "@/types/complaint";
import type { AuditStatus } from "@/types/audit";
import type { RiskStatus } from "@/types/risk";

describe("ComplaintStatusBadge", () => {
  const cases: Array<[ComplaintStatus, string, string]> = [
    ["OPEN", "Open", "bg-muted"],
    ["UNDER_INVESTIGATION", "Under Investigation", "bg-brand-light"],
    ["RESOLVED", "Resolved", "bg-success/15"],
    ["CLOSED", "Closed", "bg-success"],
    ["CANCELLED", "Cancelled", "bg-slate-200"],
  ];
  it.each(cases)("%s", (status, label, frag) => {
    const { container } = render(<ComplaintStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(container.querySelector(`[data-status="${status}"]`)?.className).toContain(frag);
  });
});

describe("AuditStatusBadge", () => {
  const cases: Array<[AuditStatus, string, string]> = [
    ["PLANNED", "Planned", "bg-muted"],
    ["IN_PROGRESS", "In Progress", "bg-brand-light"],
    ["COMPLETED", "Completed", "bg-success"],
    ["FOLLOW_UP", "Follow-up", "bg-warning/20"],
  ];
  it.each(cases)("%s", (status, label, frag) => {
    const { container } = render(<AuditStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(container.querySelector(`[data-status="${status}"]`)?.className).toContain(frag);
  });
});

describe("RiskStatusBadge", () => {
  const cases: Array<[RiskStatus, string, string]> = [
    ["IDENTIFIED", "Identified", "bg-muted"],
    ["ANALYZED", "Analyzed", "bg-brand-light"],
    ["MITIGATED", "Mitigated", "bg-success/15"],
    ["ACCEPTED", "Accepted", "bg-success"],
  ];
  it.each(cases)("%s", (status, label, frag) => {
    const { container } = render(<RiskStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(container.querySelector(`[data-status="${status}"]`)?.className).toContain(frag);
  });
});
