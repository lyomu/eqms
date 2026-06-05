import { test, expect, type Page, type Route } from "@playwright/test";

/**
 * CAPA lifecycle e2e: create -> investigation -> approval -> approve (Part 11) -> start actions ->
 * effectiveness -> close (Part 11 + effectiveness result), then verify the audit trail.
 */

const me = {
  id: 1,
  email: "john@demo.com",
  fullName: "John Demo",
  authorities: ["CAPA_CREATE", "CAPA_APPROVE", "AUDIT_VIEW"],
};
const users = [{ id: 1, fullName: "John Demo", email: "john@demo.com", status: "ACTIVE" }];

function jsonBody(data: unknown, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify(data) };
}

const ACTION_STATUS: Record<string, string> = {
  "submit-for-investigation": "UNDER_INVESTIGATION",
  "submit-for-approval": "PENDING_APPROVAL",
  "start-actions": "IN_PROGRESS",
  "submit-for-effectiveness": "PENDING_EFFECTIVENESS_CHECK",
  reject: "REJECTED",
  cancel: "CANCELLED",
};

async function mockBackend(page: Page) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let capa: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const audit: any[] = [];
  let auditId = 1;
  const pushAudit = (action: string, reason: string) =>
    audit.unshift({ id: auditId++, action, fieldName: null, oldValue: null, newValue: null, reasonForChange: reason, userId: 1, userFullName: "John Demo", utcTimestamp: "2026-06-05T10:00:00Z", ipAddress: "127.0.0.1", userAgent: "test" });

  await page.route("**/api/auth/me", (r: Route) => r.fulfill(jsonBody(me)));
  await page.route("**/api/users", (r: Route) => r.fulfill(jsonBody(users)));
  await page.route(/\/api\/notifications\/unread-count$/, (r: Route) => r.fulfill(jsonBody({ unread: 0 })));
  await page.route(/\/api\/capas\/\d+\/actions$/, (r: Route) => r.fulfill(jsonBody([])));
  await page.route(/\/api\/capas\/\d+\/audit-trail$/, (r: Route) => r.fulfill(jsonBody(audit)));

  await page.route(/\/api\/capas\/\d+\/approve$/, (r: Route) => {
    capa.status = "APPROVED"; capa.version += 1;
    pushAudit("SIGN", "Approved for release"); pushAudit("STATUS_CHANGE", "Approved");
    return r.fulfill(jsonBody(capa));
  });
  await page.route(/\/api\/capas\/\d+\/close$/, (r: Route) => {
    capa.status = "CLOSED"; capa.version += 1;
    pushAudit("SIGN", "Closed with effectiveness"); pushAudit("STATUS_CHANGE", "Closed");
    return r.fulfill(jsonBody(capa));
  });
  await page.route(/\/api\/capas\/\d+\/(submit-for-investigation|submit-for-approval|reject|start-actions|submit-for-effectiveness|cancel)$/, (r: Route) => {
    const action = r.request().url().split("/").pop()!;
    capa.status = ACTION_STATUS[action]; capa.version += 1;
    pushAudit("STATUS_CHANGE", `Action: ${action}`);
    return r.fulfill(jsonBody(capa));
  });
  await page.route(/\/api\/capas\/\d+$/, (r: Route) => {
    if (r.request().method() !== "GET") return r.fallback();
    return r.fulfill(jsonBody(capa));
  });
  await page.route(/\/api\/capas(\?|$)/, (r: Route) => {
    if (r.request().method() === "POST") {
      const body = r.request().postDataJSON();
      capa = { id: 1, capaNumber: "CAPA-2026-001", title: body.title, source: body.source, status: "DRAFT", version: 0, description: body.description, rootCause: null, effectivenessCheckRequired: !!body.effectivenessCheckRequired, effectivenessCheckResult: null, dueDate: body.dueDate ?? null, closedDate: null, createdBy: 1, submittedBy: null, createdAt: "2026-06-05T10:00:00Z", updatedAt: "2026-06-05T10:00:00Z" };
      pushAudit("CREATE", "CAPA created");
      return r.fulfill(jsonBody(capa, 201));
    }
    return r.fulfill(jsonBody({ content: capa ? [capa] : [], page: 0, size: 10, totalElements: capa ? 1 : 0, totalPages: 1 }));
  });
}

test("CAPA full lifecycle to closed + audit", async ({ page }) => {
  await mockBackend(page);

  await page.goto("/capa/new");
  await page.addStyleTag({ content: "[data-sonner-toaster]{display:none !important}" });
  await page.getByLabel("Title *").fill("Recurring mixing deviation CAPA");
  await page.getByLabel("Problem description *").fill("Repeated out-of-range mixing times.");
  await page.getByRole("button", { name: "Submit for Investigation" }).click();

  await expect(page).toHaveURL(/\/capa\/1$/);
  await expect(page.getByRole("heading", { name: "Recurring mixing deviation CAPA" })).toBeVisible();
  await expect(page.getByText("Under Investigation").first()).toBeVisible();

  await page.getByRole("button", { name: "Submit for Approval" }).click();
  await expect(page.getByText("Pending Approval").first()).toBeVisible();

  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByRole("heading", { name: "Approve CAPA" })).toBeVisible();
  await page.getByLabel("Password *").fill("Password123!");
  await page.getByRole("button", { name: "Sign" }).click();
  await expect(page.getByText("Approved").first()).toBeVisible();

  await page.getByRole("button", { name: "Start Actions" }).click();
  await expect(page.getByText("In Progress").first()).toBeVisible();
  await page.getByRole("button", { name: "Submit for Effectiveness" }).click();
  await expect(page.getByText("Pending Effectiveness").first()).toBeVisible();

  // Close: signature + effectiveness result.
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("heading", { name: "Close CAPA" })).toBeVisible();
  await page.getByLabel("Effectiveness result").fill("No recurrence in 90 days.");
  await page.getByLabel("Password *").fill("Password123!");
  await page.getByRole("button", { name: "Sign" }).click();
  await expect(page.getByText("Closed").first()).toBeVisible();

  await expect(page.getByRole("cell", { name: "CREATE", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "SIGN", exact: true }).first()).toBeVisible();
});
