import { test, expect, type Page, type Route } from "@playwright/test";

const me = { id: 1, email: "john@demo.com", fullName: "John Demo", authorities: ["SUPPLIER_CREATE", "SUPPLIER_APPROVE", "AUDIT_VIEW"] };

function jsonBody(data: unknown, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify(data) };
}

async function mockBackend(page: Page) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supplier: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const certs: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const perf: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const audits: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const findings: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trail: any[] = [];
  let auditId = 1;
  const push = (action: string, reason: string) => trail.unshift({ id: auditId++, action, fieldName: null, oldValue: null, newValue: null, reasonForChange: reason, userId: 1, userFullName: "John Demo", utcTimestamp: "2026-06-05T10:00:00Z", ipAddress: "127.0.0.1", userAgent: "test" });

  await page.route("**/api/auth/me", (r: Route) => r.fulfill(jsonBody(me)));
  await page.route(/\/api\/notifications\/unread-count$/, (r: Route) => r.fulfill(jsonBody({ unread: 0 })));
  await page.route(/\/api\/suppliers\/\d+\/certifications$/, (r: Route) => r.fulfill(jsonBody(certs)));
  await page.route(/\/api\/suppliers\/\d+\/performance-history$/, (r: Route) => r.fulfill(jsonBody(perf)));
  await page.route(/\/api\/suppliers\/\d+\/audit-history$/, (r: Route) => r.fulfill(jsonBody(audits)));
  await page.route(/\/api\/suppliers\/\d+\/findings$/, (r: Route) => r.fulfill(jsonBody(findings)));
  await page.route(/\/api\/suppliers\/\d+\/audit-trail$/, (r: Route) => r.fulfill(jsonBody(trail)));

  await page.route(/\/api\/suppliers\/\d+\/conditional$/, (r: Route) => { supplier.status = "CONDITIONAL"; supplier.version++; push("STATUS_CHANGE", "Conditional qualification"); return r.fulfill(jsonBody(supplier)); });
  await page.route(/\/api\/suppliers\/\d+\/upload-certificate$/, (r: Route) => { const b = r.request().postDataJSON(); certs.push({ id: 1, certType: b.certType, issueDate: b.issueDate, expiryDate: b.expiryDate, filePath: b.filePath, createdAt: "2026-06-05T10:00:00Z" }); push("UPDATE", "Supplier certificate uploaded"); return r.fulfill(jsonBody(certs[0], 201)); });
  await page.route(/\/api\/suppliers\/\d+\/record-performance$/, (r: Route) => { const b = r.request().postDataJSON(); perf.unshift({ id: 1, assessmentPeriodStart: b.assessmentPeriodStart, assessmentPeriodEnd: b.assessmentPeriodEnd, onTimeDeliveryPct: b.onTimeDeliveryPct, qualityAcceptancePct: b.qualityAcceptancePct, responsivenessRating: b.responsivenessRating, createdAt: "2026-06-05T10:00:00Z" }); push("UPDATE", "Supplier performance recorded"); return r.fulfill(jsonBody(perf[0], 201)); });
  await page.route(/\/api\/suppliers\/\d+\/issue-finding$/, (r: Route) => { const b = r.request().postDataJSON(); findings.unshift({ id: 1, supplierId: 1, findingDate: "2026-06-05T10:00:00Z", findingDescription: b.findingDescription, severity: b.severity, rootCause: null, correctiveActionRequired: b.correctiveActionRequired, createdAt: "2026-06-05T10:00:00Z" }); push("UPDATE", "Supplier finding issued"); return r.fulfill(jsonBody(findings[0], 201)); });
  await page.route(/\/api\/suppliers\/\d+$/, (r: Route) => r.fulfill(jsonBody(supplier)));
  await page.route(/\/api\/suppliers(\?|$)/, (r: Route) => {
    if (r.request().method() === "POST") {
      const b = r.request().postDataJSON();
      supplier = { id: 1, supplierCode: "SUP-2026-001", supplierName: b.supplierName, supplierType: b.supplierType, contactPerson: b.contactPerson, email: b.email, phone: b.phone, location: b.location, status: "UNAPPROVED", version: 0, qualificationDate: null, ownerId: 1, createdAt: "2026-06-05T10:00:00Z", createdBy: 1, updatedAt: "2026-06-05T10:00:00Z" };
      push("CREATE", "Supplier created");
      return r.fulfill(jsonBody(supplier, 201));
    }
    return r.fulfill(jsonBody({ content: supplier ? [supplier] : [], page: 0, size: 10, totalElements: supplier ? 1 : 0, totalPages: 1 }));
  });
}

test("supplier workflow: create -> conditional qualify -> certificate -> performance -> finding", async ({ page }) => {
  await mockBackend(page);
  await page.goto("/suppliers/new");
  await page.addStyleTag({ content: "[data-sonner-toaster]{display:none !important}" });
  await page.getByLabel("Name *").fill("Acme Raw Materials");
  await page.getByLabel("Location *").fill("Nairobi");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page).toHaveURL(/\/suppliers\/1$/);
  await expect(page.getByText("Unapproved").first()).toBeVisible();

  await page.getByRole("button", { name: "Qualify" }).click();
  await page.getByLabel("Approval status").selectOption("Conditional");
  await page.getByLabel("Conditional reason").fill("Pending updated GMP certificate.");
  await page.getByLabel("Password *").fill("Password123!");
  await page.getByRole("button", { name: "Sign" }).click();
  await expect(page.getByText("Conditional").first()).toBeVisible();

  await page.getByRole("button", { name: "Upload Certificate" }).click();
  await page.getByLabel("File path or URL").fill("https://example.test/cert.pdf");
  await page.getByRole("button", { name: "Upload" }).click();
  await page.getByRole("tab", { name: "Certifications" }).click();
  await expect(page.getByText("ISO 9001")).toBeVisible();

  await page.getByRole("button", { name: "Record Performance" }).click();
  await page.getByLabel("Period (month/year)").fill("2026-06");
  await page.getByLabel("On-time delivery %").fill("98");
  await page.getByLabel("Quality acceptance %").fill("99");
  await page.getByRole("button", { name: "Record" }).click();
  await page.getByRole("tab", { name: "Performance" }).click();
  await expect(page.getByLabel("Supplier performance trend")).toBeVisible();

  await page.getByRole("button", { name: "Create Finding" }).click();
  await page.getByLabel("Finding description").fill("Late CoA submission.");
  await page.getByLabel("Create CAPA for this finding").selectOption("true");
  await page.getByRole("button", { name: "Submit" }).click();
  await page.getByRole("tab", { name: "Findings & CAPAs" }).click();
  await expect(page.getByText("Late CoA submission.")).toBeVisible();
});
