"use client";

import type { EChartsOption } from "echarts";
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Filter,
  Gauge,
  PlaneLanding,
  Route,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { Chart, CHART_COLORS } from "@/components/charts/chart";
import { ChartCard } from "@/components/charts/chart-card";
import { RouteRibbon } from "@/components/route-ribbon";
import { RouteSearch } from "@/components/route-search";
import { Card } from "@/components/ui/card";
import { DataNotice } from "@/components/ui/data-notice";
import { MetricHelp } from "@/components/ui/metric-help";
import {
  EmptyPanel,
  ErrorPanel,
  LoadingPanel,
} from "@/components/ui/state-panel";
import { useManifest, useOriginTables } from "@/lib/data";
import {
  compactInteger,
  integer,
  minutes,
  MONTHS,
  percent,
  percentText,
  periodLabel,
  signedPoints,
  TIME_BANDS,
} from "@/lib/format";
import type { DataManifest, MetricRow } from "@/lib/types";
import { cn } from "@/lib/utils";

const CORE_TABLES = [
  "route_airline_comparison",
  "route_period",
  "route_month_band",
];
const AIRLINE_COVERAGE_TABLES = ["route_airline_period"];

type SortKey = "onTime" | "cancellation" | "p90" | "sample";

function onTimeRate(row: MetricRow): number | null {
  return percent(row.on_time_arrivals, row.observations);
}

function cancellationRate(row: MetricRow): number | null {
  return percent(row.cancelled_flights, row.scheduled_flights);
}

function severeRate(row: MetricRow): number | null {
  return percent(row.arrivals_60_plus, row.observations);
}

function rowMatches(
  row: MetricRow,
  destination: string,
  month: number,
  band: string,
): boolean {
  return (
    row.destination === destination &&
    row.calendar_month === month &&
    row.departure_time_band === band
  );
}

function comparisonValue(row: MetricRow, key: SortKey): number {
  if (key === "onTime") return onTimeRate(row) ?? -1;
  if (key === "cancellation")
    return cancellationRate(row) ?? Number.POSITIVE_INFINITY;
  if (key === "p90") return row.p90_arrival_delay ?? Number.POSITIVE_INFINITY;
  return row.observations;
}

function routeDefaults(manifest: DataManifest) {
  const preferred = manifest.top_routes.find(
    (route) => route.origin === "LAX" && route.destination === "SFO",
  );
  return preferred ?? manifest.top_routes[0];
}

