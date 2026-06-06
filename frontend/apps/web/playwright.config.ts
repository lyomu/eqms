import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright e2e config. Runs against a dedicated dev-server port (3100) so it never
 * collides with a manually-running `pnpm dev`. Tests mock the backend with `page.route`,
 * so no live backend is required.
 */
const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // One retry everywhere: absorbs occasional flakes when many specs hit the shared
  // server in parallel (the assertions themselves are deterministic).
  retries: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Run against a production build: all routes are precompiled, so tests don't flake on
  // Next's lazy per-route dev compilation (which times out under parallel cold hits).
  webServer: {
    command: `pnpm exec next build && pnpm exec next start -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
