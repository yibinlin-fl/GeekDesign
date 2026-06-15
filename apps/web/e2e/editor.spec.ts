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
  const scale = box.width / 800;

  await page.mouse.move(box.x + 290 * scale, box.y + 250 * scale);
  await page.mouse.down();
  await page.mouse.move(box.x + 370 * scale, box.y + 290 * scale, {
    steps: 8,
  });
  await page.mouse.up();

  const selection = page.getByTestId("selection-box");
  await expect(selection).toHaveAttribute("data-x", "260");
  await expect(selection).toHaveAttribute("data-y", "220");

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(selection).toHaveAttribute("data-x", "180");
  await expect(selection).toHaveAttribute("data-y", "180");
});

test("resizes, rotates, nudges, duplicates, and deletes a selection", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Add rectangle" }).click();
  const selection = page.getByTestId("selection-box");

  const resizeHandle = page.getByRole("button", { name: "Resize se" });
  const resizeBox = await resizeHandle.boundingBox();
  if (!resizeBox) throw new Error("Resize handle is not visible");
  await page.mouse.move(
    resizeBox.x + resizeBox.width / 2,
    resizeBox.y + resizeBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(resizeBox.x + 60, resizeBox.y + 40, { steps: 6 });
  await page.mouse.up();
  await expect(selection).not.toHaveAttribute("data-width", "220");

  const rotationHandle = page.getByRole("button", { name: "Rotate selection" });
  const rotationBox = await rotationHandle.boundingBox();
  const selectionBox = await selection.boundingBox();
  if (!rotationBox || !selectionBox)
    throw new Error("Rotation controls are not visible");
  await page.mouse.move(
    rotationBox.x + rotationBox.width / 2,
    rotationBox.y + rotationBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    selectionBox.x + selectionBox.width + 30,
    selectionBox.y + selectionBox.height / 2,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect(selection).not.toHaveAttribute("data-rotation", "0");

  await page.getByLabel("Rotation").fill("30");
  await expect(selection).toHaveAttribute("data-rotation", "30");

  await page.getByLabel("Rotation").press("Tab");
  await page.keyboard.press("ArrowRight");
  await expect(selection).toHaveAttribute("data-x", "181");
  await page.keyboard.press("Control+d");
  await expect(page.getByTestId("layers-list")).toContainText("Rectangle copy");
  await page.keyboard.press("Delete");
  await expect(page.getByTestId("layers-list")).not.toContainText(
    "Rectangle copy",
  );

  const fitButton = page.getByRole("button", { name: "Fit canvas" });
  const zoomBefore = await fitButton.textContent();
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(fitButton).not.toHaveText(zoomBefore ?? "");
});

test("adds shapes and edits their appearance", async ({ page }) => {
  await page.getByRole("button", { name: "Add ellipse" }).click();
  await expect(page.getByTestId("layers-list")).toContainText("Ellipse");
  await page.getByLabel("Opacity").fill("60");
  await page.getByLabel("Stroke").fill("#123456");

  await page.getByRole("button", { name: "Add line" }).click();
  await expect(page.getByTestId("layers-list")).toContainText("Line");

  await page.getByRole("button", { name: "Add frame" }).click();
  await expect(page.getByTestId("layers-list")).toContainText("Frame");
});

test("edits text directly on canvas and changes typography", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Add text" }).click();
  const canvas = page.getByLabel("Design canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Design canvas is not visible");
  const scale = box.width / 800;

  await page.mouse.dblclick(box.x + 180 * scale, box.y + 125 * scale);
  const inlineEditor = page.getByTestId("inline-text-editor");
  await expect(inlineEditor).toBeVisible();
  await inlineEditor.press("Control+a");
  await inlineEditor.pressSequentially("Edited directly");
  await inlineEditor.press("Control+Enter");
  await expect(page.getByTestId("layers-list")).toContainText(
    "Edited directly",
  );

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByTestId("layers-list")).toContainText("New text");
  await page.getByRole("button", { name: "Redo" }).click();

  await page.getByLabel("Toolbar font family").selectOption("Georgia");
  await page.getByRole("button", { name: "Bold" }).click();
  await page.getByRole("button", { name: "Align center", exact: true }).click();
  await page.getByLabel("Line height position or size").fill("1.5");
  await page.getByLabel("Letter spacing position or size").fill("2");
  await expect(page.getByRole("button", { name: "Bold" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
