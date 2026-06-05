import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductStatusBadge } from "@/components/products/ProductStatusBadge";
import { MaterialStatusBadge } from "@/components/materials/MaterialStatusBadge";
import type { ProductStatus } from "@/types/product";
import type { MaterialStatus } from "@/types/material";

describe("ProductStatusBadge", () => {
  const cases: Array<{ status: ProductStatus; label: string; classFragment: string }> = [
    { status: "DRAFT", label: "Draft", classFragment: "bg-muted" },
    { status: "PENDING_APPROVAL", label: "Pending Approval", classFragment: "bg-warning/20" },
    { status: "ACTIVE", label: "Active", classFragment: "bg-success" },
    { status: "ON_HOLD", label: "On Hold", classFragment: "bg-warning/20" },
    { status: "DISCONTINUED", label: "Discontinued", classFragment: "bg-slate-200" },
    { status: "REJECTED", label: "Rejected", classFragment: "bg-error/15" },
  ];
  it.each(cases)("renders $status", ({ status, label, classFragment }) => {
    const { container } = render(<ProductStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(container.querySelector(`[data-status="${status}"]`)?.className).toContain(classFragment);
  });
});

describe("MaterialStatusBadge", () => {
  const cases: Array<{ status: MaterialStatus; label: string; classFragment: string }> = [
    { status: "DRAFT", label: "Draft", classFragment: "bg-muted" },
    { status: "PENDING_APPROVAL", label: "Pending Approval", classFragment: "bg-warning/20" },
    { status: "APPROVED", label: "Approved", classFragment: "bg-success" },
    { status: "OBSOLETE", label: "Obsolete", classFragment: "bg-slate-200" },
    { status: "REJECTED", label: "Rejected", classFragment: "bg-error/15" },
  ];
  it.each(cases)("renders $status", ({ status, label, classFragment }) => {
    const { container } = render(<MaterialStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(container.querySelector(`[data-status="${status}"]`)?.className).toContain(classFragment);
  });
});
