import { test, expect, type Page, type Route } from "@playwright/test";

/**
 * Deviation lifecycle e2e: create -> investigation -> approval -> approve (Part 11) -> close,
 * then verify the audit trail. Backend mocked statefully.
 */

const me = {
  id: 1,
  email: "john@demo.com",
  fullName: "John Demo",
  authorities: ["DEVIATION_CREATE", "DEVIATION_APPROVE", "AUDIT_VIEW"],
};
const users = [{ id: 1, fullName: "John Demo", email: "john@demo.com", status: "ACTIVE" }];

function jsonBody(data: unknown, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify(data) };
}

const ACTION_STATUS: Record<string, string> = {
  "submit-for-investigation": "UNDER_INVESTIGATION",
  "submit-for-approval": "PENDING_APPROVAL",
  close: "CLOSED",
  reject: "REJECTED",
  cancel: "CANCELLED",
};

async function mockBackend(page: Page) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let dev: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const audit: any[] = [];
  let auditId = 1;
  const pushAudit = (action: string, reason: string) =>
    audit.unshift({ id: auditId++, action, fieldName: null, oldValue: null, newValue: null, reasonForChange: reason, userId: 1, userFullName: "John Demo", utcTimestamp: "2026-06-05T10:00:00Z", ipAddress: "127.0.0.1", userAgent: "test" });

  await page.route("**/api/auth/me", (r: Route) => r.fulfill(jsonBody(me)));
  await page.route("**/api/users", (r: Route) => r.fulfill(jsonBody(users)));
  await page.route(/\/api\/notifications\/unread-count$/, (r: Route) => r.fulfill(jsonBody({ unread: 0 })));
  await page.route(/\/api\/deviations\/\d+\/audit-trail$/, (r: Route) => r.fulfill(jsonBody(audit)));

  await page.route(/\/api\/deviations\/\d+\/approve$/, (r: Route) => {
    dev.status = "APPROVED"; dev.version += 1;
    pushAudit("SIGN", "Approved"); pushAudit("STATUS_CHANGE", "Approved");
    return r.fulfill(jsonBody(dev));
  });
  await page.route(/\/api\/deviations\/\d+\/(submit-for-investigation|submit-for-approval|reject|close|cancel)$/, (r: Route) => {
    const action = r.request().url().split("/").pop()!;
    dev.status = ACTION_STATUS[action]; dev.version += 1;
    pushAudit("STATUS_CHANGE", `Action: ${action}`);
    return r.fulfill(jsonBody(dev));
  });
  await page.route(/\/api\/deviations\/\d+$/, (r: Route) => {
    if (r.request().method() !== "GET") return r.fallback();
    return r.fulfill(jsonBody(dev));
  });
  await page.route(/\/api\/deviations(\?|$)/, (r: Route) => {
    if (r.request().method() === "POST") {
      const body = r.request().postDataJSON();
      dev = { id: 1, deviationNumber: "DEV-2026-001", title: body.title, severity: body.severity, status: "DRAFT", version: 0, description: body.description, rootCause: null, immediateAction: body.immediateAction ?? null, occurredDate: body.occurredDate ?? null, closedDate: null, createdBy: 1, submittedBy: null, createdAt: "2026-06-05T10:00:00Z", updatedAt: "2026-06-05T10:00:00Z" };
      pushAudit("CREATE", "Deviation created");
      return r.fulfill(jsonBody(dev, 201));
    }
    return r.fulfill(jsonBody({ content: dev ? [dev] : [], page: 0, size: 10, totalElements: dev ? 1 : 0, totalPages: 1 }));
  });
}

test("deviation lifecycle to closed + audit", async ({ page }) => {
  await mockBackend(page);

  await page.goto("/deviations/new");
  await page.addStyleTag({ content: "[data-sonner-toaster]{display:none !important}" });
  await page.getByLabel("Title *").fill("Temperature excursion in cold room");
  await page.getByLabel("Severity *").selectOption("CRITICAL");
  await page.getByLabel("Description *").fill("Cold room exceeded 8C for 2 hours.");
  await page.getByRole("button", { name: "Submit for Investigation" }).click();

  await expect(page).toHaveURL(/\/deviations\/1$/);
  await expect(page.getByRole("heading", { name: "Temperature excursion in cold room" })).toBeVisible();
  await expect(page.getByText("Under Investigation").first()).toBeVisible();
  // Critical severity badge rendered.
  await expect(page.getByText("CRITICAL").first()).toBeVisible();

  await page.getByRole("button", { name: "Submit for Approval" }).click();
  await expect(page.getByText("Pending Approval").first()).toBeVisible();

  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByRole("heading", { name: "Approve Deviation" })).toBeVisible();
  await page.getByLabel("Password *").fill("Password123!");
  await page.getByRole("button", { name: "Sign" }).click();
  await expect(page.getByText("Approved").first()).toBeVisible();

  // Close requires a reason (window.prompt).
  page.once("dialog", (dialog) => dialog.accept("Investigation complete"));
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByText("Closed").first()).toBeVisible();

  await expect(page.getByRole("cell", { name: "CREATE", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "SIGN", exact: true })).toBeVisible();
});
