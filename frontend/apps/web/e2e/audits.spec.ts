import { test, expect, type Page, type Route } from "@playwright/test";

/** Audit lifecycle: create -> plan -> add finding -> finalize (Part 11) -> audit trail. */

const me = { id: 1, email: "john@demo.com", fullName: "John Demo", authorities: ["AUDIT_MANAGE", "AUDIT_APPROVE", "AUDIT_VIEW"] };
const users = [{ id: 1, fullName: "John Demo", email: "john@demo.com", status: "ACTIVE" }];

function jsonBody(data: unknown, status = 200) { return { status, contentType: "application/json", body: JSON.stringify(data) }; }

async function mockBackend(page: Page) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let a: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const findings: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const audit: any[] = [];
  let aid = 1;
  const push = (action: string, reason: string) => audit.unshift({ id: aid++, action, fieldName: null, oldValue: null, newValue: null, reasonForChange: reason, userId: 1, userFullName: "John Demo", utcTimestamp: "2026-06-05T10:00:00Z", ipAddress: "127.0.0.1", userAgent: "test" });

  await page.route("**/api/auth/me", (r: Route) => r.fulfill(jsonBody(me)));
  await page.route("**/api/users", (r: Route) => r.fulfill(jsonBody(users)));
  await page.route(/\/api\/notifications\/unread-count$/, (r: Route) => r.fulfill(jsonBody({ unread: 0 })));
  await page.route(/\/api\/audits\/\d+\/audit-trail$/, (r: Route) => r.fulfill(jsonBody(audit)));
  await page.route(/\/api\/audits\/\d+\/follow-up$/, (r: Route) => r.fulfill(jsonBody([])));

  await page.route(/\/api\/audits\/\d+\/plan$/, (r: Route) => { const b = r.request().postDataJSON(); a.status = "IN_PROGRESS"; a.version++; a.scope = b.scope; push("STATUS_CHANGE", "Planned"); return r.fulfill(jsonBody(a)); });
  await page.route(/\/api\/audits\/\d+\/record-finding$/, (r: Route) => { const b = r.request().postDataJSON(); const f = { id: findings.length + 1, auditId: 1, findingNumber: findings.length + 1, description: b.description, area: b.area ?? null, severity: b.severity, evidence: b.evidence ?? null, rootCause: null, correctiveActionRequired: !!b.correctiveActionRequired, createdAt: "2026-06-05T10:00:00Z", createdBy: 1 }; findings.push(f); a.findings = findings; push("CREATE", "Finding recorded"); return r.fulfill(jsonBody(f, 201)); });
  await page.route(/\/api\/audits\/\d+\/finalize$/, (r: Route) => { a.status = "COMPLETED"; a.version++; push("SIGN", "Finalized"); push("STATUS_CHANGE", "Completed"); return r.fulfill(jsonBody(a)); });

  await page.route(/\/api\/audits\/\d+$/, (r: Route) => { if (r.request().method() !== "GET") return r.fallback(); return r.fulfill(jsonBody(a)); });
  await page.route(/\/api\/audits(\?|$)/, (r: Route) => {
    if (r.request().method() === "POST") {
      const b = r.request().postDataJSON();
      a = { id: 1, auditNo: "AUD-2026-001", auditTitle: b.auditTitle, auditType: b.auditType, status: "PLANNED", version: 0, auditDate: b.auditDate ?? null, auditorId: 1, auditeeId: b.auditeeId ?? null, scope: b.scope, submittedBy: null, completedDate: null, createdAt: "2026-06-05T10:00:00Z", createdBy: 1, updatedAt: "2026-06-05T10:00:00Z", findings: [] };
      push("CREATE", "Audit created");
      return r.fulfill(jsonBody(a, 201));
    }
    return r.fulfill(jsonBody({ content: a ? [a] : [], page: 0, size: 10, totalElements: a ? 1 : 0, totalPages: 1 }));
  });
}

test("audit lifecycle: create → plan → finding → finalize → audit", async ({ page }) => {
  await mockBackend(page);
  await page.goto("/audits/new");
  await page.addStyleTag({ content: "[data-sonner-toaster]{display:none !important}" });
  await page.getByLabel("Title *").fill("Annual internal QMS audit");
  await page.getByLabel("Scope *").fill("Document control and CAPA processes.");
  await page.getByRole("button", { name: "Create Audit" }).click();

  await expect(page).toHaveURL(/\/audits\/1$/);
  await expect(page.getByText("Planned").first()).toBeVisible();

  await page.getByRole("button", { name: "Plan", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Plan Audit" })).toBeVisible();
  await page.getByLabel(/Scope/).fill("Document control, CAPA and change control.");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("In Progress").first()).toBeVisible();

  await page.getByRole("button", { name: "Add Finding" }).first().click();
  await expect(page.getByRole("heading", { name: "Record Finding" })).toBeVisible();
  await page.getByLabel(/Description/).fill("SOP not signed within SLA.");
  await page.getByRole("button", { name: "Submit" }).click();
  // Wait for the modal to close so its textarea (same text) doesn't clash with the list item.
  await expect(page.getByRole("heading", { name: "Record Finding" })).toBeHidden();
  await expect(page.getByText("SOP not signed within SLA.")).toBeVisible();

  await page.getByRole("button", { name: "Finalize" }).click();
  await expect(page.getByRole("heading", { name: "Finalize Audit" })).toBeVisible();
  await page.getByLabel("Password *").fill("Password123!");
  await page.getByRole("button", { name: "Sign" }).click();
  await expect(page.getByText("Completed").first()).toBeVisible();

  await expect(page.getByRole("cell", { name: "SIGN", exact: true })).toBeVisible();
});
