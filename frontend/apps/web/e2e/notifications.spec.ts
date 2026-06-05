import { test, expect, type Page, type Route } from "@playwright/test";

/** Notifications e2e: list renders, "Mark all read" clears the unread state. Backend mocked. */

const me = { id: 1, email: "john@demo.com", fullName: "John Demo", authorities: [] as string[] };

function jsonBody(data: unknown, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify(data) };
}

async function mockBackend(page: Page) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let notes: any[] = [
    { id: 1, recipientUserId: 1, type: "DOCUMENT_PENDING_APPROVAL", title: "Document DOC-2026-007 pending approval", message: "A document is awaiting your approval.", recordType: "Document", recordId: "7", read: false, readAt: null, createdAt: "2026-06-05T09:00:00Z" },
    { id: 2, recipientUserId: 1, type: "CAPA_ASSIGNED", title: "CAPA-2026-003 assigned", message: "A CAPA was assigned to you.", recordType: "Capa", recordId: "3", read: false, readAt: null, createdAt: "2026-06-05T08:00:00Z" },
  ];

  await page.route("**/api/auth/me", (r: Route) => r.fulfill(jsonBody(me)));
  await page.route(/\/api\/notifications\/unread-count$/, (r: Route) =>
    r.fulfill(jsonBody({ unread: notes.filter((n) => !n.read).length })));
  await page.route(/\/api\/notifications\/mark-all-read$/, (r: Route) => {
    notes = notes.map((n) => ({ ...n, read: true }));
    return r.fulfill(jsonBody({ updated: 2 }));
  });
  await page.route(/\/api\/notifications\/\d+\/mark-read$/, (r: Route) => {
    const id = Number(r.request().url().split("/").slice(-2)[0]);
    notes = notes.map((n) => (n.id === id ? { ...n, read: true } : n));
    return r.fulfill(jsonBody(notes.find((n) => n.id === id)));
  });
  await page.route(/\/api\/notifications(\?|$)/, (r: Route) => {
    const url = new URL(r.request().url());
    const unreadOnly = url.searchParams.get("unreadOnly") === "true";
    const content = unreadOnly ? notes.filter((n) => !n.read) : notes;
    return r.fulfill(jsonBody({ content, page: 0, size: 20, totalElements: content.length, totalPages: 1 }));
  });
}

test("notifications list + mark all read", async ({ page }) => {
  await mockBackend(page);

  await page.goto("/notifications");
  await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
  await expect(page.getByText("Document DOC-2026-007 pending approval")).toBeVisible();
  await expect(page.getByText("CAPA-2026-003 assigned")).toBeVisible();

  // A deep link to the source record is offered.
  await expect(page.getByRole("link", { name: "View record" }).first()).toBeVisible();

  // Mark all read, then filter to Unread -> empty.
  await page.getByRole("button", { name: "Mark all read" }).click();
  await page.getByRole("button", { name: "Unread", exact: true }).click();
  await expect(page.getByText("No unread notifications.")).toBeVisible();
});