export function RouteExplorer() {
  const searchParams = useSearchParams();
  const manifestState = useManifest();
  const manifest =
    manifestState.status === "ready" ? manifestState.data : undefined;
  const fallback = manifest ? routeDefaults(manifest) : undefined;
  const requestedOrigin = searchParams.get("origin")?.toUpperCase();
  const requestedDestination = searchParams.get("destination")?.toUpperCase();
  const requestedMonth = Number(searchParams.get("month"));
  const requestedBand = searchParams.get("band") ?? "All";

  const originIsValid =
    !!requestedOrigin && !!manifest?.routes[requestedOrigin];
  const origin = originIsValid ? requestedOrigin : fallback?.origin;
  const destinationIsValid =
    !!origin &&
    !!requestedDestination &&
    !!manifest?.routes[origin]?.some(
      (route) => route.destination === requestedDestination,
    );
  const destination = destinationIsValid
    ? requestedDestination
    : fallback?.destination;
  const month =
    requestedMonth >= 1 && requestedMonth <= 12
      ? requestedMonth
      : Number(manifest?.coverage.latest_complete_month.slice(5) ?? 1);
  const band = TIME_BANDS.includes(requestedBand) ? requestedBand : "All";
  const hasInvalidQuery =
    (!!requestedOrigin && !originIsValid) ||
    (!!requestedDestination && !destinationIsValid) ||
    (!!searchParams.get("month") &&
      !(requestedMonth >= 1 && requestedMonth <= 12)) ||
    (!!searchParams.get("band") && !TIME_BANDS.includes(requestedBand));

  const tablesState = useOriginTables(manifest, origin, CORE_TABLES);
  const airlineCoverageState = useOriginTables(
    manifest,
    tablesState.status === "ready" ? origin : undefined,
    AIRLINE_COVERAGE_TABLES,
  );
  const [sortKey, setSortKey] = useState<SortKey>("onTime");
  const [eligibleOnly, setEligibleOnly] = useState(false);

  const derived = useMemo(() => {
    if (!manifest || !destination || tablesState.status !== "ready")
      return undefined;
    const comparison = tablesState.data.route_airline_comparison.filter((row) =>
      rowMatches(row, destination, month, band),
    );
    const rankingMinimum = manifest.ranking_minimum_observations;
    const sortedComparison = comparison
      .filter((row) => !eligibleOnly || row.observations >= rankingMinimum)
      .sort((left, right) => {
        const direction = sortKey === "onTime" || sortKey === "sample" ? -1 : 1;
        return (
          (comparisonValue(left, sortKey) - comparisonValue(right, sortKey)) *
          direction
        );
      });
    const period = tablesState.data.route_period
      .filter(
        (row) =>
          row.destination === destination && row.departure_time_band === band,
      )
      .sort(
        (left, right) =>
          left.year! * 12 + left.month! - (right.year! * 12 + right.month!),
      );
    const selectedPeriods = period.filter((row) => row.month === month);
    const current = selectedPeriods.at(-1);
    const previous = current
      ? selectedPeriods.find((row) => row.year === current.year! - 1)
      : undefined;
    const monthBands = tablesState.data.route_month_band.filter(
      (row) => row.destination === destination && row.calendar_month === month,
    );
    const routeSummary = monthBands.find(
      (row) => row.departure_time_band === band,
    );
    const airlinePeriods =
      airlineCoverageState.status === "ready"
        ? airlineCoverageState.data.route_airline_period.filter(
            (row) =>
              row.destination === destination &&
              row.departure_time_band === "All",
          )
        : undefined;
    return {
      comparison: sortedComparison,
      allComparison: comparison,
      period,
      current,
      previous,
      monthBands,
      routeSummary,
      airlinePeriods,
      airlineCoverageError: airlineCoverageState.status === "error",
    };
  }, [
    airlineCoverageState,
    band,
    destination,
    eligibleOnly,
    manifest,
    month,
    sortKey,
    tablesState,
  ]);

  if (manifestState.status === "error") {
    return (
      <div className="page-shell py-14">
        <ErrorPanel error={manifestState.error} />
      </div>
    );
  }

  return (
    <>
      <section className="border-b border-white/10 bg-midnight py-8 text-white sm:py-10">
        <div className="page-shell">
          <p className="font-mono text-[0.68rem] font-semibold tracking-[0.14em] text-teal-light uppercase">
            Route reliability explorer
          </p>
          {origin && destination ? (
            <div className="mt-5 max-w-3xl">
              <RouteRibbon origin={origin} destination={destination} dark />
            </div>
          ) : (
            <h1 className="mt-3 font-display text-4xl font-semibold">
              Choose a route
            </h1>
          )}
          <div className="mt-8 rounded-2xl border border-white/12 bg-white/[0.055] p-4 sm:p-5">
            <RouteSearch
              compact
              dark
              initialOrigin={origin}
              initialDestination={destination}
              initialMonth={month}
              initialBand={band}
            />
          </div>
        </div>
      </section>

      <div className="page-shell py-10 sm:py-14">
        {hasInvalidQuery ? (
          <DataNotice tone="warning" className="mb-6">
            One or more URL filters were invalid. The explorer has opened a
            valid route and filter combination instead.
          </DataNotice>
        ) : null}

        {!manifest || tablesState.status === "loading" ? (
          <LoadingPanel />
        ) : tablesState.status === "error" ? (
          <ErrorPanel error={tablesState.error} />
        ) : !derived?.routeSummary ? (
          <EmptyPanel />
        ) : (
          <RouteResults
            manifest={manifest}
            origin={origin!}
            destination={destination!}
            month={month}
            band={band}
            data={derived}
            sortKey={sortKey}
            setSortKey={setSortKey}
            eligibleOnly={eligibleOnly}
            setEligibleOnly={setEligibleOnly}
          />
        )}
      </div>
    </>
  );
}

