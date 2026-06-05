import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./StatusBadge";
import type { DocumentStatus } from "@/types/documents";

describe("StatusBadge", () => {
  const cases: Array<{ status: DocumentStatus; label: string; classFragment: string }> = [
    { status: "DRAFT", label: "Draft", classFragment: "bg-muted" },
    { status: "UNDER_REVIEW", label: "Under Review", classFragment: "bg-brand-light" },
    { status: "PENDING_APPROVAL", label: "Pending Approval", classFragment: "bg-warning/20" },
    { status: "APPROVED", label: "Approved", classFragment: "bg-success/15" },
    { status: "EFFECTIVE", label: "Effective", classFragment: "bg-success" },
    { status: "OBSOLETE", label: "Obsolete", classFragment: "bg-slate-200" },
  ];

  it.each(cases)("renders $status with label and color", ({ status, label, classFragment }) => {
    const { container } = render(<StatusBadge status={status} />);
    // Correct human label
    expect(screen.getByText(label)).toBeInTheDocument();
    // Correct status data attribute + color class
    const badge = container.querySelector(`[data-status="${status}"]`);
    expect(badge).not.toBeNull();
    expect(badge?.className).toContain(classFragment);
  });

  it("falls back gracefully for an unknown status", () => {
    // @ts-expect-error testing defensive fallback
    render(<StatusBadge status="WEIRD" />);
    expect(screen.getByText("WEIRD")).toBeInTheDocument();
  });
});
