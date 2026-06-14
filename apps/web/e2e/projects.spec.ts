import { expect, test } from "@playwright/test";

const document = {
  schemaVersion: "0.1.0",
  documentId: "design_cloud",
  title: "Cloud design",
  createdAt: "2026-06-14T00:00:00.000Z",
  updatedAt: "2026-06-14T00:00:00.000Z",
  canvas: { width: 800, height: 600, unit: "px", dpi: 96 },
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
};

test("opens a cloud project and autosaves command changes", async ({
  page,
}) => {
  let autosaved = false;
  await page.route("http://127.0.0.1:8000/api/projects/project_1", (route) =>
    route.fulfill({
      json: {
        success: true,
        data: { id: "project_1", document_json: document },
        message: "ok",
      },
    }),
  );
  await page.route(
    "http://127.0.0.1:8000/api/projects/project_1/autosave",
    async (route) => {
      autosaved = true;
      await route.fulfill({
        json: { success: true, data: {}, message: "project autosaved" },
      });
    },
  );
  await page.goto("/editor?projectId=project_1");
  await page.evaluate(() =>
    localStorage.setItem("geekdesign.auth.token", "test-token"),
  );
  await page.reload();

  await page.getByRole("button", { name: "Add text" }).click();
  await expect.poll(() => autosaved).toBe(true);
  await expect(page.getByText("Saved to cloud")).toBeVisible();
});

test("shows owned projects", async ({ page }) => {
  await page.route("http://127.0.0.1:8000/api/projects", (route) =>
    route.fulfill({
      json: {
        success: true,
        data: [
          {
            id: "project_1",
            title: "Cloud design",
            updated_at: "2026-06-14T00:00:00.000Z",
            share_enabled: false,
          },
        ],
        message: "ok",
      },
    }),
  );
  await page.goto("/projects");

  await expect(
    page.getByRole("heading", { name: "My projects" }),
  ).toBeVisible();
  await expect(page.getByText("Cloud design")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open" })).toHaveAttribute(
    "href",
    "/editor?projectId=project_1",
  );
});
