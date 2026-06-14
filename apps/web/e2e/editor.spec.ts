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
  await expect(page.getByRole("button", { name: "Export PDF" })).toBeVisible();

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

test("drags an element with one undoable command", async ({ page }) => {
  await page.getByRole("button", { name: "Add rectangle" }).click();
  const canvas = page.getByLabel("Design canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Design canvas is not visible");

  await page.mouse.move(box.x + 290, box.y + 250);
  await page.mouse.down();
  await page.mouse.move(box.x + 370, box.y + 290, { steps: 8 });
  await page.mouse.up();

  const selection = page.getByTestId("selection-box");
  await expect(selection).toHaveAttribute("data-x", "260");
  await expect(selection).toHaveAttribute("data-y", "220");

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(selection).toHaveAttribute("data-x", "180");
  await expect(selection).toHaveAttribute("data-y", "180");
});
