import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/editor");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("edits through commands, persists locally, and exposes export", async ({
  page,
}) => {
  await expect(page.getByText("GeekDesign")).toBeVisible();
  await expect(page.getByRole("button", { name: "Export PNG" })).toBeVisible();

  await page.getByRole("button", { name: "Add text" }).click();
  await expect(page.getByTestId("layers-list")).toContainText("New text");

  const input = page.getByLabel("Text content");
  await input.fill("Playwright title");
  await expect(page.getByTestId("layers-list")).toContainText(
    "Playwright title",
  );

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByTestId("layers-list")).toContainText("New text");

  await page.getByRole("button", { name: "Redo" }).click();
  await expect(page.getByTestId("layers-list")).toContainText(
    "Playwright title",
  );

  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved locally")).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("layers-list")).toContainText(
    "Playwright title",
  );
});
