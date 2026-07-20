"use client";

import type { EChartsOption } from "echarts";
import { ArrowRight, Building2, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useTransition } from "react";

import { Chart, CHART_COLORS } from "@/components/charts/chart";
import { ChartCard } from "@/components/charts/chart-card";
import { Card } from "@/components/ui/card";
import { DataNotice } from "@/components/ui/data-notice";
import { MetricHelp } from "@/components/ui/metric-help";
import { SelectField, type SelectOption } from "@/components/ui/select-field";
import {
  EmptyPanel,
  ErrorPanel,
  LoadingPanel,
} from "@/components/ui/state-panel";
import { useManifest, useOriginTables } from "@/lib/data";
import {
  integer,
  minutes,
  MONTHS,
  percent,
  percentText,
  periodLabel,
} from "@/lib/format";
import type { MetricRow } from "@/lib/types";

const AIRPORT_TABLES = [
  "airport_period",
  "airport_month_band",
  "airport_routes",
];

const MONTH_OPTIONS: SelectOption[] = MONTHS.map((label, index) => ({
  value: String(index + 1),
  label,
}));

function onTimeRate(row: MetricRow) {
  return percent(row.on_time_arrivals, row.observations);
}

function cancellationRate(row: MetricRow) {
  return percent(row.cancelled_flights, row.scheduled_flights);
}

function severeRate(row: MetricRow) {
  return percent(row.arrivals_60_plus, row.observations);
}

export function AirportExplorer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const manifestState = useManifest();
  const manifest =
    manifestState.status === "ready" ? manifestState.data : undefined;
  const requestedCode = searchParams.get("code")?.toUpperCase();
  const requestedMonth = Number(searchParams.get("month"));
  const defaultCode = manifest?.routes.ATL
    ? "ATL"
    : Object.keys(manifest?.routes ?? {})[0];
  const validCode =
    !!requestedCode &&
    !!manifest?.tables.airport_period.partitions[requestedCode];
  const code = validCode ? requestedCode : defaultCode;
  const month =
    requestedMonth >= 1 && requestedMonth <= 12
      ? requestedMonth
      : Number(manifest?.coverage.latest_complete_month.slice(5) ?? 1);
  const tablesState = useOriginTables(manifest, code, AIRPORT_TABLES);
  const airport = manifest?.airports.find((item) => item.code === code);
  const airportByCode = useMemo(
    () =>
      new Map(
        manifest?.airports.map((airportItem) => [
          airportItem.code,
          airportItem,
        ]) ?? [],
      ),
    [manifest],
  );
  const airportOptions = useMemo<SelectOption[]>(
    () =>
      Object.keys(manifest?.tables.airport_period.partitions ?? {})
        .sort()
        .map((airportCode) => ({
          value: airportCode,
          code: airportCode,
          label: airportByCode.get(airportCode)?.city_name ?? "US airport",
          keywords: airportByCode.get(airportCode)?.state,
          meta: `${manifest?.routes[airportCode]?.length ?? 0} routes`,
        })),
    [airportByCode, manifest],
  );
  const invalidQuery =
    (!!requestedCode && !validCode) ||
    (!!searchParams.get("month") &&
      !(requestedMonth >= 1 && requestedMonth <= 12));

  const data = useMemo(() => {
    if (tablesState.status !== "ready") return undefined;
    const monthRows = tablesState.data.airport_month_band.filter(
      (row) => row.calendar_month === month,
    );
    const summary = monthRows.find((row) => row.departure_time_band === "All");
    const periods = tablesState.data.airport_period
      .filter((row) => row.departure_time_band === "All")
      .sort((a, b) => a.year! * 12 + a.month! - (b.year! * 12 + b.month!));
    const routes = tablesState.data.airport_routes
      .filter(
        (row) =>
          row.calendar_month === month && row.departure_time_band === "All",
      )
      .sort((a, b) => b.scheduled_flights - a.scheduled_flights);
    return { monthRows, summary, periods, routes };
  }, [month, tablesState]);

  function navigate(nextCode: string, nextMonth: number) {
    startTransition(() =>
      router.push(`/airport?code=${nextCode}&month=${nextMonth}`),
    );
  }

  if (manifestState.status === "error") {
    return (
      <div className="page-shell py-14">
        <ErrorPanel error={manifestState.error} />
      </div>
    );
  }

  return (
    <>
      <section className="data-grid border-b border-white/10 bg-midnight py-12 text-white sm:py-16">
        <div className="page-shell grid gap-10 lg:grid-cols-[1fr_0.85fr] lg:items-end">
          <div>
            <p className="font-mono text-[0.68rem] font-semibold tracking-[0.14em] text-teal-light uppercase">
              Airport explorer · departing flights
            </p>
            <h1 className="mt-4 font-display text-5xl leading-none font-semibold tracking-[-0.065em] sm:text-7xl">
              {code ?? "—"}
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-white/72">
              {airport?.city_name ?? "Choose a US airport"}
            </p>
          </div>
          <Card className="border-white/12 bg-white/[0.06] p-5 shadow-none">
            <div className="grid gap-3 sm:grid-cols-[1.25fr_0.75fr] sm:items-end">
              <SelectField
                label="Airport"
                value={code ?? ""}
                options={airportOptions}
                onValueChange={(value) => navigate(value, month)}
                disabled={!manifest || isPending}
                dark
                searchable
                searchPlaceholder="Airport code or city"
                emptyText="No airports match that search"
                placeholder={manifest ? "Choose airport" : "Loading airports…"}
                menuWidth="wide"
              />
              <SelectField
                label="Calendar month"
                value={String(month)}
                options={MONTH_OPTIONS}
                onValueChange={(value) => navigate(code!, Number(value))}
                disabled={!manifest || !code || isPending}
                dark
                columns={2}
                menuAlign="end"
                menuWidth="wide"
              />
            </div>
            <p
              className="mt-3 flex min-h-4 items-center gap-1.5 text-[0.7rem] text-white/55"
              aria-live="polite"
            >
              {isPending ? (
                <>
                  <LoaderCircle className="size-3.5 animate-spin" /> Updating
                  the airport readout…
                </>
              ) : (
                "Choose an airport or month to update the readout."
              )}
            </p>
          </Card>
        </div>
      </section>

      <div className="page-shell py-10 sm:py-14">
        {invalidQuery ? (
          <DataNotice tone="warning" className="mb-6">
            The airport URL contained an invalid filter, so a valid airport and
            month are shown.
          </DataNotice>
        ) : null}

        {!manifest || tablesState.status === "loading" ? (
          <LoadingPanel label="Loading airport aggregates…" />
        ) : tablesState.status === "error" ? (
          <ErrorPanel error={tablesState.error} />
        ) : !data?.summary ? (
          <EmptyPanel title="No airport history for this month" />
        ) : (
          <AirportResults
            code={code!}
            month={month}
            manifest={manifest}
            data={{ ...data, summary: data.summary }}
          />
        )}
      </div>
    </>
  );
}

