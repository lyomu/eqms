import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChangeStatusBadge } from "./ChangeStatusBadge";
import type { ChangeStatus } from "@/types/change-control";

describe("ChangeStatusBadge", () => {
  const cases: Array<{ status: ChangeStatus; label: string; classFragment: string }> = [
    { status: "DRAFT", label: "Draft", classFragment: "bg-muted" },
    { status: "UNDER_REVIEW", label: "Under Review", classFragment: "bg-brand-light" },
    { status: "PENDING_APPROVAL", label: "Pending Approval", classFragment: "bg-warning/20" },
    { status: "IN_IMPLEMENTATION", label: "In Implementation", classFragment: "bg-brand-light" },
    { status: "CLOSED", label: "Closed", classFragment: "bg-success" },
    { status: "REJECTED", label: "Rejected", classFragment: "bg-error/15" },
    { status: "CANCELLED", label: "Cancelled", classFragment: "bg-slate-200" },
  ];

  it.each(cases)("renders $status with label and color", ({ status, label, classFragment }) => {
    const { container } = render(<ChangeStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    const badge = container.querySelector(`[data-status="${status}"]`);
    expect(badge).not.toBeNull();
    expect(badge?.className).toContain(classFragment);
  });
});
