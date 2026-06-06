/** Mirrors the backend Equipment & Calibration contract (com.eqms.equipment). Base: /api/equipment. */

export type EquipmentStatus = "REGISTERED" | "IN_CALIBRATION" | "OUT_OF_CALIBRATION" | "RETIRED";
export type CalibrationResult = "PASS" | "FAIL";
export type MaintenanceType = "PREVENTIVE" | "CORRECTIVE";

export type EquipmentType =
  | "BALANCE" | "HPLC" | "INCUBATOR" | "AUTOCLAVE" | "MICROSCOPE" | "CENTRIFUGE"
  | "SPECTROPHOTOMETER" | "PH_METER" | "THERMOMETER" | "REFRIGERATOR"
  | "FREEZE_DRYER" | "DISSOLUTION_TESTER" | "OTHER";

export const EQUIPMENT_TYPES: EquipmentType[] = [
  "BALANCE", "HPLC", "INCUBATOR", "AUTOCLAVE", "MICROSCOPE", "CENTRIFUGE",
  "SPECTROPHOTOMETER", "PH_METER", "THERMOMETER", "REFRIGERATOR",
  "FREEZE_DRYER", "DISSOLUTION_TESTER", "OTHER",
];

export function equipmentTypeLabel(t: string): string {
  return t.split("_").map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(" ");
}

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  REGISTERED: "Registered",
  IN_CALIBRATION: "In Calibration",
  OUT_OF_CALIBRATION: "Out of Calibration",
  RETIRED: "Retired",
};

export const EQUIPMENT_STATUS_CLASSES: Record<EquipmentStatus, string> = {
  REGISTERED: "bg-muted text-muted-foreground",
  IN_CALIBRATION: "bg-success text-white",
  OUT_OF_CALIBRATION: "bg-error/15 text-error",
  RETIRED: "bg-slate-200 text-slate-700",
};

export interface CalibrationSummary {
  id: number;
  calibrationDate: string | null;
  calibrationDueDate: string | null;
  performedById: number | null;
  performedByName: string | null;
  calibrationCertificatePath: string | null;
  results: CalibrationResult;
  nextCalibrationDate: string | null;
  notes: string | null;
}

export interface MaintenanceSummary {
  id: number;
  maintenanceDate: string | null;
  maintenanceType: MaintenanceType;
  workDescription: string;
  performedById: number | null;
  performedByName: string | null;
  downtimeHours: number | null;
}

export interface SpecificationSummary {
  id: number;
  specificationKey: string;
  specificationValue: string | null;
  unit: string | null;
  acceptanceRangeMin: number | null;
  acceptanceRangeMax: number | null;
}

export interface EquipmentResponse {
  id: number;
  equipmentCode: string;
  equipmentName: string;
  equipmentType: EquipmentType;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  location: string | null;
  ownerId: number | null;
  acquisitionDate: string | null;
  calibrationFrequencyMonths: number | null;
  nextCalibrationDate: string | null;
  lastCalibrationDate: string | null;
  status: EquipmentStatus;
  version: number;
  createdAt: string;
  createdBy: number | null;
  updatedAt: string;
  calibrationHistory: CalibrationSummary[];
  maintenanceHistory: MaintenanceSummary[];
  specifications: SpecificationSummary[];
}