type RouteData = NonNullable<
  ReturnType<
    () =>
      | {
          comparison: MetricRow[];
          allComparison: MetricRow[];
          period: MetricRow[];
          current: MetricRow | undefined;
          previous: MetricRow | undefined;
          monthBands: MetricRow[];
          routeSummary: MetricRow | undefined;
          airlinePeriods: MetricRow[] | undefined;
          airlineCoverageError: boolean;
        }
      | undefined
  >
>;

function RouteResults({
  manifest,
  origin,
  destination,
  month,
  band,
  data,
  sortKey,
  setSortKey,
  eligibleOnly,
  setEligibleOnly,
}: {
  manifest: DataManifest;
  origin: string;
  destination: string;
  month: number;
  band: string;
  data: RouteData;
  sortKey: SortKey;
  setSortKey: (key: SortKey) => void;
  eligibleOnly: boolean;
  setEligibleOnly: (value: boolean) => void;
}) {
  const summary = data.routeSummary!;
  const rankingMinimum = manifest.ranking_minimum_observations;
  const eligible = data.allComparison
    .filter((row) => row.observations >= rankingMinimum)
    .sort((a, b) => (onTimeRate(b) ?? -1) - (onTimeRate(a) ?? -1));
  const leader = eligible[0];
  const summaryText = leader
    ? `${manifest.carriers[leader.carrier_code!] ?? leader.carrier_code} recorded the highest on-time rate among ${eligible.length} eligible airlines for this route, month, and departure window: ${percentText(onTimeRate(leader))} across ${integer(leader.observations)} observed arrivals. Its 90th-percentile arrival delay was ${minutes(leader.p90_arrival_delay)}.`
    : `No airline reaches the ${integer(rankingMinimum)}-arrival minimum for ranking this selection. The rows remain available as descriptive, small-sample context.`;
  const dateRange = `${manifest.coverage.start}–${manifest.coverage.end}`;
  const monthName = MONTHS[month - 1];

  return (
    <div className="space-y-10 sm:space-y-14">
      <section aria-labelledby="route-overview-title">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-[0.68rem] font-semibold tracking-[0.13em] text-teal uppercase">
              {monthName} ·{" "}
              {band === "All" ? "Any departure time" : `${band} departures`}
            </p>
            <h1
              id="route-overview-title"
              className="mt-2 font-display text-3xl font-semibold tracking-[-0.045em] text-midnight sm:text-4xl"
            >
              Historical route readout
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
              All carriers combined across the covered history. Delay
              observations exclude cancelled and diverted flights.
            </p>
          </div>
          <a
            href={`/airport?code=${origin}&month=${month}`}
            className="inline-flex items-center gap-2 text-sm font-bold text-teal hover:underline"
          >
            Explore {origin} airport <Route className="size-4" />
          </a>
        </div>

        <Card className="mt-6 overflow-hidden">
          <div className="grid divide-y divide-line md:grid-cols-[1.25fr_repeat(4,1fr)] md:divide-x md:divide-y-0">
            <div className="bg-midnight p-6 text-white md:p-7">
              <p className="font-mono text-[0.66rem] font-semibold tracking-[0.12em] text-teal-light uppercase">
                Comparable history
              </p>
              <p className="mt-3 font-display text-2xl font-semibold tracking-[-0.035em]">
                {origin} → {destination}
              </p>
              <p className="mt-2 text-sm leading-6 text-white/62">
                {dateRange} · n={integer(summary.observations)} observed
                arrivals
              </p>
            </div>
            <MetricCell
              label="On-time arrival"
              value={percentText(onTimeRate(summary))}
              help="Arrived less than 15 minutes after the published arrival time, divided by observed non-cancelled, non-diverted arrivals."
            />
            <MetricCell
              label="Cancellation"
              value={percentText(cancellationRate(summary))}
              help="Cancelled scheduled flights divided by all scheduled flights."
            />
            <MetricCell
              label="Median arrival delay"
              value={minutes(summary.median_arrival_delay)}
              help="The midpoint arrival delay among observed non-cancelled, non-diverted arrivals. Negative values mean early."
            />
            <MetricCell
              label="90th-percentile delay"
              value={minutes(summary.p90_arrival_delay)}
              help="Nine in ten observed arrivals had a delay at or below this value."
            />
          </div>
          <div className="border-t border-line bg-paper/55 px-6 py-4 text-sm leading-6 text-ink">
            <span className="font-bold">What the history says: </span>
            {summaryText} Historical performance does not predict a specific
            future flight.
          </div>
        </Card>
      </section>

      <section aria-labelledby="airline-comparison-title">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-[0.68rem] font-semibold tracking-[0.13em] text-teal uppercase">
              Like-for-like comparison
            </p>
            <h2
              id="airline-comparison-title"
              className="mt-2 font-display text-3xl font-semibold tracking-[-0.045em]"
            >
              Airlines on this route
            </h2>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs font-bold tracking-[0.08em] text-muted uppercase">
              <span className="mb-1.5 flex items-center gap-1.5">
                <Filter className="size-3.5" /> Sort by
              </span>
              <select
                value={sortKey}
                onChange={(event) => setSortKey(event.target.value as SortKey)}
                className="h-10 rounded-lg border border-ink/15 bg-surface px-3 text-sm font-semibold tracking-normal text-ink normal-case"
              >
                <option value="onTime">On-time rate</option>
                <option value="cancellation">Cancellation rate</option>
                <option value="p90">90th-percentile delay</option>
                <option value="sample">Observation count</option>
              </select>
            </label>
            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-ink/15 bg-surface px-3 text-sm font-semibold">
              <input
                type="checkbox"
                checked={eligibleOnly}
                onChange={(event) => setEligibleOnly(event.target.checked)}
                className="size-4 accent-teal"
              />
              Ranking-eligible only
            </label>
          </div>
        </div>

        <DataNotice className="mt-5">
          Rankings require at least {integer(rankingMinimum)} observed arrivals.
          Small samples remain visible, but are not assigned a rank. Percentiles
          are calculated from flight records, never by averaging subgroup
          percentiles.
        </DataNotice>

        <Card className="mt-5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1020px] border-collapse text-left text-sm">
              <thead className="bg-paper-deep/65 text-[0.68rem] tracking-[0.08em] text-muted uppercase">
                <tr>
                  <th className="px-5 py-4 font-bold">Rank / airline</th>
                  <th className="px-4 py-4 font-bold">Scheduled</th>
                  <th className="px-4 py-4 font-bold">On time</th>
                  <th className="px-4 py-4 font-bold">Cancelled</th>
                  <th className="px-4 py-4 font-bold">Median delay</th>
                  <th className="px-4 py-4 font-bold">P75 delay</th>
                  <th className="px-4 py-4 font-bold">P90 delay</th>
                  <th className="px-4 py-4 font-bold">60+ min late</th>
                  <th className="px-4 py-4 font-bold">Observed n</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.comparison.map((row) => {
                  const eligibleRow = row.observations >= rankingMinimum;
                  const rank = eligible.findIndex(
                    (item) => item.carrier_id === row.carrier_id,
                  );
                  return (
                    <tr
                      key={`${row.carrier_id}-${row.carrier_code}`}
                      className="hover:bg-paper/60"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "grid size-7 shrink-0 place-items-center rounded-full font-mono text-xs font-semibold",
                              eligibleRow
                                ? "bg-midnight text-white"
                                : "bg-paper-deep text-muted",
                            )}
                          >
                            {eligibleRow ? rank + 1 : "—"}
                          </span>
                          <span>
                            <span className="block font-bold text-ink">
                              {manifest.carriers[row.carrier_code!] ??
                                row.carrier_code}
                            </span>
                            <span className="mt-0.5 block text-xs text-muted">
                              {row.carrier_code} · DOT {row.carrier_id}
                              {!eligibleRow ? " · Small sample" : ""}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 tabular-nums">
                        {integer(row.scheduled_flights)}
                      </td>
                      <td className="px-4 py-4 font-bold tabular-nums text-teal">
                        {percentText(onTimeRate(row))}
                      </td>
                      <td className="px-4 py-4 tabular-nums">
                        {percentText(cancellationRate(row))}
                      </td>
                      <td className="px-4 py-4 tabular-nums">
                        {minutes(row.median_arrival_delay)}
                      </td>
                      <td className="px-4 py-4 tabular-nums">
                        {minutes(row.p75_arrival_delay)}
                      </td>
                      <td className="px-4 py-4 tabular-nums">
                        {minutes(row.p90_arrival_delay)}
                      </td>
                      <td className="px-4 py-4 tabular-nums">
                        {percentText(severeRate(row))}
                      </td>
                      <td className="px-4 py-4 tabular-nums text-muted">
                        {integer(row.observations)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {data.comparison.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted">
              No airlines match this filter.
            </p>
          ) : null}
        </Card>
      </section>

      <ComparablePeriod
        current={data.current}
        previous={data.previous}
        monthName={monthName}
      />

      <section aria-labelledby="route-detail-title">
        <p className="font-mono text-[0.68rem] font-semibold tracking-[0.13em] text-teal uppercase">
          Route detail
        </p>
        <h2
          id="route-detail-title"
          className="mt-2 font-display text-3xl font-semibold tracking-[-0.045em]"
        >
          How reliability moves
        </h2>
        <div className="mt-6 grid min-w-0 gap-5 xl:grid-cols-2">
          <ReliabilityTrend rows={data.period} dateRange={dateRange} />
          <DelayDistribution
            row={summary}
            monthName={monthName}
            dateRange={dateRange}
          />
          <TimeBandComparison
            rows={data.monthBands}
            monthName={monthName}
            dateRange={dateRange}
          />
          <DelayCauses
            row={summary}
            monthName={monthName}
            dateRange={dateRange}
          />
          <RouteVolume rows={data.period} dateRange={dateRange} />
          <AirlineCoverage
            rows={data.airlinePeriods}
            carriers={manifest.carriers}
            dateRange={dateRange}
            error={data.airlineCoverageError}
          />
        </div>
      </section>

      <DataNotice>
        <strong>Coverage note:</strong> current-year data stops at the latest
        complete BTS month ({manifest.coverage.latest_complete_month}). A
        cancelled flight’s missing delay is never treated as zero; cancelled and
        diverted flights are excluded from arrival-delay percentiles.
      </DataNotice>
    </div>
  );
}

function MetricCell({
  label,
  value,
  help,
}: {
  label: string;
  value: string;
  help: string;
}) {
  return (
    <div className="p-5 md:p-6">
      <p className="flex items-center gap-1 text-xs font-bold tracking-[0.06em] text-muted uppercase">
        {label} <MetricHelp label={label}>{help}</MetricHelp>
      </p>
      <p className="mt-2 font-display text-2xl font-semibold tracking-[-0.035em] tabular-nums">
        {value}
      </p>
    </div>
  );
}

function ComparablePeriod({
  current,
  previous,
  monthName,
}: {
  current?: MetricRow;
  previous?: MetricRow;
  monthName: string;
}) {
  if (!current) return null;
  const currentOnTime = onTimeRate(current);
  const previousOnTime = previous ? onTimeRate(previous) : null;
  const currentCancellation = cancellationRate(current);
  const previousCancellation = previous ? cancellationRate(previous) : null;
  return (
    <section aria-labelledby="comparable-title">
      <div className="grid overflow-hidden rounded-[var(--radius-md)] border border-line bg-surface shadow-[var(--shadow-sm)] lg:grid-cols-[1fr_0.8fr_0.8fr]">
        <div className="bg-midnight p-6 text-white sm:p-8">
          <p className="font-mono text-[0.66rem] font-semibold tracking-[0.12em] text-teal-light uppercase">
            Comparable period
          </p>
          <h2
            id="comparable-title"
            className="mt-3 font-display text-2xl font-semibold"
          >
            {monthName} {current.year} vs.{" "}
            {previous ? `${monthName} ${previous.year}` : "no prior match"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/62">
            Same route, calendar month, and departure window. All carriers
            combined.
          </p>
        </div>
        <PeriodMetric
          icon={PlaneLanding}
          label="On-time arrival"
          current={currentOnTime}
          previous={previousOnTime}
          goodDirection="up"
        />
        <PeriodMetric
          icon={CalendarClock}
          label="Cancellation"
          current={currentCancellation}
          previous={previousCancellation}
          goodDirection="down"
        />
      </div>
    </section>
  );
}

function PeriodMetric({
  icon: Icon,
  label,
  current,
  previous,
  goodDirection,
}: {
  icon: typeof Gauge;
  label: string;
  current: number | null;
  previous: number | null;
  goodDirection: "up" | "down";
}) {
  const delta = current != null && previous != null ? current - previous : null;
  const favorable =
    delta != null && (goodDirection === "up" ? delta >= 0 : delta <= 0);
  return (
    <div className="border-t border-line p-6 lg:border-t-0 lg:border-l lg:p-8">
      <p className="flex items-center gap-2 text-xs font-bold tracking-[0.06em] text-muted uppercase">
        <Icon className="size-4" /> {label}
      </p>
      <p className="mt-3 font-display text-3xl font-semibold tabular-nums">
        {percentText(current)}
      </p>
      <p
        className={cn(
          "mt-2 inline-flex items-center gap-1 text-sm font-bold tabular-nums",
          delta == null
            ? "text-muted"
            : favorable
              ? "text-[#176e58]"
              : "text-[#a83d36]",
        )}
      >
        {delta == null ? (
          "No comparable prior year"
        ) : (
          <>
            {delta >= 0 ? (
              <ArrowUp className="size-3.5" />
            ) : (
              <ArrowDown className="size-3.5" />
            )}
            {signedPoints(delta)} year over year
          </>
        )}
      </p>
    </div>
  );
}

function chartBase() {
  return {
    grid: { left: 48, right: 18, top: 34, bottom: 48 },
    tooltip: { trigger: "axis" as const, confine: true },
    legend: { top: 0, textStyle: { color: CHART_COLORS.muted, fontSize: 11 } },
    xAxis: {
      type: "category" as const,
      axisLine: { lineStyle: { color: CHART_COLORS.line } },
      axisTick: { show: false },
      axisLabel: { color: CHART_COLORS.muted, fontSize: 10, hideOverlap: true },
    },
    yAxis: {
      type: "value" as const,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: "#e4e5df" } },
      axisLabel: { color: CHART_COLORS.muted, fontSize: 10 },
    },
  };
}

