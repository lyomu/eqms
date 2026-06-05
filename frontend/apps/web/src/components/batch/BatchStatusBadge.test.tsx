import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BatchStatusBadge } from "./BatchStatusBadge";
import type { BatchStatus } from "@/types/batch";

describe("BatchStatusBadge", () => {
  const cases: Array<{ status: BatchStatus; label: string; classFragment: string }> = [
    { status: "IN_PROGRESS", label: "In Progress", classFragment: "bg-brand-light" },
    { status: "QA_REVIEW", label: "QA Review", classFragment: "bg-warning/20" },
    { status: "RELEASED", label: "Released", classFragment: "bg-success" },
    { status: "REJECTED", label: "Rejected", classFragment: "bg-error/15" },
    { status: "QUARANTINE", label: "Quarantine", classFragment: "bg-warning/20" },
    { status: "RECALLED", label: "Recalled", classFragment: "bg-error/15" },
  ];
  it.each(cases)("renders $status", ({ status, label, classFragment }) => {
    const { container } = render(<BatchStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(container.querySelector(`[data-status="${status}"]`)?.className).toContain(classFragment);
  });
});
