import { test, expect, type Page, type Route } from "@playwright/test";

/**
 * Change Control lifecycle e2e: create -> submit for review -> submit for approval ->
 * approve (Part 11) -> start/complete implementation -> submit for closure -> close,
 * then verify the audit trail. Backend mocked statefully; no live API / MFA.
 */

const me = {
  id: 1,
  email: "john@demo.com",
  fullName: "John Demo",
  authorities: ["CHANGE_CREATE", "CHANGE_APPROVE", "AUDIT_VIEW"],
};
const users = [{ id: 1, fullName: "John Demo", email: "john@demo.com", status: "ACTIVE" }];

function jsonBody(data: unknown, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify(data) };
}

const ACTION_STATUS: Record<string, string> = {
  "submit-for-review": "UNDER_REVIEW",
  "submit-for-approval": "PENDING_APPROVAL",
  "start-implementation": "IN_IMPLEMENTATION",
  "complete-implementation": "IMPLEMENTED",
  "submit-for-closure": "PENDING_CLOSURE",
  close: "CLOSED",
  reject: "REJECTED",
  cancel: "CANCELLED",
};

async function mockBackend(page: Page) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cc: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const audit: any[] = [];
  let auditId = 1;
  const pushAudit = (action: string, reason: string) =>
    audit.unshift({
      id: auditId++,
      action,
      fieldName: null,
      oldValue: null,
      newValue: null,
      reasonForChange: reason,
      userId: 1,
      userFullName: "John Demo",
      utcTimestamp: "2026-06-05T10:00:00Z",
      ipAddress: "127.0.0.1",
      userAgent: "test",
    });

  await page.route("**/api/auth/me", (r: Route) => r.fulfill(jsonBody(me)));
  await page.route("**/api/users", (r: Route) => r.fulfill(jsonBody(users)));
  await page.route(/\/api\/notifications\/unread-count$/, (r: Route) => r.fulfill(jsonBody({ unread: 0 })));
  await page.route(/\/api\/change-controls\/\d+\/audit-trail$/, (r: Route) => r.fulfill(jsonBody(audit)));

  await page.route(/\/api\/change-controls\/\d+\/approve$/, (r: Route) => {
    cc.status = "APPROVED";
    cc.version += 1;
    pushAudit("SIGN", "Approved for release");
    pushAudit("STATUS_CHANGE", "Approved for release");
    return r.fulfill(jsonBody(cc));
  });

  await page.route(
    /\/api\/change-controls\/\d+\/(submit-for-review|submit-for-approval|reject|start-implementation|complete-implementation|submit-for-closure|close|cancel)$/,
    (r: Route) => {
      const action = r.request().url().split("/").pop()!;
      cc.status = ACTION_STATUS[action];
      cc.version += 1;
      pushAudit("STATUS_CHANGE", `Action: ${action}`);
      return r.fulfill(jsonBody(cc));
    }
  );

  await page.route(/\/api\/change-controls\/\d+$/, (r: Route) => {
    if (r.request().method() !== "GET") return r.fallback();
    return r.fulfill(jsonBody(cc));
  });

  await page.route(/\/api\/change-controls(\?|$)/, (r: Route) => {
    if (r.request().method() === "POST") {
      const body = r.request().postDataJSON();
      cc = {
        id: 1,
        changeNumber: "CC-2026-001",
        title: body.title,
        type: body.type,
        status: "DRAFT",
        version: 0,
        description: body.description,
        justification: body.justification ?? null,
        effectivenessCheckRequired: !!body.effectivenessCheckRequired,
        targetImplementationDate: body.targetImplementationDate ?? null,
        implementedDate: null,
        closedDate: null,
        createdBy: 1,
        submittedBy: null,
        createdAt: "2026-06-05T10:00:00Z",
        updatedAt: "2026-06-05T10:00:00Z",
      };
      pushAudit("CREATE", "Change request created");
      return r.fulfill(jsonBody(cc, 201));
    }
    return r.fulfill(jsonBody({ content: cc ? [cc] : [], page: 0, size: 10, totalElements: cc ? 1 : 0, totalPages: 1 }));
  });
}

test("change request full lifecycle to closed + audit", async ({ page }) => {
  await mockBackend(page);

  // Create + submit for review.
  await page.goto("/change-control/new");
  // Hide toasts: they sit top-right over the header action buttons and intercept clicks.
  await page.addStyleTag({ content: "[data-sonner-toaster]{display:none !important}" });
  await page.getByLabel("Title *").fill("Update mixing SOP");
  await page.getByLabel("Description *").fill("Adjust the mixing time parameter.");
  await page.getByRole("button", { name: "Submit for Review" }).click();

  await expect(page).toHaveURL(/\/change-control\/1$/);
  await expect(page.getByRole("heading", { name: "Update mixing SOP" })).toBeVisible();
  await expect(page.getByText("Under Review").first()).toBeVisible();

  // Review -> approval.
  await page.getByRole("button", { name: "Submit for Approval" }).click();
  await expect(page.getByText("Pending Approval").first()).toBeVisible();

  // Approve (Part 11 modal).
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByRole("heading", { name: "Approve Change Request" })).toBeVisible();
  await page.getByLabel("Password *").fill("Password123!");
  await page.getByRole("button", { name: "Sign" }).click();
  await expect(page.getByText("Approved").first()).toBeVisible();

  // Implementation -> closure.
  await page.getByRole("button", { name: "Start Implementation" }).click();
  await expect(page.getByText("In Implementation").first()).toBeVisible();
  await page.getByRole("button", { name: "Complete Implementation" }).click();
  await expect(page.getByText("Implemented").first()).toBeVisible();
  await page.getByRole("button", { name: "Submit for Closure" }).click();
  await expect(page.getByText("Pending Closure").first()).toBeVisible();

  // Close requires a reason (window.prompt) -> auto-accept the dialog.
  page.once("dialog", (dialog) => dialog.accept("Effectiveness verified"));
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByText("Closed").first()).toBeVisible();

  // Audit trail reflects create + signature.
  await expect(page.getByRole("cell", { name: "CREATE", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "SIGN", exact: true })).toBeVisible();
});