function ReliabilityTrend({
  rows,
  dateRange,
}: {
  rows: MetricRow[];
  dateRange: string;
}) {
  const labels = rows.map((row) => periodLabel(row.year!, row.month!));
  const option: EChartsOption = {
    ...chartBase(),
    xAxis: { ...chartBase().xAxis, data: labels },
    yAxis: {
      ...chartBase().yAxis,
      min: 0,
      max: 100,
      axisLabel: { formatter: "{value}%" },
    },
    series: [
      {
        name: "On time",
        type: "line",
        showSymbol: false,
        smooth: 0.18,
        lineStyle: { width: 2.5, color: CHART_COLORS.teal },
        itemStyle: { color: CHART_COLORS.teal },
        data: rows.map(onTimeRate),
      },
      {
        name: "Cancelled",
        type: "line",
        showSymbol: false,
        lineStyle: { width: 2, color: CHART_COLORS.coral },
        itemStyle: { color: CHART_COLORS.coral },
        data: rows.map(cancellationRate),
      },
    ],
  };
  return (
    <ChartCard
      title="Monthly reliability trend"
      eyebrow="On time & cancellation"
      meta={`${dateRange} · percent of applicable flights`}
      explanation="On-time uses observed arrivals; cancellation uses scheduled flights. The shared percent scale begins at zero."
    >
      <Chart
        option={option}
        label="Monthly on-time and cancellation rate line chart"
      />
    </ChartCard>
  );
}

