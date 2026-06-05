import { test, expect, type Page, type Route } from "@playwright/test";

/**
 * Batch Record lifecycle e2e: create -> record a production step -> submit to QA ->
 * release (Part 11) -> verify audit trail. Backend mocked statefully.
 */

const me = { id: 1, email: "john@demo.com", fullName: "John Demo", authorities: ["BATCH_CREATE", "BATCH_RELEASE", "AUDIT_VIEW"] };
const users = [{ id: 1, fullName: "John Demo", email: "john@demo.com", status: "ACTIVE" }];
const activeProduct = {
  id: 5, productCode: "PROD-2026-001", name: "Paracetamol 500mg", dosageForm: "TABLET", strength: "500 mg",
  description: null, registrationNumber: null, status: "ACTIVE", version: 2, createdBy: 1, submittedBy: 1,
  createdAt: "2026-06-01T00:00:00Z", updatedAt: "2026-06-01T00:00:00Z",
};

function jsonBody(data: unknown, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify(data) };
}

async function mockBackend(page: Page) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let batch: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const steps: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const audit: any[] = [];
  let auditId = 1;
  const pushAudit = (action: string, reason: string) =>
    audit.unshift({ id: auditId++, action, fieldName: null, oldValue: null, newValue: null, reasonForChange: reason, userId: 1, userFullName: "John Demo", utcTimestamp: "2026-06-05T10:00:00Z", ipAddress: "127.0.0.1", userAgent: "test" });

  await page.route("**/api/auth/me", (r: Route) => r.fulfill(jsonBody(me)));
  await page.route("**/api/users", (r: Route) => r.fulfill(jsonBody(users)));
  await page.route(/\/api\/notifications\/unread-count$/, (r: Route) => r.fulfill(jsonBody({ unread: 0 })));
  await page.route(/\/api\/products(\?|$)/, (r: Route) =>
    r.fulfill(jsonBody({ content: [activeProduct], page: 0, size: 100, totalElements: 1, totalPages: 1 })));

  await page.route(/\/api\/batch-records\/\d+\/traceability$/, (r: Route) =>
    r.fulfill(jsonBody({ batchRecordId: 1, batchNo: batch?.batchNo, productCode: batch?.productCode, materialsUsed: [], productsProduced: [] })));
  await page.route(/\/api\/batch-records\/\d+\/deviations$/, (r: Route) => r.fulfill(jsonBody([])));
  await page.route(/\/api\/batch-records\/\d+\/audit-trail$/, (r: Route) => r.fulfill(jsonBody(audit)));

  await page.route(/\/api\/batch-records\/\d+\/record-step$/, (r: Route) => {
    const body = r.request().postDataJSON();
    steps.push({ id: steps.length + 1, batchRecordId: 1, stepNumber: body.stepNumber, stepDescription: body.stepDescription, equipmentUsed: body.equipmentUsed, operatorId: null, startTime: body.startTime, endTime: body.endTime, parametersRecorded: body.parametersRecorded, anomaliesNoted: body.anomaliesNoted, createdAt: "2026-06-05T10:00:00Z", createdBy: 1 });
    batch.productionSteps = steps;
    pushAudit("CREATE", "Step recorded");
    return r.fulfill(jsonBody(steps[steps.length - 1], 201));
  });

  await page.route(/\/api\/batch-records\/\d+\/qa-review$/, (r: Route) => {
    batch.status = "QA_REVIEW"; batch.version += 1;
    pushAudit("STATUS_CHANGE", "Submitted for QA review");
    return r.fulfill(jsonBody(batch));
  });
  await page.route(/\/api\/batch-records\/\d+\/release$/, (r: Route) => {
    batch.status = "RELEASED"; batch.version += 1;
    pushAudit("SIGN", "Released"); pushAudit("STATUS_CHANGE", "Released");
    return r.fulfill(jsonBody(batch));
  });
  await page.route(/\/api\/batch-records\/\d+$/, (r: Route) => {
    if (r.request().method() !== "GET") return r.fallback();
    return r.fulfill(jsonBody(batch));
  });
  await page.route(/\/api\/batch-records(\?|$)/, (r: Route) => {
    if (r.request().method() === "POST") {
      const body = r.request().postDataJSON();
      batch = { id: 1, batchNo: "BATCH-2026-001", productId: body.productId, productCode: body.productCode, batchSize: body.batchSize, unit: body.unit, manufacturingStartDate: body.manufacturingStartDate, manufacturingEndDate: null, notes: body.notes ?? null, status: "IN_PROGRESS", version: 0, submittedBy: null, releasedBy: null, releasedAt: null, createdAt: "2026-06-05T10:00:00Z", createdBy: 1, updatedAt: "2026-06-05T10:00:00Z", productionSteps: steps, qcResults: [] };
      pushAudit("CREATE", "Batch created");
      return r.fulfill(jsonBody(batch, 201));
    }
    return r.fulfill(jsonBody({ content: batch ? [batch] : [], page: 0, size: 10, totalElements: batch ? 1 : 0, totalPages: 1 }));
  });
}

test("batch lifecycle: create → record step → QA → release → audit", async ({ page }) => {
  await mockBackend(page);

  await page.goto("/batch-records/new");
  await page.addStyleTag({ content: "[data-sonner-toaster]{display:none !important}" });
  await page.getByLabel("Product *").selectOption("5");
  await page.getByLabel("Batch size *").fill("1000");
  await page.getByLabel("Mfg start *").fill("2026-06-05T08:00");
  await page.getByRole("button", { name: "Create Batch" }).click();

  await expect(page).toHaveURL(/\/batch-records\/1$/);
  await expect(page.getByRole("heading", { name: "BATCH-2026-001" })).toBeVisible();
  await expect(page.getByText("In Progress").first()).toBeVisible();

  // Record a production step.
  await page.getByRole("button", { name: "Record Step" }).click();
  await expect(page.getByRole("heading", { name: "Record Production Step" })).toBeVisible();
  await page.getByLabel("Description").fill("Weigh and charge API");
  await page.getByLabel("Start").fill("2026-06-05T08:30");
  await page.getByRole("button", { name: "Record" }).click();
  await expect(page.getByText("Weigh and charge API")).toBeVisible();

  // Submit to QA, then release with a Part 11 signature.
  await page.getByRole("button", { name: "Submit to QA" }).click();
  await expect(page.getByText("QA Review").first()).toBeVisible();
  await page.getByRole("button", { name: "Release" }).click();
  await expect(page.getByRole("heading", { name: "Release Batch" })).toBeVisible();
  await page.getByLabel("Password *").fill("Password123!");
  await page.getByRole("button", { name: "Sign" }).click();
  await expect(page.getByText("Released").first()).toBeVisible();

  // Audit trail.
  await page.getByRole("tab", { name: "Audit Trail" }).click();
  await expect(page.getByRole("cell", { name: "SIGN", exact: true })).toBeVisible();
});
