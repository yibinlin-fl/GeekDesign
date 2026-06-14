import { expect, test } from "@playwright/test";

test("opens the server-only render page", async ({ page }) => {
  await page.route(
    "http://127.0.0.1:8000/api/projects/project_render",
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "ok",
          data: {
            title: "Render smoke",
            document_json: {
              schemaVersion: "0.1.0",
              documentId: "render_smoke",
              title: "Render smoke",
              createdAt: "2026-06-14T00:00:00.000Z",
              updatedAt: "2026-06-14T00:00:00.000Z",
              canvas: { width: 320, height: 240, unit: "px", dpi: 96 },
              pages: [
                {
                  id: "page_1",
                  name: "Page 1",
                  background: { type: "solid", color: "#ffffff" },
                  children: [],
                },
              ],
              nodes: {},
              assets: {},
              fonts: {},
              variables: {},
              metadata: {},
            },
          },
        }),
      });
    },
  );

  await page.goto("/render/project_render");

  await expect(page.locator('[data-render-ready="true"]')).toBeVisible();
  await expect(page.getByLabel("Server render canvas")).toBeVisible();
});