function DelayDistribution({
  row,
  monthName,
  dateRange,
}: {
  row: MetricRow;
  monthName: string;
  dateRange: string;
}) {
  const labels = ["Early", "0–14", "15–29", "30–59", "60–119", "120+"];
  const values = [
    row.delay_bin_early,
    row.delay_bin_0_14,
    row.delay_bin_15_29,
    row.delay_bin_30_59,
    row.delay_bin_60_119,
    row.delay_bin_120_plus,
  ].map((value) => percent(value, row.observations));
  const option: EChartsOption = {
    grid: { left: 48, right: 18, top: 18, bottom: 45 },
    tooltip: {
      trigger: "axis",
      confine: true,
      valueFormatter: (value) => `${Number(value).toFixed(1)}%`,
    },
    xAxis: {
      type: "category",
      data: labels,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: CHART_COLORS.line } },
      axisLabel: { color: CHART_COLORS.muted, fontSize: 10 },
    },
    yAxis: {
      type: "value",
      min: 0,
      axisLabel: {
        formatter: "{value}%",
        color: CHART_COLORS.muted,
        fontSize: 10,
      },
      splitLine: { lineStyle: { color: "#e4e5df" } },
    },
    series: [
      {
        name: "Observed arrivals",
        type: "bar",
        data: values,
        barMaxWidth: 42,
        itemStyle: {
          color: (params: { dataIndex: number }) =>
            params.dataIndex >= 4 ? CHART_COLORS.coral : CHART_COLORS.teal,
          borderRadius: [5, 5, 0, 0],
        },
      },
    ],
  };
  return (
    <ChartCard
      title="Arrival-delay distribution"
      eyebrow="How late is late?"
      meta={`${monthName} · ${dateRange} · n=${integer(row.observations)}`}
      explanation="Buckets use arrival delay in minutes. Cancelled and diverted flights are excluded."
    >
      <Chart option={option} label="Arrival delay distribution bar chart" />
    </ChartCard>
  );
}

