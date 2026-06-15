import { expect, test } from "@playwright/test";

test("inserts an uploaded asset into the canvas", async ({ page }) => {
  await page.route("http://127.0.0.1:8000/api/assets", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        message: "ok",
        data: [
          {
            id: "asset_e2e",
            filename: "library-photo.png",
            mime_type: "image/png",
            size_bytes: 128,
            url: "/uploads/user/library-photo.png",
            thumbnail_url: "/uploads/user/library-photo_thumb.webp",
            created_at: "2026-06-14T00:00:00.000Z",
          },
        ],
      }),
    });
  });
  await page.route("http://127.0.0.1:8000/uploads/**", async (route) => {
    await route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="#7c3aed"/></svg>',
    });
  });

  await page.goto("/editor");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await expect(page.getByTestId("asset-list")).toContainText("");
  await page.getByRole("button", { name: "Insert library-photo.png" }).click();

  await expect(page.getByTestId("layers-list")).toContainText(
    "library-photo.png",
  );
  await expect(page.getByTestId("selection-box")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Replace selected" }),
  ).toBeVisible();
});

test("adds a local image when the API is unavailable", async ({ page }) => {
  await page.route("http://127.0.0.1:8000/api/assets**", (route) =>
    route.abort(),
  );
  await page.goto("/editor");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.locator('input[type="file"]').setInputFiles({
    name: "local-image.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160"><rect width="240" height="160" fill="#0ea5e9"/></svg>',
    ),
  });

  await expect(page.getByTestId("layers-list")).toContainText(
    "local-image.svg",
  );
  await expect(page.getByLabel("Image fit")).toBeVisible();
  await page.getByLabel("Image fit").selectOption("contain");
  await expect(page.getByLabel("Image fit")).toHaveValue("contain");
});
