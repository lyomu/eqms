import { test, expect, type Page } from "@playwright/test";

/**
 * Dashboard e2e. The backend is mocked with page.route so the test is deterministic and
 * needs no live API / MFA. Verifies the dashboard renders and greets the signed-in user.
 */

const me = {
  id: 1,
  email: "john@demo.com",
  fullName: "John Demo",
  authorities: ["DOCUMENT_APPROVE"],
};

const statistics = {
  totalDocuments: 42,
  effectiveDocuments: 30,
  totalChangeControls: 12,
  openChangeControls: 5,
  totalCapas: 8,
  openCapas: 3,
  totalDeviations: 6,
  openDeviations: 2,
  totalProducts: 10,
  activeProducts: 9,
  totalMaterials: 20,
  approvedMaterials: 18,
  totalBatchRecords: 15,
  releasedBatchRecords: 11,
};

const myWork = { pendingApprovals: 2, myDueDatedTasks: 1, unreadNotifications: 4 };

const approvals = {
  total: 1,
  byModule: { Document: 1 },
  items: [
    { module: "Document", recordId: 7, recordNumber: "DOC-2026-007", status: "PENDING_APPROVAL", dueDate: null },
  ],
};

const dueSoon = [
  { module: "Capa", recordId: 3, recordNumber: "CAPA-2026-003", status: "OPEN", dueDate: "2026-06-10T00:00:00Z" },
];

const overdue = [
  { module: "ChangeControl", recordId: 4, recordNumber: "CC-2026-004", status: "IN_REVIEW", dueDate: "2026-06-01T00:00:00Z" },
];

/** Register all backend mocks the dashboard touches. */
async function mockBackend(page: Page) {
  const json = (data: unknown) => async (route: import("@playwright/test").Route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) });

  await page.route("**/api/auth/me", json(me));
  await page.route(/\/api\/notifications\/unread-count$/, json({ unread: 0 }));
  await page.route("**/api/dashboard/compliance-status", json({ documentsDueForReview: 0, overdueCapas: 0, overdueChangeControls: 0, openDeviations: 0, quarantinedBatches: 0 }));
  await page.route("**/api/dashboard/statistics", json(statistics));
  await page.route("**/api/dashboard/my-work", json(myWork));
  await page.route("**/api/dashboard/my-approvals", json(approvals));
  await page.route("**/api/dashboard/due-soon", json(dueSoon));
  await page.route("**/api/dashboard/overdue-items", json(overdue));
}

test("dashboard loads and greets the signed-in user", async ({ page }) => {
  await mockBackend(page);

  await page.goto("/");

  // Page renders
  await expect(page.getByRole("heading", { name: "My Work" })).toBeVisible();
  // Greets the user by first name
  await expect(page.getByText("Welcome, John.")).toBeVisible();
  // Stats rendered from the mocked statistics endpoint
  await expect(page.getByText("Documents", { exact: true })).toBeVisible();
  await expect(page.getByText("42")).toBeVisible();
  // A pending-approval item is listed
  await expect(page.getByText("DOC-2026-007")).toBeVisible();
});

test("dashboard surfaces a stats error without blanking the page", async ({ page }) => {
  await mockBackend(page);
  // Override statistics to fail.
  await page.route("**/api/dashboard/statistics", (route) => route.fulfill({ status: 500 }));

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "My Work" })).toBeVisible();
  await expect(page.getByText("Couldn't load statistics")).toBeVisible();
});