function TimeBandComparison({
  rows,
  monthName,
  dateRange,
}: {
  rows: MetricRow[];
  monthName: string;
  dateRange: string;
}) {
  const ordered = ["Overnight", "Morning", "Afternoon", "Evening"]
    .map((band) => rows.find((row) => row.departure_time_band === band))
    .filter(Boolean) as MetricRow[];
  const option: EChartsOption = {
    grid: { left: 94, right: 22, top: 20, bottom: 38 },
    tooltip: {
      trigger: "axis",
      confine: true,
      valueFormatter: (value) => `${Number(value).toFixed(1)}%`,
    },
    xAxis: {
      type: "value",
      min: 0,
      max: 100,
      axisLabel: {
        formatter: "{value}%",
        color: CHART_COLORS.muted,
        fontSize: 10,
      },
      splitLine: { lineStyle: { color: "#e4e5df" } },
    },
    yAxis: {
      type: "category",
      data: ordered.map((row) => row.departure_time_band),
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { color: CHART_COLORS.ink, fontSize: 11 },
    },
    series: [
      {
        name: "On time",
        type: "bar",
        data: ordered.map(onTimeRate),
        barMaxWidth: 28,
        itemStyle: { color: CHART_COLORS.teal, borderRadius: [0, 5, 5, 0] },
        label: {
          show: true,
          position: "right",
          formatter: "{c}%",
          color: CHART_COLORS.ink,
          fontSize: 10,
        },
      },
    ],
  };
  return (
    <ChartCard
      title="Departure-time comparison"
      eyebrow="Scheduled local time"
      meta={`${monthName} · ${dateRange} · on-time rate`}
      explanation="Time bands use the published departure time at the origin airport. Each bar is calculated directly from its flight records."
    >
      <Chart
        option={option}
        label="On-time arrival rate by departure time band"
      />
    </ChartCard>
  );
}

