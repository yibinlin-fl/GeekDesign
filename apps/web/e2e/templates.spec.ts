import { expect, test } from "@playwright/test";

test("browses, filters, and opens template details", async ({ page }) => {
  await page.goto("/templates");

  await expect(page.getByRole("heading", { name: "Make the first draft feel finished." })).toBeVisible();
  await expect(page.getByTestId("template-grid")).toContainText("Gradient Event Announcement");

  await page.getByPlaceholder("Search templates").fill("resume");
  await expect(page.getByTestId("template-grid")).toContainText("Minimal Product Resume");
  await expect(page.getByTestId("template-grid")).not.toContainText("Gradient Event Announcement");

  await page.getByRole("button", { name: /Minimal Product Resume/ }).click();
  await expect(page.getByRole("dialog", { name: "Template details" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Use this template" })).toBeVisible();
});
