import { expect, test, type Page } from "@playwright/test";

async function chooseOption(
  page: Page,
  controlName: string,
  optionName: string | RegExp,
  search?: string,
) {
  await page.getByRole("button", { name: controlName, exact: true }).click();
  if (search) {
    await page
      .getByRole("searchbox", {
        name: `Search ${controlName.toLowerCase()}`,
      })
      .fill(search);
  }
  await page.getByRole("option", { name: optionName, exact: true }).click();
}

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

  await chooseOption(page, "Travel month", "December");
  await page.getByRole("button", { name: "Explore route" }).click();
  await expect(page).toHaveURL(/month=12/);
  await expect(page.getByText("December · Any departure time")).toBeVisible();
});

test("airport search and recent routes support repeat exploration", async ({
  page,
}) => {
  await page.goto("/");
  await chooseOption(page, "Origin airport", "SEA — Seattle, WA", "Seattle");
  await chooseOption(
    page,
    "Destination airport",
    "PDX — Portland, OR",
    "Portland",
  );
  await page.getByRole("button", { name: "Explore route" }).click();
  await expect(page).toHaveURL(/origin=SEA&destination=PDX/);
  await expect(
    page.getByRole("heading", { name: "Historical route readout" }),
  ).toBeVisible();

  await page.goto("/");
  const recentRoute = page.getByRole("button", {
    name: /Open recent route SEA to PDX/,
  });
  await expect(recentRoute).toBeVisible();
  await recentRoute.click();
  await expect(page).toHaveURL(/origin=SEA&destination=PDX/);
});

test("airport filters update immediately from the custom pickers", async ({
  page,
}) => {
  await page.goto("/airport?code=ATL&month=5");
  await expect(
    page.getByRole("heading", { name: "Departing-flight reliability" }),
  ).toBeVisible();

  await chooseOption(page, "Airport", "SEA — Seattle, WA", "Seattle");
  await expect(page).toHaveURL(/code=SEA&month=5/);
  await expect(page.getByRole("heading", { name: "SEA" })).toBeVisible();

  await chooseOption(page, "Calendar month", "December");
  await expect(page).toHaveURL(/code=SEA&month=12/);
  await expect(
    page.getByText("December across the covered history"),
  ).toBeVisible();
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
