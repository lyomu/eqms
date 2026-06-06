import { test, expect, type Page, type Route } from "@playwright/test";

/** Equipment lifecycle: create -> perform calibration (PASS) -> record maintenance -> audit. */

const me = { id: 1, email: "john@demo.com", fullName: "John Demo", authorities: ["EQUIPMENT_CREATE", "EQUIPMENT_APPROVE", "AUDIT_VIEW"] };
const users = [{ id: 1, fullName: "John Demo", email: "john@demo.com", status: "ACTIVE" }];

function jsonBody(data: unknown, status = 200) { return { status, contentType: "application/json", body: JSON.stringify(data) }; }

async function mockBackend(page: Page) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let e: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cals: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maint: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const audit: any[] = [];
  let aid = 1;
  const push = (action: string, reason: string) => audit.unshift({ id: aid++, action, fieldName: null, oldValue: null, newValue: null, reasonForChange: reason, userId: 1, userFullName: "John Demo", utcTimestamp: "2026-06-05T10:00:00Z", ipAddress: "127.0.0.1", userAgent: "test" });

  await page.route("**/api/auth/me", (r: Route) => r.fulfill(jsonBody(me)));
  await page.route("**/api/users", (r: Route) => r.fulfill(jsonBody(users)));
  await page.route(/\/api\/notifications\/unread-count$/, (r: Route) => r.fulfill(jsonBody({ unread: 0 })));
  await page.route(/\/api\/equipment\/\d+\/audit-trail$/, (r: Route) => r.fulfill(jsonBody(audit)));

  await page.route(/\/api\/equipment\/\d+\/perform-calibration$/, (r: Route) => { const b = r.request().postDataJSON(); e.status = b.result === "PASS" ? "IN_CALIBRATION" : "OUT_OF_CALIBRATION"; e.version++; e.lastCalibrationDate = b.calibrationDate; cals.unshift({ id: cals.length + 1, calibrationDate: b.calibrationDate, calibrationDueDate: b.calibrationDueDate ?? null, performedById: 1, performedByName: b.performedByName ?? null, calibrationCertificatePath: null, results: b.result, nextCalibrationDate: b.calibrationDueDate ?? null, notes: b.notes ?? null }); e.calibrationHistory = cals; push("UPDATE", "Calibration performed"); return r.fulfill(jsonBody(e)); });
  await page.route(/\/api\/equipment\/\d+\/maintenance$/, (r: Route) => { const b = r.request().postDataJSON(); const m = { id: maint.length + 1, maintenanceDate: b.maintenanceDate, maintenanceType: b.maintenanceType, workDescription: b.workDescription, performedById: 1, performedByName: b.performedByName ?? null, downtimeHours: b.downtimeHours ?? null }; maint.unshift(m); e.maintenanceHistory = maint; push("CREATE", "Maintenance recorded"); return r.fulfill(jsonBody(m, 201)); });

  await page.route(/\/api\/equipment\/\d+$/, (r: Route) => { if (r.request().method() !== "GET") return r.fallback(); return r.fulfill(jsonBody(e)); });
  await page.route(/\/api\/equipment(\?|$)/, (r: Route) => {
    if (r.request().method() === "POST") {
      const b = r.request().postDataJSON();
      e = { id: 1, equipmentCode: "EQP-2026-001", equipmentName: b.equipmentName, equipmentType: b.equipmentType, manufacturer: b.manufacturer, model: b.model ?? null, serialNumber: b.serialNumber ?? null, location: b.location ?? null, ownerId: null, acquisitionDate: b.acquisitionDate ?? null, calibrationFrequencyMonths: b.calibrationFrequencyMonths ?? null, nextCalibrationDate: null, lastCalibrationDate: null, status: "REGISTERED", version: 0, createdAt: "2026-06-05T10:00:00Z", createdBy: 1, updatedAt: "2026-06-05T10:00:00Z", calibrationHistory: [], maintenanceHistory: [], specifications: [] };
      push("CREATE", "Equipment created");
      return r.fulfill(jsonBody(e, 201));
    }
    return r.fulfill(jsonBody({ content: e ? [e] : [], page: 0, size: 10, totalElements: e ? 1 : 0, totalPages: 1 }));
  });
}

test("equipment lifecycle: create → calibrate → maintenance → audit", async ({ page }) => {
  await mockBackend(page);
  await page.goto("/equipment/new");
  await page.addStyleTag({ content: "[data-sonner-toaster]{display:none !important}" });
  await page.getByLabel("Name *").fill("Analytical Balance XB-220");
  await page.getByLabel("Manufacturer *").fill("Mettler Toledo");
  await page.getByRole("button", { name: "Create Equipment" }).click();

  await expect(page).toHaveURL(/\/equipment\/1$/);
  await expect(page.getByText("Registered").first()).toBeVisible();

  await page.getByRole("button", { name: "Perform Calibration" }).click();
  await expect(page.getByRole("heading", { name: "Perform Calibration" })).toBeVisible();
  await page.getByLabel(/Calibration date/).fill("2026-06-05");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("In Calibration").first()).toBeVisible();
  // Calibration appears in the (default) Calibration tab with a PASS badge.
  await expect(page.getByText("PASS").first()).toBeVisible();

  // Record maintenance.
  await page.getByRole("button", { name: "Maintenance" }).first().click();
  await expect(page.getByRole("heading", { name: "Record Maintenance" })).toBeVisible();
  await page.getByLabel(/Date/).fill("2026-06-06");
  await page.getByLabel(/Work description/).fill("Replaced internal filter.");
  await page.getByRole("button", { name: "Submit" }).click();

  await page.getByRole("tab", { name: "Audit Trail" }).click();
  await expect(page.getByRole("cell", { name: "CREATE", exact: true }).first()).toBeVisible();
});
