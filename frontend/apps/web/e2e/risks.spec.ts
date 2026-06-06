import { test, expect, type Page, type Route } from "@playwright/test";

/** Risk lifecycle: create -> hazard analysis -> implement controls -> accept (Part 11) -> audit. */

const me = { id: 1, email: "john@demo.com", fullName: "John Demo", authorities: ["RISK_CREATE", "RISK_APPROVE", "AUDIT_VIEW"] };
const users = [{ id: 1, fullName: "John Demo", email: "john@demo.com", status: "ACTIVE" }];

function jsonBody(data: unknown, status = 200) { return { status, contentType: "application/json", body: JSON.stringify(data) }; }

async function mockBackend(page: Page) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let r0: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const audit: any[] = [];
  let aid = 1;
  const push = (action: string, reason: string) => audit.unshift({ id: aid++, action, fieldName: null, oldValue: null, newValue: null, reasonForChange: reason, userId: 1, userFullName: "John Demo", utcTimestamp: "2026-06-05T10:00:00Z", ipAddress: "127.0.0.1", userAgent: "test" });

  await page.route("**/api/auth/me", (r: Route) => r.fulfill(jsonBody(me)));
  await page.route("**/api/users", (r: Route) => r.fulfill(jsonBody(users)));
  await page.route(/\/api\/notifications\/unread-count$/, (r: Route) => r.fulfill(jsonBody({ unread: 0 })));
  await page.route(/\/api\/risks\/\d+\/audit-trail$/, (r: Route) => r.fulfill(jsonBody(audit)));

  await page.route(/\/api\/risks\/\d+\/hazard-analysis$/, (r: Route) => { const b = r.request().postDataJSON(); r0.status = "ANALYZED"; r0.version++; r0.riskScore = b.severity * b.probability; r0.analysis = { analysisMethod: b.analysisMethod, findings: b.findings, consequence: b.consequence ?? null, severity: b.severity, probability: b.probability, residualRiskScore: null }; push("UPDATE", "Analyzed"); return r.fulfill(jsonBody(r0)); });
  await page.route(/\/api\/risks\/\d+\/implement-controls$/, (r: Route) => { r0.status = "MITIGATED"; r0.version++; push("STATUS_CHANGE", "Controls implemented"); return r.fulfill(jsonBody(r0)); });
  await page.route(/\/api\/risks\/\d+\/accept$/, (r: Route) => { r0.status = "ACCEPTED"; r0.version++; push("SIGN", "Accepted"); push("STATUS_CHANGE", "Accepted"); return r.fulfill(jsonBody(r0)); });

  await page.route(/\/api\/risks\/\d+$/, (r: Route) => { if (r.request().method() !== "GET") return r.fallback(); return r.fulfill(jsonBody(r0)); });
  await page.route(/\/api\/risks(\?|$)/, (r: Route) => {
    if (r.request().method() === "POST") {
      const b = r.request().postDataJSON();
      r0 = { id: 1, riskNo: "RISK-2026-001", title: b.title, description: b.description, category: b.category, potentialImpact: b.potentialImpact, likelihood: null, riskScore: null, status: "IDENTIFIED", version: 0, ownerId: 1, submittedBy: null, acceptedBy: null, acceptedDate: null, closedDate: null, createdAt: "2026-06-05T10:00:00Z", createdBy: 1, updatedAt: "2026-06-05T10:00:00Z", analysis: null, mitigations: [], effectivenessChecks: [] };
      push("CREATE", "Risk created");
      return r.fulfill(jsonBody(r0, 201));
    }
    return r.fulfill(jsonBody({ content: r0 ? [r0] : [], page: 0, size: 10, totalElements: r0 ? 1 : 0, totalPages: 1 }));
  });
}

test("risk lifecycle: create → analyze → mitigate → accept → audit", async ({ page }) => {
  await mockBackend(page);
  await page.goto("/risks/new");
  await page.addStyleTag({ content: "[data-sonner-toaster]{display:none !important}" });
  await page.getByLabel("Title *").fill("Cross-contamination risk in shared line");
  await page.getByLabel("Description *").fill("Shared equipment between products.");
  await page.getByLabel("Potential impact *").fill("Product quality and patient safety.");
  await page.getByRole("button", { name: "Create Risk" }).click();

  await expect(page).toHaveURL(/\/risks\/1$/);
  await expect(page.getByText("Identified").first()).toBeVisible();

  await page.getByRole("button", { name: "Hazard Analysis" }).click();
  await expect(page.getByRole("heading", { name: "Hazard Analysis" })).toBeVisible();
  await page.getByLabel(/Findings/).fill("FMEA identified high RPN on cleaning step.");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Analyzed").first()).toBeVisible();

  await page.getByRole("button", { name: "Implement Controls" }).click();
  await expect(page.getByText("Mitigated").first()).toBeVisible();

  await page.getByRole("button", { name: "Accept Risk" }).click();
  await expect(page.getByRole("heading", { name: "Accept Risk" })).toBeVisible();
  await page.getByLabel("Password *").fill("Password123!");
  await page.getByRole("button", { name: "Sign" }).click();
  await expect(page.getByText("Accepted").first()).toBeVisible();

  await expect(page.getByRole("cell", { name: "SIGN", exact: true })).toBeVisible();
});