function AirportResults({
  code,
  month,
  manifest,
  data,
}: {
  code: string;
  month: number;
  manifest: NonNullable<ReturnType<typeof useManifest>["data"]>;
  data: {
    monthRows: MetricRow[];
    summary: MetricRow;
    periods: MetricRow[];
    routes: MetricRow[];
  };
}) {
  const { summary, periods, routes, monthRows } = data;
  const monthName = MONTHS[month - 1];
  const dateRange = `${manifest.coverage.start}–${manifest.coverage.end}`;
  const airportName = manifest.airports.find(
    (item) => item.code === code,
  )?.city_name;
  return (
    <div className="space-y-12">
      <section aria-labelledby="airport-summary-title">
        <p className="font-mono text-[0.68rem] font-semibold tracking-[0.13em] text-teal uppercase">
          {monthName} across the covered history
        </p>
        <h2
          id="airport-summary-title"
          className="mt-2 font-display text-3xl font-semibold tracking-[-0.045em] sm:text-4xl"
        >
          Departing-flight reliability
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
          These metrics follow scheduled flights departing {code} and evaluate
          whether they reached their destination on time. They are not airport
          operational service-level metrics.
        </p>

        <Card className="mt-6 grid overflow-hidden md:grid-cols-[1.2fr_repeat(4,1fr)] md:divide-x md:divide-line">
          <div className="bg-midnight p-6 text-white">
            <Building2 className="size-5 text-teal-light" />
            <p className="mt-3 font-display text-xl font-semibold">
              {airportName ?? code}
            </p>
            <p className="mt-2 text-xs leading-5 text-white/58">
              {dateRange} · n={integer(summary.observations)} observed arrivals
            </p>
          </div>
          <AirportMetric
            label="Scheduled"
            value={integer(summary.scheduled_flights)}
            help="All scheduled departures in the selected historical month."
          />
          <AirportMetric
            label="On time"
            value={percentText(onTimeRate(summary))}
            help="Observed arrivals less than 15 minutes after published arrival time."
          />
          <AirportMetric
            label="Cancelled"
            value={percentText(cancellationRate(summary))}
            help="Cancelled flights divided by scheduled flights."
          />
          <AirportMetric
            label="60+ min late"
            value={percentText(severeRate(summary))}
            help="Observed arrivals at least 60 minutes late."
          />
        </Card>
      </section>

      <section
        className="grid min-w-0 gap-5 xl:grid-cols-2"
        aria-label="Airport charts"
      >
        <AirportTrend rows={periods} dateRange={dateRange} />
        <AirportTimeBands
          rows={monthRows}
          monthName={monthName}
          dateRange={dateRange}
        />
      </section>

      <section aria-labelledby="active-routes-title">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[0.68rem] font-semibold tracking-[0.13em] text-teal uppercase">
              Route-level drill-down
            </p>
            <h2
              id="active-routes-title"
              className="mt-2 font-display text-3xl font-semibold tracking-[-0.045em]"
            >
              Most active {monthName} routes
            </h2>
          </div>
          <p className="font-mono text-xs text-muted">
            {dateRange} · top 15 by scheduled flights
          </p>
        </div>
        <Card className="mt-6 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-paper-deep/65 text-[0.68rem] tracking-[0.08em] text-muted uppercase">
                <tr>
                  <th className="px-5 py-4">Route</th>
                  <th className="px-4 py-4">Scheduled</th>
                  <th className="px-4 py-4">On time</th>
                  <th className="px-4 py-4">Cancelled</th>
                  <th className="px-4 py-4">60+ min late</th>
                  <th className="px-4 py-4">P90 delay</th>
                  <th className="px-4 py-4">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {routes.slice(0, 15).map((row) => (
                  <tr key={row.destination} className="hover:bg-paper/60">
                    <td className="px-5 py-4 font-display text-lg font-semibold">
                      {code} <span className="mx-1 text-muted">→</span>{" "}
                      {row.destination}
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
                      {percentText(severeRate(row))}
                    </td>
                    <td className="px-4 py-4 tabular-nums">
                      {minutes(row.p90_arrival_delay)}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/route?origin=${code}&destination=${row.destination}&month=${month}&band=All`}
                        className="grid size-8 place-items-center rounded-full bg-midnight text-white"
                        aria-label={`Explore ${code} to ${row.destination}`}
                      >
                        <ArrowRight className="size-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <DataNotice>
        Airport results are departure cohorts: a flight belongs to {code} when
        it was scheduled to depart there. Arrival delay is taken directly from
        BTS, which handles local clock changes and overnight crossings; the
        application does not infer delay by subtracting clock times.
      </DataNotice>
    </div>
  );
}

function AirportMetric({
  label,
  value,
  help,
}: {
  label: string;
  value: string;
  help: string;
}) {
  return (
    <div className="border-t border-line p-5 md:border-t-0">
      <p className="flex items-center gap-1 text-xs font-bold tracking-[0.06em] text-muted uppercase">
        {label} <MetricHelp label={label}>{help}</MetricHelp>
      </p>
      <p className="mt-2 font-display text-2xl font-semibold tabular-nums">
        {value}
      </p>
    </div>
  );
}

function AirportTrend({
  rows,
  dateRange,
}: {
  rows: MetricRow[];
  dateRange: string;
}) {
  const option: EChartsOption = {
    grid: { left: 50, right: 18, top: 36, bottom: 48 },
    tooltip: { trigger: "axis", confine: true },
    legend: { top: 0, textStyle: { color: CHART_COLORS.muted, fontSize: 10 } },
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
      max: 100,
      axisLabel: {
        formatter: "{value}%",
        color: CHART_COLORS.muted,
        fontSize: 10,
      },
      splitLine: { lineStyle: { color: "#e4e5df" } },
    },
    series: [
      {
        name: "On time",
        type: "line",
        showSymbol: false,
        smooth: 0.15,
        data: rows.map(onTimeRate),
        lineStyle: { width: 2.5, color: CHART_COLORS.teal },
        itemStyle: { color: CHART_COLORS.teal },
      },
      {
        name: "60+ min late",
        type: "line",
        showSymbol: false,
        data: rows.map(severeRate),
        lineStyle: { width: 2, color: CHART_COLORS.coral },
        itemStyle: { color: CHART_COLORS.coral },
      },
      {
        name: "Cancelled",
        type: "line",
        showSymbol: false,
        data: rows.map(cancellationRate),
        lineStyle: { width: 1.5, type: "dashed", color: CHART_COLORS.midnight },
        itemStyle: { color: CHART_COLORS.midnight },
      },
    ],
  };
  return (
    <ChartCard
      title="Airport reliability trend"
      eyebrow="Departing flight outcomes"
      meta={`${dateRange} · monthly percent`}
      explanation="All series use a zero-based percent axis; on-time and severe delay use observed arrivals, while cancellation uses scheduled flights."
    >
      <Chart
        option={option}
        label="Airport on-time, severe delay, and cancellation trend"
      />
    </ChartCard>
  );
}

function AirportTimeBands({
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
    grid: { left: 92, right: 26, top: 20, bottom: 42 },
    tooltip: { trigger: "axis", confine: true },
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
        barWidth: 24,
        itemStyle: { color: CHART_COLORS.teal, borderRadius: [0, 5, 5, 0] },
      },
      {
        name: "60+ min late",
        type: "bar",
        data: ordered.map(severeRate),
        barWidth: 24,
        itemStyle: { color: CHART_COLORS.coral, borderRadius: [0, 5, 5, 0] },
      },
    ],
  };
  return (
    <ChartCard
      title="Time-of-day performance"
      eyebrow="Scheduled local departure"
      meta={`${monthName} · ${dateRange} · percent of observations`}
      explanation="Overnight 00:00–05:59; morning 06:00–11:59; afternoon 12:00–17:59; evening 18:00–23:59."
    >
      <Chart
        option={option}
        label="Airport on-time and severe-delay rates by departure time"
      />
    </ChartCard>
  );
}
