import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm exec next dev -p 3100",
    env: { NEXT_DIST_DIR: ".next-e2e" },
    url: "http://127.0.0.1:3100/editor",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
