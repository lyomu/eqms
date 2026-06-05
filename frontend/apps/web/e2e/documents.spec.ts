import { test, expect, type Page, type Route } from "@playwright/test";

/**
 * Document Control lifecycle e2e: create -> submit for review -> submit for approval ->
 * approve (Part 11 re-auth) -> verify the audit trail. The backend is mocked with a small
 * stateful fixture so the flow is deterministic and needs no live API / MFA.
 */

const me = {
  id: 1,
  email: "john@demo.com",
  fullName: "John Demo",
  authorities: ["DOCUMENT_CREATE", "DOCUMENT_REVIEW", "DOCUMENT_APPROVE", "AUDIT_VIEW"],
};
const users = [{ id: 1, fullName: "John Demo", email: "john@demo.com", status: "ACTIVE" }];

function jsonBody(data: unknown, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify(data) };
}

async function mockDocumentBackend(page: Page) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let doc: any = null;
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
  await page.route(/\/api\/attachments\//, (r: Route) => r.fulfill(jsonBody([])));
  await page.route(/\/api\/documents\/\d+\/versions$/, (r: Route) =>
    r.fulfill(jsonBody(doc ? [{ id: 1, majorVersion: 1, versionLabel: "1.0", status: doc.status, title: doc.title, content: doc.content, changeNotes: "Document created", createdBy: 1, createdByName: "John Demo", createdAt: "2026-06-05T10:00:00Z" }] : []))
  );
  await page.route(/\/api\/documents\/\d+\/approvals$/, (r: Route) =>
    r.fulfill(jsonBody(doc && doc.status === "APPROVED" ? [{ id: 1, userId: 1, signerFullName: "John Demo", meaning: "Approved", meaningStatement: "I approve this document.", signedAt: "2026-06-05T10:05:00Z" }] : []))
  );
  await page.route(/\/api\/documents\/\d+\/audit-trail$/, (r: Route) => r.fulfill(jsonBody(audit)));

  // Workflow actions.
  await page.route(/\/api\/documents\/\d+\/(submit-for-review|submit-for-approval|reject|make-effective|obsolete)$/, (r: Route) => {
    const action = r.request().url().split("/").pop();
    if (action === "submit-for-review") {
      doc.status = "UNDER_REVIEW";
      pushAudit("STATUS_CHANGE", "Submitted for review");
    } else if (action === "submit-for-approval") {
      doc.status = "PENDING_APPROVAL";
      pushAudit("STATUS_CHANGE", "Submitted for approval");
    }
    doc.version += 1;
    return r.fulfill(jsonBody(doc));
  });

  await page.route(/\/api\/documents\/\d+\/approve$/, (r: Route) => {
    doc.status = "APPROVED";
    doc.version += 1;
    pushAudit("SIGN", "Approved for release");
    pushAudit("STATUS_CHANGE", "Approved for release");
    return r.fulfill(jsonBody(doc));
  });

  // Detail GET.
  await page.route(/\/api\/documents\/\d+$/, (r: Route) => {
    if (r.request().method() !== "GET") return r.fallback();
    return r.fulfill(jsonBody(doc));
  });

  // List + create.
  await page.route(/\/api\/documents(\?|$)/, (r: Route) => {
    if (r.request().method() === "POST") {
      const body = r.request().postDataJSON();
      doc = {
        id: 1,
        documentNumber: "SOP-2026-001",
        title: body.title,
        type: body.type,
        status: "DRAFT",
        majorVersion: 1,
        version: 0,
        content: body.content,
        effectiveDate: null,
        nextReviewDate: null,
        reviewPeriodMonths: body.reviewPeriodMonths ?? null,
        supersededById: null,
        createdBy: 1,
        submittedBy: null,
        createdAt: "2026-06-05T10:00:00Z",
        updatedAt: "2026-06-05T10:00:00Z",
      };
      pushAudit("CREATE", "Document created");
      return r.fulfill(jsonBody(doc, 201));
    }
    return r.fulfill(
      jsonBody({ content: doc ? [doc] : [], page: 0, size: 10, totalElements: doc ? 1 : 0, totalPages: 1 })
    );
  });
}

test("create → submit → approve → audit trail", async ({ page }) => {
  await mockDocumentBackend(page);

  // Create + submit for review in one step.
  await page.goto("/documents/new");
  await page.getByLabel("Title *").fill("Cleaning Validation SOP");
  await page.getByLabel("Content *").fill("The procedure body.");
  await page.getByRole("button", { name: "Submit for Review" }).click();

  // Lands on the detail page, now Under Review.
  await expect(page).toHaveURL(/\/documents\/1$/);
  await expect(page.getByRole("heading", { name: "Cleaning Validation SOP" })).toBeVisible();
  await expect(page.getByText("Under Review").first()).toBeVisible();

  // Move to Pending Approval.
  await page.getByRole("button", { name: "Submit for Approval" }).click();
  await expect(page.getByText("Pending Approval").first()).toBeVisible();

  // Approve via the Part 11 modal.
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByRole("heading", { name: "Approve Document" })).toBeVisible();
  await page.getByLabel("Password *").fill("Password123!");
  await page.getByRole("button", { name: "Sign" }).click();

  // Now Approved.
  await expect(page.getByText("Approved").first()).toBeVisible();

  // Audit trail reflects the lifecycle.
  await page.getByRole("tab", { name: "Audit Trail" }).click();
  await expect(page.getByRole("cell", { name: "CREATE", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "SIGN", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Approved for release" }).first()).toBeVisible();
});
