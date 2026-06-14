import { expect, test } from "@playwright/test";

test("creates a PDF task and shows export status", async ({ page }) => {
  await page.route("http://127.0.0.1:8000/api/projects", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        message: "ok",
        data: { id: "project_export" },
      }),
    });
  });
  await page.route("http://127.0.0.1:8000/api/exports/pdf", async (route) => {
    await route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        message: "queued",
        data: { id: "task_pdf", format: "pdf", status: "queued" },
      }),
    });
  });
  await page.route(
    "http://127.0.0.1:8000/api/exports/task_pdf",
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "ok",
          data: {
            id: "task_pdf",
            format: "pdf",
            status: "completed",
            result_url: "/exports/result.pdf",
          },
        }),
      });
    },
  );

  await page.goto("/editor");
  await page.getByRole("button", { name: "Export PDF" }).click();

  await expect(page.getByTestId("export-status")).toContainText(
    "PDF export queued",
  );
  await expect(page.getByRole("link", { name: "Download PDF" })).toBeVisible({
    timeout: 5_000,
  });
});

test("downloads PNG in the browser", async ({ page }) => {
  await page.goto("/editor");

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PNG" }).click();

  await download;
  await expect(page.getByTestId("export-status")).toContainText(
    "PNG downloaded",
  );
});
