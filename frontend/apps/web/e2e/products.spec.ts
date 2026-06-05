import { test, expect, type Page, type Route } from "@playwright/test";

/**
 * Product lifecycle e2e: create -> submit for approval -> approve (Part 11) -> put on hold ->
 * resume -> discontinue, then verify the audit trail. Backend mocked statefully.
 */

const me = { id: 1, email: "john@demo.com", fullName: "John Demo", authorities: ["PRODUCT_CREATE", "PRODUCT_APPROVE", "AUDIT_VIEW"] };
const users = [{ id: 1, fullName: "John Demo", email: "john@demo.com", status: "ACTIVE" }];

function jsonBody(data: unknown, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify(data) };
}

const ACTION_STATUS: Record<string, string> = {
  "submit-for-approval": "PENDING_APPROVAL",
  reject: "REJECTED",
  "put-on-hold": "ON_HOLD",
  resume: "ACTIVE",
  discontinue: "DISCONTINUED",
};

async function mockBackend(page: Page) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prod: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const audit: any[] = [];
  let auditId = 1;
  const pushAudit = (action: string, reason: string) =>
    audit.unshift({ id: auditId++, action, fieldName: null, oldValue: null, newValue: null, reasonForChange: reason, userId: 1, userFullName: "John Demo", utcTimestamp: "2026-06-05T10:00:00Z", ipAddress: "127.0.0.1", userAgent: "test" });

  await page.route("**/api/auth/me", (r: Route) => r.fulfill(jsonBody(me)));
  await page.route("**/api/users", (r: Route) => r.fulfill(jsonBody(users)));
  await page.route(/\/api\/notifications\/unread-count$/, (r: Route) => r.fulfill(jsonBody({ unread: 0 })));
  await page.route(/\/api\/products\/\d+\/audit-trail$/, (r: Route) => r.fulfill(jsonBody(audit)));
  await page.route(/\/api\/products\/\d+\/approve$/, (r: Route) => {
    prod.status = "ACTIVE"; prod.version += 1;
    pushAudit("SIGN", "Approved"); pushAudit("STATUS_CHANGE", "Approved");
    return r.fulfill(jsonBody(prod));
  });
  await page.route(/\/api\/products\/\d+\/(submit-for-approval|reject|put-on-hold|resume|discontinue)$/, (r: Route) => {
    const action = r.request().url().split("/").pop()!;
    prod.status = ACTION_STATUS[action]; prod.version += 1;
    pushAudit("STATUS_CHANGE", `Action: ${action}`);
    return r.fulfill(jsonBody(prod));
  });
  await page.route(/\/api\/products\/\d+$/, (r: Route) => {
    if (r.request().method() !== "GET") return r.fallback();
    return r.fulfill(jsonBody(prod));
  });
  await page.route(/\/api\/products(\?|$)/, (r: Route) => {
    if (r.request().method() === "POST") {
      const body = r.request().postDataJSON();
      prod = { id: 1, productCode: "PROD-2026-001", name: body.name, dosageForm: body.dosageForm, strength: body.strength ?? null, description: body.description ?? null, registrationNumber: body.registrationNumber ?? null, status: "DRAFT", version: 0, createdBy: 1, submittedBy: null, createdAt: "2026-06-05T10:00:00Z", updatedAt: "2026-06-05T10:00:00Z" };
      pushAudit("CREATE", "Product created");
      return r.fulfill(jsonBody(prod, 201));
    }
    return r.fulfill(jsonBody({ content: prod ? [prod] : [], page: 0, size: 10, totalElements: prod ? 1 : 0, totalPages: 1 }));
  });
}

test("product lifecycle: create → approve → hold → resume → discontinue", async ({ page }) => {
  await mockBackend(page);

  await page.goto("/products/new");
  await page.addStyleTag({ content: "[data-sonner-toaster]{display:none !important}" });
  await page.getByLabel("Name *").fill("Paracetamol 500mg Tablets");
  await page.getByRole("button", { name: "Submit for Approval" }).click();

  await expect(page).toHaveURL(/\/products\/1$/);
  await expect(page.getByRole("heading", { name: "Paracetamol 500mg Tablets" })).toBeVisible();
  await expect(page.getByText("Pending Approval").first()).toBeVisible();

  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByRole("heading", { name: "Approve Product" })).toBeVisible();
  await page.getByLabel("Password *").fill("Password123!");
  await page.getByRole("button", { name: "Sign" }).click();
  await expect(page.getByText("Active").first()).toBeVisible();

  page.once("dialog", (d) => d.accept("Temporary supply issue"));
  await page.getByRole("button", { name: "Put On Hold" }).click();
  await expect(page.getByText("On Hold").first()).toBeVisible();

  await page.getByRole("button", { name: "Resume" }).click();
  await expect(page.getByText("Active").first()).toBeVisible();

  page.once("dialog", (d) => d.accept("End of life"));
  await page.getByRole("button", { name: "Discontinue" }).click();
  await expect(page.getByText("Discontinued").first()).toBeVisible();

  await expect(page.getByRole("cell", { name: "CREATE", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "SIGN", exact: true })).toBeVisible();
});
