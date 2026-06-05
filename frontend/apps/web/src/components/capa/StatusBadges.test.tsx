import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CapaStatusBadge } from "@/components/capa/CapaStatusBadge";
import { DeviationStatusBadge } from "@/components/deviations/DeviationStatusBadge";
import type { CapaStatus } from "@/types/capa";
import type { DeviationStatus } from "@/types/deviation";

describe("CapaStatusBadge", () => {
  const cases: Array<{ status: CapaStatus; label: string; classFragment: string }> = [
    { status: "DRAFT", label: "Draft", classFragment: "bg-muted" },
    { status: "UNDER_INVESTIGATION", label: "Under Investigation", classFragment: "bg-brand-light" },
    { status: "PENDING_EFFECTIVENESS_CHECK", label: "Pending Effectiveness", classFragment: "bg-warning/20" },
    { status: "CLOSED", label: "Closed", classFragment: "bg-success" },
    { status: "REJECTED", label: "Rejected", classFragment: "bg-error/15" },
  ];
  it.each(cases)("renders $status", ({ status, label, classFragment }) => {
    const { container } = render(<CapaStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(container.querySelector(`[data-status="${status}"]`)?.className).toContain(classFragment);
  });
});

describe("DeviationStatusBadge", () => {
  const cases: Array<{ status: DeviationStatus; label: string; classFragment: string }> = [
    { status: "DRAFT", label: "Draft", classFragment: "bg-muted" },
    { status: "UNDER_INVESTIGATION", label: "Under Investigation", classFragment: "bg-brand-light" },
    { status: "PENDING_APPROVAL", label: "Pending Approval", classFragment: "bg-warning/20" },
    { status: "CLOSED", label: "Closed", classFragment: "bg-success" },
    { status: "CANCELLED", label: "Cancelled", classFragment: "bg-slate-200" },
  ];
  it.each(cases)("renders $status", ({ status, label, classFragment }) => {
    const { container } = render(<DeviationStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(container.querySelector(`[data-status="${status}"]`)?.className).toContain(classFragment);
  });
});
