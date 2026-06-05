import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock the router (the list page uses useRouter).
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/documents",
}));

// Mock the axios client so the page "fetches" deterministic data.
const pageResponse = {
  content: [
    {
      id: 1,
      documentNumber: "SOP-2026-001",
      title: "Cleaning SOP",
      type: "SOP",
      status: "EFFECTIVE",
      majorVersion: 1,
      version: 3,
      content: "body",
      effectiveDate: "2026-01-10T00:00:00Z",
      nextReviewDate: null,
      reviewPeriodMonths: 12,
      supersededById: null,
      createdBy: 5,
      submittedBy: null,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-05T00:00:00Z",
    },
  ],
  page: 0,
  size: 10,
  totalElements: 1,
  totalPages: 1,
};
const users = [{ id: 5, fullName: "Alice Approver", email: "alice@eqms.local", status: "ACTIVE" }];

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(async (url: string) => {
      if (url.startsWith("/api/documents")) return { data: pageResponse };
      if (url === "/api/users") return { data: users };
      return { data: null };
    }),
  },
}));

import DocumentsListPage from "@/app/(app)/documents/page";

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("DocumentsListPage (integration)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches and displays documents with status and resolved owner name", async () => {
    const { container } = renderWithClient(<DocumentsListPage />);

    // Row data from the mocked list endpoint
    await waitFor(() => expect(screen.getByText("SOP-2026-001")).toBeInTheDocument());
    expect(screen.getByText("Cleaning SOP")).toBeInTheDocument();
    // Status badge in the row renders with the EFFECTIVE status (distinct from the filter option)
    expect(container.querySelector('[data-status="EFFECTIVE"]')).not.toBeNull();
    // Owner id resolved to a name via /api/users — appears in both the row cell and the
    // owner filter option, so two matches confirm the row resolved the name (not "User #5").
    await waitFor(() => expect(screen.getAllByText("Alice Approver").length).toBeGreaterThanOrEqual(2));
  });

  it("shows the empty state when there are no documents", async () => {
    const { api } = await import("@/lib/api");
    (api.get as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
      if (url.startsWith("/api/documents"))
        return { data: { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 } };
      if (url === "/api/users") return { data: [] };
      return { data: null };
    });

    renderWithClient(<DocumentsListPage />);
    await waitFor(() => expect(screen.getByText("No documents found")).toBeInTheDocument());
  });
});
