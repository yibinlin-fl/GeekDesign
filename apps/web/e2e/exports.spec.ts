import { expect, test } from "@playwright/test";

test("downloads all pages as PDF in the browser", async ({ page }) => {
  await page.goto("/editor");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PDF" }).click();

  await download;
  await expect(page.getByTestId("export-status")).toContainText(
    "PDF downloaded",
  );
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

test("explains that editable PPTX export requires sign in", async ({
  page,
}) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Export PPTX" }).click();

  await expect(page.getByTestId("export-status")).toContainText(
    "Sign in first",
  );
});
