import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EquipmentStatusBadge } from "@/components/equipment/EquipmentStatusBadge";
import { OosStatusBadge } from "@/components/oos/OosStatusBadge";
import type { EquipmentStatus } from "@/types/equipment";
import type { OosStatus } from "@/types/oos";

describe("EquipmentStatusBadge", () => {
  const cases: Array<[EquipmentStatus, string, string]> = [
    ["REGISTERED", "Registered", "bg-muted"],
    ["IN_CALIBRATION", "In Calibration", "bg-success"],
    ["OUT_OF_CALIBRATION", "Out of Calibration", "bg-error/15"],
    ["RETIRED", "Retired", "bg-slate-200"],
  ];
  it.each(cases)("%s", (status, label, frag) => {
    const { container } = render(<EquipmentStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(container.querySelector(`[data-status="${status}"]`)?.className).toContain(frag);
  });
});

describe("OosStatusBadge", () => {
  const cases: Array<[OosStatus, string, string]> = [
    ["REPORTED", "Reported", "bg-muted"],
    ["AWAITING_REPEAT", "Awaiting Repeat", "bg-warning/20"],
    ["INVESTIGATING", "Investigating", "bg-brand-light"],
    ["DISPOSITION_DETERMINED", "Disposition Determined", "bg-success/15"],
    ["CLOSED", "Closed", "bg-success"],
  ];
  it.each(cases)("%s", (status, label, frag) => {
    const { container } = render(<OosStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(container.querySelector(`[data-status="${status}"]`)?.className).toContain(frag);
  });
});
