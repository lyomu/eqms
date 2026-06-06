import { test, expect, type Page, type Route } from "@playwright/test";

const me = { id: 1, email: "john@demo.com", fullName: "John Demo", authorities: ["MR_MANAGE", "MR_APPROVE", "AUDIT_VIEW"] };
function jsonBody(data: unknown, status = 200) { return { status, contentType: "application/json", body: JSON.stringify(data) }; }

async function mockBackend(page: Page) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mr: any = null;
  const audit: any[] = [];
  const push = (action: string, reason: string) => audit.unshift({ id: audit.length + 1, action, fieldName: null, oldValue: null, newValue: null, reasonForChange: reason, userId: 1, userFullName: "John Demo", utcTimestamp: "2026-06-05T10:00:00Z", ipAddress: "127.0.0.1", userAgent: "test" });
  await page.route("**/api/auth/me", (r: Route) => r.fulfill(jsonBody(me)));
  await page.route(/\/api\/notifications\/unread-count$/, (r: Route) => r.fulfill(jsonBody({ unread: 0 })));
  await page.route(/\/api\/management-reviews\/\d+\/previous-actions$/, (r: Route) => r.fulfill(jsonBody([])));
  await page.route(/\/api\/management-reviews\/\d+\/audit-trail$/, (r: Route) => r.fulfill(jsonBody(audit)));
  await page.route(/\/api\/management-reviews\/\d+\/add-metrics$/, (r: Route) => { const b = r.request().postDataJSON(); mr.metrics.push({ metricName: b.metricName, metricValue: String(b.metricValue), period: b.period, trend: b.trend }); push("UPDATE", "Metric added"); return r.fulfill(jsonBody(mr)); });
  await page.route(/\/api\/management-reviews\/\d+\/add-audit-results$/, (r: Route) => { const b = r.request().postDataJSON(); mr.auditResults.push(b); push("UPDATE", "Audit result added"); return r.fulfill(jsonBody(mr)); });
  await page.route(/\/api\/management-reviews\/\d+\/add-action-item$/, (r: Route) => { const b = r.request().postDataJSON(); mr.actionItems.push({ id: 1, managementReviewId: 1, actionDescription: b.actionDescription, ownerId: b.ownerId, dueDate: b.dueDate, status: "OPEN", completionDate: null }); push("CREATE", "Action item added"); return r.fulfill(jsonBody(mr)); });
  await page.route(/\/api\/management-reviews\/\d+\/record-decision$/, (r: Route) => { const b = r.request().postDataJSON(); mr.decisions.push({ decisionDescription: b.decisionDescription, decisionArea: b.decisionArea, impact: b.impact, documentedBy: 1, documentedDate: "2026-06-05T10:00:00Z" }); push("UPDATE", "Decision recorded"); return r.fulfill(jsonBody(mr)); });
  await page.route(/\/api\/management-reviews\/\d+\/approve-and-finalize$/, (r: Route) => { mr.status = "COMPLETED"; mr.version++; push("SIGN", "Review finalized"); return r.fulfill(jsonBody(mr)); });
  await page.route(/\/api\/management-reviews\/\d+$/, (r: Route) => r.fulfill(jsonBody(mr)));
  await page.route(/\/api\/management-reviews(\?|$)/, (r: Route) => {
    if (r.request().method() === "POST") { const b = r.request().postDataJSON(); mr = { id: 1, reviewNo: "MR-2026-001", reviewDate: b.reviewDate, participants: b.participants, scope: b.scope, status: "SCHEDULED", submittedBy: null, approvedDate: null, version: 0, createdAt: "2026-06-05T10:00:00Z", createdBy: 1, updatedAt: "2026-06-05T10:00:00Z", metrics: [], auditResults: [], productFeedback: [], actionItems: [], decisions: [] }; push("CREATE", "Review scheduled"); return r.fulfill(jsonBody(mr, 201)); }
    return r.fulfill(jsonBody({ content: mr ? [mr] : [], page: 0, size: 10, totalElements: mr ? 1 : 0, totalPages: 1 }));
  });
}

test("management review workflow: create -> metrics -> actions -> decision -> finalize", async ({ page }) => {
  await mockBackend(page);
  await page.goto("/management-reviews/new");
  await page.addStyleTag({ content: "[data-sonner-toaster]{display:none !important}" });
  await page.getByLabel("Review date *").fill("2026-06-05");
  await page.getByLabel("Participants").fill("QA, Operations");
  await page.getByLabel("Scope").fill("Quarterly QMS performance review.");
  await page.getByRole("button", { name: "Schedule Review" }).click();
  await expect(page).toHaveURL(/\/management-reviews\/1$/);
  await page.getByRole("button", { name: "Add Metrics" }).click();
  await page.getByLabel("Metric value").fill("96");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("QMS Health Score")).toBeVisible();
  await page.getByRole("button", { name: "Add Action Item" }).click();
  await page.getByLabel("Action description").fill("Close overdue training actions.");
  await page.getByRole("button", { name: "Submit" }).click();
  await page.getByRole("tab", { name: "Action Items" }).click();
  await expect(page.getByText("Close overdue training actions.")).toBeVisible();
  await page.getByRole("button", { name: "Record Decision" }).click();
  await page.getByLabel("Decision description").fill("Increase QA training cadence.");
  await page.getByRole("button", { name: "Submit" }).click();
  await page.getByRole("button", { name: "Approve & Finalize" }).click();
  await page.getByLabel("Password *").fill("Password123!");
  await page.getByRole("button", { name: "Sign" }).click();
  await expect(page.getByText("Completed").first()).toBeVisible();
});
