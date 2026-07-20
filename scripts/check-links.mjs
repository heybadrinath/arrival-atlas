const links = [
  "https://www.transtats.bts.gov/TableInfo.asp?QO_fu146_anzr=b0-gvzr&gnoyr_VQ=FGJ",
  "https://www.transtats.bts.gov/DL_SelectFields.aspx?QO_fu146_anzr=b0-gvzr&gnoyr_VQ=FGJ",
  "https://github.com/heybadrinath/arrival-atlas",
  "https://github.com/heybadrinath/arrival-atlas-data",
  "https://raw.githubusercontent.com/heybadrinath/arrival-atlas-data/main/catalog.json",
  "https://raw.githubusercontent.com/heybadrinath/arrival-atlas-data/main/manifest.json",
];

if (process.env.LIVE_SITE_URL) links.push(process.env.LIVE_SITE_URL);

const failures = [];
for (const url of links) {
  try {
    const response = await fetch(url, {
      headers: { Range: "bytes=0-0" },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
    await response.body?.cancel();
    if (!response.ok) failures.push(`${url}: HTTP ${response.status}`);
    else console.log(`OK ${response.status} ${url}`);
  } catch (error) {
    failures.push(
      `${url}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
