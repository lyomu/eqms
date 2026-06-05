import { test, expect, type Page, type Route } from "@playwright/test";

/**
 * Material lifecycle e2e: create -> submit for approval -> approve (Part 11) -> put on hold ->
 * release -> obsolete, then verify the audit trail. Backend mocked statefully.
 */

const me = { id: 1, email: "john@demo.com", fullName: "John Demo", authorities: ["MATERIAL_CREATE", "MATERIAL_APPROVE", "AUDIT_VIEW"] };
const users = [{ id: 1, fullName: "John Demo", email: "john@demo.com", status: "ACTIVE" }];

function jsonBody(data: unknown, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify(data) };
}

const ACTION_STATUS: Record<string, string> = {
  "submit-for-approval": "PENDING_APPROVAL",
  reject: "REJECTED",
  "put-on-hold": "ON_HOLD",
  release: "APPROVED",
  obsolete: "OBSOLETE",
};

async function mockBackend(page: Page) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mat: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const audit: any[] = [];
  let auditId = 1;
  const pushAudit = (action: string, reason: string) =>
    audit.unshift({ id: auditId++, action, fieldName: null, oldValue: null, newValue: null, reasonForChange: reason, userId: 1, userFullName: "John Demo", utcTimestamp: "2026-06-05T10:00:00Z", ipAddress: "127.0.0.1", userAgent: "test" });

  await page.route("**/api/auth/me", (r: Route) => r.fulfill(jsonBody(me)));
  await page.route("**/api/users", (r: Route) => r.fulfill(jsonBody(users)));
  await page.route(/\/api\/materials\/\d+\/audit-trail$/, (r: Route) => r.fulfill(jsonBody(audit)));
  await page.route(/\/api\/materials\/\d+\/approve$/, (r: Route) => {
    mat.status = "APPROVED"; mat.version += 1;
    pushAudit("SIGN", "Approved"); pushAudit("STATUS_CHANGE", "Approved");
    return r.fulfill(jsonBody(mat));
  });
  await page.route(/\/api\/materials\/\d+\/(submit-for-approval|reject|put-on-hold|release|obsolete)$/, (r: Route) => {
    const action = r.request().url().split("/").pop()!;
    mat.status = ACTION_STATUS[action]; mat.version += 1;
    pushAudit("STATUS_CHANGE", `Action: ${action}`);
    return r.fulfill(jsonBody(mat));
  });
  await page.route(/\/api\/materials\/\d+$/, (r: Route) => {
    if (r.request().method() !== "GET") return r.fallback();
    return r.fulfill(jsonBody(mat));
  });
  await page.route(/\/api\/materials(\?|$)/, (r: Route) => {
    if (r.request().method() === "POST") {
      const body = r.request().postDataJSON();
      mat = { id: 1, materialCode: "MAT-2026-001", name: body.name, materialType: body.materialType, unitOfMeasure: body.unitOfMeasure, specification: body.specification ?? null, description: body.description ?? null, status: "DRAFT", version: 0, createdBy: 1, submittedBy: null, createdAt: "2026-06-05T10:00:00Z", updatedAt: "2026-06-05T10:00:00Z" };
      pushAudit("CREATE", "Material created");
      return r.fulfill(jsonBody(mat, 201));
    }
    return r.fulfill(jsonBody({ content: mat ? [mat] : [], page: 0, size: 10, totalElements: mat ? 1 : 0, totalPages: 1 }));
  });
}

test("material lifecycle: create → approve → hold → release → obsolete", async ({ page }) => {
  await mockBackend(page);

  await page.goto("/materials/new");
  await page.addStyleTag({ content: "[data-sonner-toaster]{display:none !important}" });
  await page.getByLabel("Name *").fill("Microcrystalline Cellulose");
  await page.getByLabel("Type *").selectOption("EXCIPIENT");
  await page.getByRole("button", { name: "Submit for Approval" }).click();

  await expect(page).toHaveURL(/\/materials\/1$/);
  await expect(page.getByRole("heading", { name: "Microcrystalline Cellulose" })).toBeVisible();
  await expect(page.getByText("Pending Approval").first()).toBeVisible();

  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByRole("heading", { name: "Approve Material" })).toBeVisible();
  await page.getByLabel("Password *").fill("Password123!");
  await page.getByRole("button", { name: "Sign" }).click();
  await expect(page.getByText("Approved").first()).toBeVisible();

  page.once("dialog", (d) => d.accept("Investigation pending"));
  await page.getByRole("button", { name: "Put On Hold" }).click();
  await expect(page.getByText("On Hold").first()).toBeVisible();

  await page.getByRole("button", { name: "Release" }).click();
  await expect(page.getByText("Approved").first()).toBeVisible();

  page.once("dialog", (d) => d.accept("Superseded by new grade"));
  await page.getByRole("button", { name: "Obsolete" }).click();
  await expect(page.getByText("Obsolete").first()).toBeVisible();

  await expect(page.getByRole("cell", { name: "CREATE", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "SIGN", exact: true })).toBeVisible();
});