function DelayCauses({
  row,
  monthName,
  dateRange,
}: {
  row: MetricRow;
  monthName: string;
  dateRange: string;
}) {
  const causes = [
    ["Carrier", row.carrier_delay_minutes, CHART_COLORS.coral],
    ["Late aircraft", row.late_aircraft_delay_minutes, CHART_COLORS.gold],
    ["Airspace / NAS", row.nas_delay_minutes, CHART_COLORS.teal],
    ["Weather", row.weather_delay_minutes, CHART_COLORS.sky],
    ["Security", row.security_delay_minutes, CHART_COLORS.midnight],
  ] as const;
  const total = causes.reduce((sum, [, value]) => sum + value, 0);
  const option: EChartsOption = {
    grid: { left: 28, right: 28, top: 48, bottom: 36 },
    tooltip: { trigger: "item", confine: true },
    legend: { top: 0, textStyle: { fontSize: 10, color: CHART_COLORS.muted } },
    xAxis: {
      type: "value",
      min: 0,
      max: 100,
      axisLabel: {
        formatter: "{value}%",
        color: CHART_COLORS.muted,
        fontSize: 10,
      },
      splitLine: { show: false },
    },
    yAxis: {
      type: "category",
      data: ["Reported delay minutes"],
      axisLabel: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: causes.map(([name, value, color], index) => ({
      name,
      type: "bar",
      stack: "causes",
      data: [total ? (value / total) * 100 : 0],
      barWidth: 52,
      itemStyle: {
        color,
        borderRadius:
          index === 0
            ? [7, 0, 0, 7]
            : index === causes.length - 1
              ? [0, 7, 7, 0]
              : 0,
      },
    })),
  };
  return (
    <ChartCard
      title="Reported delay causes"
      eyebrow="Share of attributable minutes"
      meta={`${monthName} · ${dateRange} · ${compactInteger(total)} reported min`}
      explanation="BTS cause minutes are reported for qualifying delayed flights and do not describe every late arrival. Shares use positive reported minutes only."
    >
      <Chart
        option={option}
        label="Stacked bar of reported delay cause minutes"
      />
    </ChartCard>
  );
}

function RouteVolume({
  rows,
  dateRange,
}: {
  rows: MetricRow[];
  dateRange: string;
}) {
  const option: EChartsOption = {
    grid: { left: 56, right: 18, top: 20, bottom: 48 },
    tooltip: { trigger: "axis", confine: true },
    xAxis: {
      type: "category",
      data: rows.map((row) => periodLabel(row.year!, row.month!)),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: CHART_COLORS.line } },
      axisLabel: { color: CHART_COLORS.muted, fontSize: 10, hideOverlap: true },
    },
    yAxis: {
      type: "value",
      min: 0,
      name: "Flights",
      nameTextStyle: { color: CHART_COLORS.muted, fontSize: 10 },
      axisLabel: { color: CHART_COLORS.muted, fontSize: 10 },
      splitLine: { lineStyle: { color: "#e4e5df" } },
    },
    series: [
      {
        name: "Scheduled flights",
        type: "bar",
        data: rows.map((row) => row.scheduled_flights),
        barMaxWidth: 13,
        itemStyle: { color: CHART_COLORS.sky, borderRadius: [3, 3, 0, 0] },
      },
    ],
  };
  return (
    <ChartCard
      title="Route volume"
      eyebrow="Scheduled service"
      meta={`${dateRange} · flights per month`}
      explanation="Volume changes can affect which airline comparisons are available in a given period."
    >
      <Chart
        option={option}
        label="Monthly scheduled flight volume bar chart"
      />
    </ChartCard>
  );
}

