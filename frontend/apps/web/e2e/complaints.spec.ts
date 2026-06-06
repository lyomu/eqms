import { test, expect, type Page, type Route } from "@playwright/test";

/** Complaint lifecycle: create -> acknowledge (Part 11) -> investigate -> resolve -> close (Part 11) -> audit. */

const me = { id: 1, email: "john@demo.com", fullName: "John Demo", authorities: ["COMPLAINT_CREATE", "COMPLAINT_APPROVE", "AUDIT_VIEW"] };
const users = [{ id: 1, fullName: "John Demo", email: "john@demo.com", status: "ACTIVE" }];
const product = { id: 5, productCode: "PROD-2026-001", name: "Paracetamol", dosageForm: "TABLET", strength: "500 mg", description: null, registrationNumber: null, status: "ACTIVE", version: 2, createdBy: 1, submittedBy: 1, createdAt: "2026-06-01T00:00:00Z", updatedAt: "2026-06-01T00:00:00Z" };

function jsonBody(data: unknown, status = 200) { return { status, contentType: "application/json", body: JSON.stringify(data) }; }

async function mockBackend(page: Page) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let c: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const audit: any[] = [];
  let aid = 1;
  const push = (action: string, reason: string) => audit.unshift({ id: aid++, action, fieldName: null, oldValue: null, newValue: null, reasonForChange: reason, userId: 1, userFullName: "John Demo", utcTimestamp: "2026-06-05T10:00:00Z", ipAddress: "127.0.0.1", userAgent: "test" });

  await page.route("**/api/auth/me", (r: Route) => r.fulfill(jsonBody(me)));
  await page.route("**/api/users", (r: Route) => r.fulfill(jsonBody(users)));
  await page.route(/\/api\/notifications\/unread-count$/, (r: Route) => r.fulfill(jsonBody({ unread: 0 })));
  await page.route(/\/api\/products(\?|$)/, (r: Route) => r.fulfill(jsonBody({ content: [product], page: 0, size: 100, totalElements: 1, totalPages: 1 })));
  await page.route(/\/api\/complaints\/\d+\/audit-trail$/, (r: Route) => r.fulfill(jsonBody(audit)));

  await page.route(/\/api\/complaints\/\d+\/acknowledge$/, (r: Route) => { c.status = "ACKNOWLEDGED"; c.version++; push("SIGN", "Acknowledged"); return r.fulfill(jsonBody(c)); });
  await page.route(/\/api\/complaints\/\d+\/investigate$/, (r: Route) => { const b = r.request().postDataJSON(); c.status = "UNDER_INVESTIGATION"; c.version++; c.investigation = { investigationFindings: b.investigationFindings, investigatorId: 1, investigationDate: "2026-06-05T10:00:00Z", rootCause: null, rootCauseMethod: null, impactOnProduct: null }; push("UPDATE", "Investigated"); return r.fulfill(jsonBody(c)); });
  await page.route(/\/api\/complaints\/\d+\/resolution$/, (r: Route) => { const b = r.request().postDataJSON(); c.status = "RESOLVED"; c.version++; c.resolution = { resolutionDescription: b.resolutionDescription, resolutionDate: "2026-06-05T10:00:00Z", resolvedBy: 1 }; push("UPDATE", "Resolved"); return r.fulfill(jsonBody(c)); });
  await page.route(/\/api\/complaints\/\d+\/close$/, (r: Route) => { c.status = "CLOSED"; c.version++; push("SIGN", "Closed"); return r.fulfill(jsonBody(c)); });

  await page.route(/\/api\/complaints\/\d+$/, (r: Route) => { if (r.request().method() !== "GET") return r.fallback(); return r.fulfill(jsonBody(c)); });
  await page.route(/\/api\/complaints(\?|$)/, (r: Route) => {
    if (r.request().method() === "POST") {
      const b = r.request().postDataJSON();
      c = { id: 1, complaintNo: "COMPL-2026-001", productId: b.productId, complaintDescription: b.complaintDescription, source: b.source, severity: b.severity, status: "OPEN", version: 0, reportedDate: "2026-06-05T10:00:00Z", reportedBy: b.reportedBy ?? null, ownerId: 1, submittedBy: null, closedDate: null, createdAt: "2026-06-05T10:00:00Z", createdBy: 1, updatedAt: "2026-06-05T10:00:00Z", investigation: null, resolution: null, linkedCapaIds: [] };
      push("CREATE", "Complaint created");
      return r.fulfill(jsonBody(c, 201));
    }
    return r.fulfill(jsonBody({ content: c ? [c] : [], page: 0, size: 10, totalElements: c ? 1 : 0, totalPages: 1 }));
  });
}

test("complaint lifecycle to closed + audit", async ({ page }) => {
  await mockBackend(page);
  await page.goto("/complaints/new");
  await page.addStyleTag({ content: "[data-sonner-toaster]{display:none !important}" });
  await page.getByLabel("Product *").selectOption("5");
  await page.getByLabel("Description *").fill("Tablet discoloration reported by customer.");
  await page.getByRole("button", { name: "Create Complaint" }).click();

  await expect(page).toHaveURL(/\/complaints\/1$/);
  await expect(page.getByText("Open", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Acknowledge" }).click();
  await expect(page.getByRole("heading", { name: "Acknowledge Complaint" })).toBeVisible();
  await page.getByLabel("Password *").fill("Password123!");
  await page.getByRole("button", { name: "Sign" }).click();
  await expect(page.getByText("Acknowledged").first()).toBeVisible();

  await page.getByRole("button", { name: "Investigate" }).click();
  await expect(page.getByRole("heading", { name: "Investigate" })).toBeVisible();
  await page.getByLabel(/Investigation findings/).fill("Root caused to packaging line humidity.");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Under Investigation").first()).toBeVisible();

  await page.getByRole("button", { name: "Resolve" }).click();
  await expect(page.getByRole("heading", { name: "Resolve Complaint" })).toBeVisible();
  await page.getByLabel(/Resolution/).fill("Adjusted line humidity controls; customer notified.");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Resolved").first()).toBeVisible();

  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Close Complaint" })).toBeVisible();
  await page.getByLabel("Password *").fill("Password123!");
  await page.getByRole("button", { name: "Sign" }).click();
  await expect(page.getByText("Closed", { exact: true }).first()).toBeVisible();

  await expect(page.getByRole("cell", { name: "SIGN", exact: true }).first()).toBeVisible();
});
