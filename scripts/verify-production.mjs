import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const siteUrl = process.env.LIVE_SITE_URL ?? "https://arrival-atlas.vercel.app";
const canonicalHome = new URL(siteUrl).origin;
const outputDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../test-results/production-verification",
);
const viewports = [
  { name: "desktop", viewport: { width: 1440, height: 1000 } },
  {
    name: "mobile",
    viewport: { width: 393, height: 852 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  },
];

async function chooseOption(page, controlName, optionName, search) {
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

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch();
const report = [];

try {
  for (const device of viewports) {
    const context = await browser.newContext({
      viewport: device.viewport,
      isMobile: device.isMobile,
      hasTouch: device.hasTouch,
      deviceScaleFactor: device.deviceScaleFactor,
    });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    const failedRequests = [];
    const badResponses = [];
    const dataResponses = [];

    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("requestfailed", (request) => {
      // hyparquet may stop a successful HEAD probe after reading its headers.
      if (request.method() !== "HEAD") {
        failedRequests.push({
          method: request.method(),
          url: request.url(),
          error: request.failure()?.errorText,
        });
      }
    });
    page.on("response", (response) => {
      const item = {
        method: response.request().method(),
        status: response.status(),
        url: response.url(),
      };
      if (response.status() >= 400) badResponses.push(item);
      if (response.url().includes("raw.githubusercontent.com")) {
        dataResponses.push(item);
      }
    });

    const landingResponse = await page.goto(siteUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    assert.equal(landingResponse?.status(), 200);
    await page
      .getByRole("heading", { name: "Know the route before you book." })
      .waitFor({ timeout: 30_000 });
    await page
      .getByText("Official BTS records", { exact: false })
      .first()
      .waitFor({ timeout: 30_000 });
    await chooseOption(
      page,
      "Origin airport",
      "LAX — Los Angeles, CA",
      "Los Angeles",
    );
    await chooseOption(
      page,
      "Destination airport",
      "SFO — San Francisco, CA",
      "San Francisco",
    );
    assert.equal(
      await page.getByRole("button", { name: "Explore route" }).isEnabled(),
      true,
    );

    const metadata = await page.evaluate(() => ({
      title: document.title,
      description:
        document
          .querySelector('meta[name="description"]')
          ?.getAttribute("content") ?? "",
      canonical:
        document.querySelector('link[rel="canonical"]')?.getAttribute("href") ??
        "",
      openGraphTitle:
        document
          .querySelector('meta[property="og:title"]')
          ?.getAttribute("content") ?? "",
      manifest:
        document.querySelector('link[rel="manifest"]')?.getAttribute("href") ??
        "",
    }));
    assert.match(metadata.title, /Arrival Atlas/);
    assert.ok(metadata.description.length > 30);
    assert.equal(metadata.canonical, canonicalHome);
    assert.match(metadata.openGraphTitle, /Arrival Atlas/);
    assert.equal(metadata.manifest, "/manifest.webmanifest");

    const landingOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    assert.equal(landingOverflow, false);
    await page.screenshot({
      path: path.join(outputDir, `${device.name}-landing.png`),
      fullPage: true,
    });

    await page.getByRole("button", { name: "Explore route" }).click();
    await page.waitForURL(/\/route\?/);
    await page
      .getByRole("heading", { name: "Historical route readout" })
      .waitFor({ timeout: 30_000 });
    await page.getByRole("table").waitFor();
    await page
      .getByRole("img", { name: /Monthly on-time/ })
      .waitFor({ timeout: 30_000 });
    await page
      .getByRole("button", { name: "Definition: On-time arrival" })
      .hover();
    await page.getByRole("tooltip").waitFor();
    assert.match(
      await page.getByRole("tooltip").innerText(),
      /less than 15 minutes/,
    );

    await chooseOption(page, "Travel month", "December");
    await page.getByRole("button", { name: "Explore route" }).click();
    await page.waitForURL(/month=12/);
    await page.getByText("December · Any departure time").waitFor();
    await page
      .getByText("Loading historical airline coverage…")
      .waitFor({ state: "hidden", timeout: 30_000 });
    assert.equal(
      await page
        .getByText("Historical airline coverage could not be loaded.", {
          exact: false,
        })
        .count(),
      0,
    );
    const timeBandChartText = await page
      .getByRole("img", {
        name: "On-time arrival rate by departure time band",
      })
      .innerText();
    assert.doesNotMatch(
      timeBandChartText,
      /\d+\.\d{2,}%/,
      "departure-time labels must be rounded to one decimal place",
    );
    const routeOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    assert.equal(routeOverflow, false);
    await page.screenshot({
      path: path.join(outputDir, `${device.name}-route.png`),
      fullPage: true,
    });

    await page.goto(`${siteUrl}/methodology`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page
      .getByRole("heading", {
        name: "Every number should survive a second look.",
      })
      .waitFor();
    assert.equal(
      await page.locator('link[rel="canonical"]').getAttribute("href"),
      new URL("/methodology", siteUrl).href,
    );
    assert.ok(
      (await page.locator('a[href*="transtats.bts.gov"]').count()) >= 2,
      "methodology must retain both official BTS source links",
    );
    const methodologyOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    assert.equal(methodologyOverflow, false);

    assert.deepEqual(consoleErrors, []);
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(failedRequests, []);
    assert.deepEqual(badResponses, []);
    assert.ok(
      dataResponses.some(
        (response) =>
          response.url.endsWith("/catalog.json") && response.status === 200,
      ),
      "the compact public data catalog was not loaded successfully",
    );
    assert.ok(
      dataResponses.some(
        (response) =>
          response.url.endsWith(".parquet") &&
          [200, 206].includes(response.status),
      ),
      "no public Parquet partition was loaded successfully",
    );

    report.push({
      device: device.name,
      metadata,
      overflows: {
        landing: landingOverflow,
        route: routeOverflow,
        methodology: methodologyOverflow,
      },
      dataRequests: dataResponses.length,
      consoleErrors: consoleErrors.length,
      pageErrors: pageErrors.length,
      failedRequests: failedRequests.length,
      badResponses: badResponses.length,
    });
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(
  JSON.stringify({ siteUrl, report, screenshotDirectory: outputDir }, null, 2),
);