function AirlineCoverage({
  rows,
  carriers,
  dateRange,
  error,
}: {
  rows: MetricRow[] | undefined;
  carriers: Record<string, string>;
  dateRange: string;
  error: boolean;
}) {
  const coverage = new Map<
    string,
    { code: string; first: string; last: string; scheduled: number }
  >();
  for (const row of rows ?? []) {
    const code = row.carrier_code!;
    const period = `${row.year}-${String(row.month).padStart(2, "0")}`;
    const current = coverage.get(code);
    coverage.set(code, {
      code,
      first: current && current.first < period ? current.first : period,
      last: current && current.last > period ? current.last : period,
      scheduled: (current?.scheduled ?? 0) + row.scheduled_flights,
    });
  }
  const items = [...coverage.values()].sort(
    (a, b) => b.scheduled - a.scheduled,
  );
  return (
    <ChartCard
      title="Historical airline coverage"
      eyebrow="Who operated the route"
      meta={`${dateRange} · all calendar months`}
      explanation="Coverage shows reported scheduled service during the dataset window; it does not imply current availability."
    >
      {rows ? (
        <div className="max-h-80 overflow-auto px-2 py-1">
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <li
                key={item.code}
                className="grid grid-cols-[1fr_auto] gap-4 py-4"
              >
                <div>
                  <p className="font-bold">
                    {carriers[item.code] ?? item.code}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {item.code} · {item.first} to {item.last}
                  </p>
                </div>
                <p className="self-center font-mono text-xs text-muted">
                  {integer(item.scheduled)} flights
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div
          className="flex min-h-60 items-center justify-center px-8 text-center text-sm leading-6 text-muted"
          role="status"
        >
          {error
            ? "Historical airline coverage could not be loaded. The primary route comparison remains available."
            : "Loading historical airline coverage…"}
        </div>
      )}
    </ChartCard>
  );
}
