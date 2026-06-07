import { test, expect, type Page, type Route } from "@playwright/test";

/** Attachment preview: clicking an attachment opens an in-app preview of its contents. */

const me = { id: 1, email: "john@demo.com", fullName: "John Demo", authorities: ["AUDIT_VIEW"] };
const users = [{ id: 1, fullName: "John Demo", email: "john@demo.com", status: "ACTIVE" }];

const doc = {
  id: 1, documentNumber: "SOP-2026-001", title: "Cleaning SOP", type: "SOP", status: "EFFECTIVE",
  majorVersion: 1, version: 3, content: "Body text.", effectiveDate: "2026-01-10T00:00:00Z",
  nextReviewDate: null, reviewPeriodMonths: 12, supersededById: null, createdBy: 1, submittedBy: null,
  createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-05T00:00:00Z",
};
const attachment = {
  id: 5, recordType: "Document", recordId: "1", fileName: "protocol.txt", contentType: "text/plain",
  sizeBytes: 25, sha256: "abc", uploadedBy: 1, uploadedAt: "2026-01-02T00:00:00Z",
};

function jsonBody(data: unknown) { return { status: 200, contentType: "application/json", body: JSON.stringify(data) }; }

async function mockBackend(page: Page) {
  await page.route("**/api/auth/me", (r: Route) => r.fulfill(jsonBody(me)));
  await page.route("**/api/users", (r: Route) => r.fulfill(jsonBody(users)));
  await page.route(/\/api\/notifications\/unread-count$/, (r: Route) => r.fulfill(jsonBody({ unread: 0 })));
  await page.route(/\/api\/documents\/1\/versions$/, (r: Route) => r.fulfill(jsonBody([])));
  await page.route(/\/api\/documents\/1$/, (r: Route) => r.fulfill(jsonBody(doc)));
  await page.route(/\/api\/attachments\/Document\/1$/, (r: Route) => r.fulfill(jsonBody([attachment])));
  await page.route(/\/api\/attachments\/5\/download$/, (r: Route) =>
    r.fulfill({ status: 200, contentType: "text/plain", body: "Hello preview content 123" }));
}

test("attachment preview opens in-app", async ({ page }) => {
  await mockBackend(page);
  await page.goto("/documents/1");

  await expect(page.getByRole("heading", { name: "Cleaning SOP" })).toBeVisible();
  await expect(page.getByText("protocol.txt").first()).toBeVisible();

  await page.getByRole("button", { name: "Preview" }).click();
  // Preview modal opens with the file name as title and renders the text content.
  await expect(page.getByRole("heading", { name: "protocol.txt" })).toBeVisible();
  await expect(page.getByText("Hello preview content 123")).toBeVisible();
});
