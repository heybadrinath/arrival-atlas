import { expect, test } from "@playwright/test";

test("traveler can open a real route comparison", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Know the route before you book." }),
  ).toBeVisible();
  await expect(
    page.getByText("Official BTS records", { exact: false }).first(),
  ).toBeVisible();

  await page.getByRole("button", { name: "Explore route" }).click();
  await expect(page).toHaveURL(/\/route\?/);
  await expect(
    page.getByRole("heading", { name: "Historical route readout" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Airlines on this route" }),
  ).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(
    page.getByRole("img", { name: /Monthly on-time/ }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Definition: On-time arrival" })
    .hover();
  await expect(page.getByRole("tooltip")).toContainText(
    "Arrived less than 15 minutes",
  );

  await page.getByLabel("Travel month").selectOption("12");
  await page.getByRole("button", { name: "Explore route" }).click();
  await expect(page).toHaveURL(/month=12/);
  await expect(page.getByText("December · Any departure time")).toBeVisible();
});

test("invalid filters fail safely", async ({ page }) => {
  await page.goto("/route?origin=XXX&destination=YYY&month=99&band=Timewarp");
  await expect(
    page.getByText("One or more URL filters were invalid", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Historical route readout" }),
  ).toBeVisible();
});

test("mobile pages do not overflow horizontally", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(overflow).toBe(false);
  await page.goto("/methodology");
  await expect(
    page.getByRole("heading", {
      name: "Every number should survive a second look.",
    }),
  ).toBeVisible();
  const methodologyOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(methodologyOverflow).toBe(false);
});

test("seasonal route with no matching month has a useful empty state", async ({
  page,
}) => {
  await page.goto("/route?origin=ANC&destination=ORD&month=2&band=All");
  await expect(page.getByText("No matching flights")).toBeVisible();
  await expect(
    page.getByText("Try another month, time window, or route."),
  ).toBeVisible();
});

test("one-airline small sample remains visible without a rank", async ({
  page,
}) => {
  await page.goto("/route?origin=ASE&destination=AUS&month=2&band=All");
  await expect(
    page.getByRole("heading", { name: "Historical route readout" }),
  ).toBeVisible();
  await expect(
    page.getByText(/No airline reaches the 100-arrival minimum/),
  ).toBeVisible();
  await expect(page.getByText(/Small sample/).first()).toBeVisible();
});

test("a failed data catalog request shows a safe error state", async ({
  page,
}) => {
  await page.route("**/catalog.json", (route) => route.abort());
  await page.goto("/route");
  await expect(page.getByText("The data file could not be read")).toBeVisible();
});
