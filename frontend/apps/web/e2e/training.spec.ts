import { test, expect, type Page, type Route } from "@playwright/test";

const me = { id: 1, email: "john@demo.com", fullName: "John Demo", authorities: ["TRAINING_MANAGE", "AUDIT_VIEW"] };
const users = [{ id: 1, fullName: "John Demo", email: "john@demo.com", status: "ACTIVE" }];

function jsonBody(data: unknown, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify(data) };
}

async function mockBackend(page: Page) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let training: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assignments: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rules: any[] = [];
  const trail: any[] = [];
  let auditId = 1;
  const push = (action: string, reason: string) => trail.unshift({ id: auditId++, action, fieldName: null, oldValue: null, newValue: null, reasonForChange: reason, userId: 1, userFullName: "John Demo", utcTimestamp: "2026-06-05T10:00:00Z", ipAddress: "127.0.0.1", userAgent: "test" });

  await page.route("**/api/auth/me", (r: Route) => r.fulfill(jsonBody(me)));
  await page.route("**/api/users", (r: Route) => r.fulfill(jsonBody(users)));
  await page.route(/\/api\/notifications\/unread-count$/, (r: Route) => r.fulfill(jsonBody({ unread: 0 })));
  await page.route(/\/api\/training\/compliance-status$/, (r: Route) => r.fulfill(jsonBody({ assigned: assignments.filter((a) => a.status === "ASSIGNED").length, inProgress: 0, completed: assignments.filter((a) => a.status === "COMPLETED").length, overdue: 0, completionRatePct: assignments.length ? 100 : 0 })));
  await page.route(/\/api\/training\/\d+\/assignments$/, (r: Route) => r.fulfill(jsonBody(assignments)));
  await page.route(/\/api\/training\/\d+\/rules$/, (r: Route) => r.fulfill(jsonBody(rules)));
  await page.route(/\/api\/training\/\d+\/audit-trail$/, (r: Route) => r.fulfill(jsonBody(trail)));
  await page.route(/\/api\/training\/\d+\/assign-users$/, (r: Route) => { const b = r.request().postDataJSON(); const created = b.userIds.map((id: number) => ({ id: assignments.length + 1, trainingProgramId: 1, userId: id, assignedDate: "2026-06-05T10:00:00Z", dueDate: b.dueDate, completionDate: null, status: "ASSIGNED", completionEvidence: null, version: 0 })); assignments.push(...created); push("CREATE", "Training assigned"); return r.fulfill(jsonBody(created, 201)); });
  await page.route(/\/api\/training\/\d+\/create-auto-rule$/, (r: Route) => { const b = r.request().postDataJSON(); const rule = { id: 1, trainingProgramId: 1, triggerEvent: b.triggerEvent, targetAudience: b.targetAudience[0], dueWithinDays: b.daysUntilDue, createdAt: "2026-06-05T10:00:00Z" }; rules.push(rule); push("UPDATE", "Training auto-rule created"); return r.fulfill(jsonBody(rule, 201)); });
  await page.route(/\/api\/training\/\d+\/record-completion$/, (r: Route) => { const b = r.request().postDataJSON(); const a = assignments.find((x) => x.id === b.assignmentId); a.status = "COMPLETED"; a.completionDate = "2026-06-05T10:00:00Z"; a.completionEvidence = b.completionEvidence; a.version++; push("UPDATE", "Training completed"); return r.fulfill(jsonBody(a)); });
  await page.route(/\/api\/training\/\d+$/, (r: Route) => r.fulfill(jsonBody(training)));
  await page.route(/\/api\/training(\?|$)/, (r: Route) => {
    if (r.request().method() === "POST") {
      const b = r.request().postDataJSON();
      training = { id: 1, trainingCode: "TRN-2026-001", title: b.title, content: b.content, intendedAudience: b.intendedAudience, requiredFrequency: b.requiredFrequency, active: true, version: 0, createdAt: "2026-06-05T10:00:00Z", createdBy: 1, updatedAt: "2026-06-05T10:00:00Z" };
      push("CREATE", "Training program created");
      return r.fulfill(jsonBody(training, 201));
    }
    return r.fulfill(jsonBody({ content: training ? [training] : [], page: 0, size: 10, totalElements: training ? 1 : 0, totalPages: 1 }));
  });
}

test("training workflow: create -> auto-rule -> assign QA user -> record completion", async ({ page }) => {
  await mockBackend(page);
  await page.goto("/training/new");
  await page.addStyleTag({ content: "[data-sonner-toaster]{display:none !important}" });
  await page.getByLabel("Title *").fill("GMP Refresher");
  await page.getByLabel("Content / Description *").fill("Annual GMP expectations and examples.");
  await page.getByLabel("Intended Audience").selectOption("QA");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page).toHaveURL(/\/training\/1$/);

  await page.getByRole("button", { name: "Create Auto-Rule" }).click();
  await page.getByLabel("Trigger event").selectOption("Document Approved");
  await page.getByLabel("Target audience").selectOption("QA");
  await page.getByRole("button", { name: "Submit" }).click();
  await page.getByRole("tab", { name: "Auto-Rules" }).click();
  await expect(page.getByText("Auto-assign to QA when: Document Approved")).toBeVisible();

  await page.getByRole("button", { name: "Assign Users" }).click();
  await page.getByLabel("Users", { exact: true }).selectOption("1");
  await page.getByRole("button", { name: "Assign" }).click();
  await page.getByRole("tab", { name: "Assignments" }).click();
  await expect(page.getByRole("cell", { name: "John Demo" })).toBeVisible();

  await page.getByRole("button", { name: "Record Completion" }).click();
  await page.getByLabel("Evidence", { exact: true }).fill("Test Score: 95%");
  await page.getByRole("button", { name: "Record" }).click();
  await expect(page.getByText("COMPLETED", { exact: true }).first()).toBeVisible();
  await page.getByRole("tab", { name: "Compliance Status" }).click();
  await expect(page.getByText("Program completion")).toBeVisible();
  await expect(page.getByText("100%").first()).toBeVisible();
});
