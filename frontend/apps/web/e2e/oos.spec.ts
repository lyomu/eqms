import { test, expect, type Page, type Route } from "@playwright/test";

/** OOS lifecycle: create -> initial assessment -> begin investigation -> determine disposition (Part 11) -> close (Part 11) -> audit. */

const me = { id: 1, email: "john@demo.com", fullName: "John Demo", authorities: ["OOS_CREATE", "OOS_APPROVE", "AUDIT_VIEW"] };
const users = [{ id: 1, fullName: "John Demo", email: "john@demo.com", status: "ACTIVE" }];

function jsonBody(data: unknown, status = 200) { return { status, contentType: "application/json", body: JSON.stringify(data) }; }

async function mockBackend(page: Page) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let o: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const audit: any[] = [];
  let aid = 1;
  const push = (action: string, reason: string) => audit.unshift({ id: aid++, action, fieldName: null, oldValue: null, newValue: null, reasonForChange: reason, userId: 1, userFullName: "John Demo", utcTimestamp: "2026-06-05T10:00:00Z", ipAddress: "127.0.0.1", userAgent: "test" });

  await page.route("**/api/auth/me", (r: Route) => r.fulfill(jsonBody(me)));
  await page.route("**/api/users", (r: Route) => r.fulfill(jsonBody(users)));
  await page.route(/\/api\/notifications\/unread-count$/, (r: Route) => r.fulfill(jsonBody({ unread: 0 })));
  await page.route(/\/api\/products(\?|$)/, (r: Route) => r.fulfill(jsonBody({ content: [], page: 0, size: 100, totalElements: 0, totalPages: 0 })));
  await page.route(/\/api\/oos\/\d+\/audit-trail$/, (r: Route) => r.fulfill(jsonBody(audit)));

  await page.route(/\/api\/oos\/\d+\/initial-assessment$/, (r: Route) => { const b = r.request().postDataJSON(); o.status = "INITIAL_ASSESSMENT"; o.version++; o.initialAssessment = { assessmentFindings: b.assessmentFindings, likelyCause: b.likelyCause, assessorId: 1, assessmentDate: "2026-06-05T10:00:00Z" }; push("UPDATE", "Assessed"); return r.fulfill(jsonBody(o)); });
  await page.route(/\/api\/oos\/\d+\/begin-investigation$/, (r: Route) => { o.status = "INVESTIGATING"; o.version++; push("STATUS_CHANGE", "Investigating"); return r.fulfill(jsonBody(o)); });
  await page.route(/\/api\/oos\/\d+\/determine-disposition$/, (r: Route) => { const b = r.request().postDataJSON(); o.status = "DISPOSITION_DETERMINED"; o.version++; o.disposition = { disposition: b.disposition, rationale: b.rationale, approvedBy: 1, approvedDate: "2026-06-05T10:00:00Z" }; push("SIGN", "Disposition"); push("STATUS_CHANGE", "Disposition determined"); return r.fulfill(jsonBody(o)); });
  await page.route(/\/api\/oos\/\d+\/close$/, (r: Route) => { o.status = "CLOSED"; o.version++; push("SIGN", "Closed"); return r.fulfill(jsonBody(o)); });

  await page.route(/\/api\/oos\/\d+$/, (r: Route) => { if (r.request().method() !== "GET") return r.fallback(); return r.fulfill(jsonBody(o)); });
  await page.route(/\/api\/oos(\?|$)/, (r: Route) => {
    if (r.request().method() === "POST") {
      const b = r.request().postDataJSON();
      o = { id: 1, oosNo: "OOS-2026-001", productId: b.productId ?? null, testMethod: b.testMethod ?? null, specificationLimitMin: b.specificationLimitMin ?? null, specificationLimitMax: b.specificationLimitMax ?? null, reportedResult: b.reportedResult, reportedDate: "2026-06-05T10:00:00Z", reportedById: 1, reportedByName: b.reportedByName ?? null, status: "REPORTED", submittedBy: null, closedDate: null, version: 0, createdAt: "2026-06-05T10:00:00Z", createdBy: 1, updatedAt: "2026-06-05T10:00:00Z", initialAssessment: null, repeatTesting: null, investigation: null, disposition: null, linkedCapaIds: [] };
      push("CREATE", "OOS created");
      return r.fulfill(jsonBody(o, 201));
    }
    return r.fulfill(jsonBody({ content: o ? [o] : [], page: 0, size: 10, totalElements: o ? 1 : 0, totalPages: 1 }));
  });
}

test("OOS lifecycle: create → assess → investigate → disposition → close → audit", async ({ page }) => {
  await mockBackend(page);
  await page.goto("/oos/new");
  await page.addStyleTag({ content: "[data-sonner-toaster]{display:none !important}" });
  await page.getByLabel("Reported result *").fill("112% of label claim");
  await page.getByRole("button", { name: "Create OOS Case" }).click();

  await expect(page).toHaveURL(/\/oos\/1$/);
  await expect(page.getByText("Reported", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Initial Assessment" }).click();
  await expect(page.getByRole("heading", { name: "Initial Assessment" })).toBeVisible();
  await page.getByLabel(/Assessment findings/).fill("Suspected product quality issue.");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Initial Assessment").first()).toBeVisible();

  await page.getByRole("button", { name: "Begin Investigation" }).click();
  await expect(page.getByText("Investigating").first()).toBeVisible();

  await page.getByRole("button", { name: "Determine Disposition" }).click();
  await expect(page.getByRole("heading", { name: "Determine Disposition" })).toBeVisible();
  await page.getByLabel("Rationale").fill("Confirmed OOS; batch rejected.");
  await page.getByLabel("Password *").fill("Password123!");
  await page.getByRole("button", { name: "Sign" }).click();
  await expect(page.getByText("Disposition Determined").first()).toBeVisible();

  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Close OOS Case" })).toBeVisible();
  await page.getByLabel("Password *").fill("Password123!");
  await page.getByRole("button", { name: "Sign" }).click();
  await expect(page.getByText("Closed", { exact: true }).first()).toBeVisible();

  await expect(page.getByRole("cell", { name: "SIGN", exact: true }).first()).toBeVisible();
});
