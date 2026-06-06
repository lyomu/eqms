import { test, expect, type Page, type Route } from "@playwright/test";

const me = { id: 1, email: "john@demo.com", fullName: "John Demo", authorities: ["NC_CREATE", "NC_APPROVE", "AUDIT_VIEW"] };
function jsonBody(data: unknown, status = 200) { return { status, contentType: "application/json", body: JSON.stringify(data) }; }

async function mockBackend(page: Page) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let nc: any = null;
  const audit: any[] = [];
  const push = (action: string, reason: string) => audit.unshift({ id: audit.length + 1, action, fieldName: null, oldValue: null, newValue: null, reasonForChange: reason, userId: 1, userFullName: "John Demo", utcTimestamp: "2026-06-05T10:00:00Z", ipAddress: "127.0.0.1", userAgent: "test" });
  await page.route("**/api/auth/me", (r: Route) => r.fulfill(jsonBody(me)));
  await page.route(/\/api\/notifications\/unread-count$/, (r: Route) => r.fulfill(jsonBody({ unread: 0 })));
  await page.route(/\/api\/non-conformances\/\d+\/audit-trail$/, (r: Route) => r.fulfill(jsonBody(audit)));
  await page.route(/\/api\/non-conformances\/\d+\/investigate$/, (r: Route) => { const b = r.request().postDataJSON(); nc.status = "INVESTIGATING"; nc.version++; nc.investigation = { investigationFindings: b.investigationFindings, rootCause: b.rootCause, investigatorId: 1, investigationDate: "2026-06-05T10:00:00Z" }; push("UPDATE", "NC investigated"); return r.fulfill(jsonBody(nc)); });
  await page.route(/\/api\/non-conformances\/\d+\/determine-disposition$/, (r: Route) => { nc.status = "DISPOSITION_APPROVED"; nc.version++; nc.disposition = { disposition: "REWORK", rationale: "Rework selected", reworkSpecifications: "Rework per approved plan", reworkCompleted: false, approvedBy: 1, approvedDate: "2026-06-05T10:00:00Z" }; push("SIGN", "Disposition approved"); return r.fulfill(jsonBody(nc)); });
  await page.route(/\/api\/non-conformances\/\d+\/verify-rework$/, (r: Route) => { nc.status = "ACTION_IMPLEMENTED"; nc.version++; nc.disposition.reworkCompleted = true; push("UPDATE", "Rework verified"); return r.fulfill(jsonBody(nc)); });
  await page.route(/\/api\/non-conformances\/\d+\/close$/, (r: Route) => { nc.status = "CLOSED"; nc.version++; nc.closedDate = "2026-06-05T10:00:00Z"; push("SIGN", "NC closed"); return r.fulfill(jsonBody(nc)); });
  await page.route(/\/api\/non-conformances\/\d+$/, (r: Route) => r.fulfill(jsonBody(nc)));
  await page.route(/\/api\/non-conformances(\?|$)/, (r: Route) => {
    if (r.request().method() === "POST") { const b = r.request().postDataJSON(); nc = { id: 1, ncNo: "NC-2026-001", title: b.title, description: b.description, ncType: b.ncType, affectedItemId: null, affectedItemType: b.affectedItemType, discoveredDate: "2026-06-05T10:00:00Z", discoveredBy: b.discoveredBy, ownerId: 1, status: "OPEN", submittedBy: null, closedDate: null, version: 0, createdAt: "2026-06-05T10:00:00Z", createdBy: 1, updatedAt: "2026-06-05T10:00:00Z", investigation: null, disposition: null, useAsIsApproval: null, linkedCapaIds: [] }; push("CREATE", "NC created"); return r.fulfill(jsonBody(nc, 201)); }
    return r.fulfill(jsonBody({ content: nc ? [nc] : [], page: 0, size: 10, totalElements: nc ? 1 : 0, totalPages: 1 }));
  });
}

test("non-conformance lifecycle: create -> investigate -> disposition -> verify -> close", async ({ page }) => {
  await mockBackend(page);
  await page.goto("/non-conformances/new");
  await page.addStyleTag({ content: "[data-sonner-toaster]{display:none !important}" });
  await page.getByLabel("Title *").fill("Damaged incoming packaging");
  await page.getByLabel("Description *").fill("Cartons arrived crushed and quarantined.");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page).toHaveURL(/\/non-conformances\/1$/);
  await page.getByRole("button", { name: "Investigate" }).click();
  await page.getByLabel("Investigation findings").fill("Damage occurred in transit.");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Investigating").first()).toBeVisible();
  await page.getByRole("button", { name: "Determine Disposition" }).click();
  await page.getByLabel("Password *").fill("Password123!");
  await page.getByRole("button", { name: "Sign" }).click();
  await expect(page.getByText("Disposition Approved").first()).toBeVisible();
  await page.getByRole("button", { name: "Verify Rework" }).click();
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page.getByText("Action Implemented").first()).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await page.getByLabel("Password *").fill("Password123!");
  await page.getByRole("button", { name: "Sign" }).click();
  await expect(page.getByText("Closed").first()).toBeVisible();
});
