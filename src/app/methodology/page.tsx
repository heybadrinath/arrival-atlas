import type { Metadata } from "next";
import {
  ArrowUpRight,
  CheckCircle2,
  Database,
  FileArchive,
  Layers3,
  TriangleAlert,
} from "lucide-react";

import { DataQualitySnapshot } from "@/components/data-quality-snapshot";
import { Card } from "@/components/ui/card";
import { DataNotice } from "@/components/ui/data-notice";

export const metadata: Metadata = {
  title: "Methodology & data quality",
  description:
    "Metric formulas, BTS source lineage, inclusion rules, refresh status, data-quality checks, and limitations for Arrival Atlas.",
  alternates: { canonical: "/methodology" },
};

const metrics = [
  [
    "Scheduled flights",
    "Count of reporting-carrier flight records scheduled for the selected cohort.",
    "All selected records",
  ],
  [
    "Operated flights",
    "Scheduled flights that were not cancelled. Diverted flights are operated flights.",
    "Scheduled flights",
  ],
  [
    "On-time arrival rate",
    "Observed arrivals with ArrDelay < 15 minutes ÷ observed arrivals.",
    "Non-cancelled, non-diverted flights with ArrDelay",
  ],
  [
    "Cancellation rate",
    "Cancelled flights ÷ scheduled flights.",
    "Scheduled flights",
  ],
  [
    "Diversion rate",
    "Diverted flights ÷ scheduled flights.",
    "Scheduled flights",
  ],
  [
    "Median / P75 / P90 delay",
    "Exact continuous quantiles of BTS ArrDelay within the displayed cohort.",
    "Non-cancelled, non-diverted flights with ArrDelay",
  ],
  [
    "30+ / 60+ minutes late",
    "Observed arrivals at or above the threshold ÷ observed arrivals.",
    "Non-cancelled, non-diverted flights with ArrDelay",
  ],
  [
    "Delay-cause distribution",
    "Positive reported minutes for carrier, weather, NAS, security, and late-aircraft causes ÷ total positive reported cause minutes.",
    "Flights where BTS reports attributable cause minutes",
  ],
];

export default function MethodologyPage() {
  return (
    <>
      <section className="data-grid bg-midnight py-16 text-white sm:py-20">
        <div className="page-shell grid gap-10 lg:grid-cols-[1fr_0.65fr] lg:items-end">
          <div>
            <p className="font-mono text-xs font-semibold tracking-[0.16em] text-teal-light uppercase">
              Methodology & data quality
            </p>
            <h1 className="balance mt-5 max-w-4xl font-display text-5xl leading-[0.96] font-semibold tracking-[-0.065em] sm:text-7xl">
              Every number should survive a second look.
            </h1>
          </div>
          <p className="max-w-xl text-base leading-7 text-white/68">
            Arrival Atlas is historical descriptive analytics. It summarizes
            official flight records; it does not forecast, predict, or guarantee
            the outcome of a future trip.
          </p>
        </div>
      </section>

      <div className="page-shell space-y-16 py-14 sm:space-y-20 sm:py-20">
        <section
          aria-labelledby="source-title"
          className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]"
        >
          <div>
            <p className="font-mono text-xs font-semibold tracking-[0.14em] text-teal uppercase">
              Source of record
            </p>
            <h2
              id="source-title"
              className="mt-3 font-display text-3xl font-semibold tracking-[-0.045em]"
            >
              Official BTS on-time performance data
            </h2>
          </div>
          <div>
            <p className="text-base leading-8 text-muted">
              The source is the US Bureau of Transportation Statistics Reporting
              Carrier On-Time Performance table. Arrival Atlas downloads
              official pre-zipped monthly files and preserves each URL, ETag,
              source modification date, download timestamp, byte count, and
              SHA-256 checksum in a local lineage manifest.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="https://www.transtats.bts.gov/TableInfo.asp?QO_fu146_anzr=b0-gvzr&gnoyr_VQ=FGJ"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-midnight px-4 py-3 text-sm font-bold text-white"
              >
                BTS table information <ArrowUpRight className="size-4" />
              </a>
              <a
                href="https://www.transtats.bts.gov/DL_SelectFields.aspx?QO_fu146_anzr=b0-gvzr&gnoyr_VQ=FGJ"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-ink/15 bg-surface px-4 py-3 text-sm font-bold"
              >
                BTS download page <ArrowUpRight className="size-4" />
              </a>
            </div>
          </div>
        </section>

        <DataQualitySnapshot />

        <section aria-labelledby="metrics-title">
          <p className="font-mono text-xs font-semibold tracking-[0.14em] text-teal uppercase">
            Metric dictionary
          </p>
          <h2
            id="metrics-title"
            className="mt-3 font-display text-3xl font-semibold tracking-[-0.045em]"
          >
            Formulas and denominators
          </h2>
          <DataNotice className="mt-5 max-w-4xl">
            BTS defines an on-time arrival as less than 15 minutes after the
            published arrival time. A flight arriving exactly 15 minutes late is
            not on time.
          </DataNotice>
          <Card className="mt-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-paper-deep/65 text-[0.68rem] tracking-[0.08em] text-muted uppercase">
                  <tr>
                    <th className="px-5 py-4">Metric</th>
                    <th className="px-5 py-4">Formula</th>
                    <th className="px-5 py-4">Denominator / population</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {metrics.map(([name, formula, population]) => (
                    <tr key={name} className="align-top">
                      <th className="px-5 py-4 font-bold text-ink">{name}</th>
                      <td className="px-5 py-4 leading-6 text-muted">
                        {formula}
                      </td>
                      <td className="px-5 py-4 leading-6 text-muted">
                        {population}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        <section aria-labelledby="pipeline-title">
          <p className="font-mono text-xs font-semibold tracking-[0.14em] text-teal uppercase">
            Reproducible pipeline
          </p>
          <h2
            id="pipeline-title"
            className="mt-3 font-display text-3xl font-semibold tracking-[-0.045em]"
          >
            Raw → cleaned → application-ready
          </h2>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            <PipelineCard
              icon={FileArchive}
              title="Raw monthly ZIPs"
              body="Immutable BTS downloads stay outside Git. A manifest records origin, checksum, size, ETag, and extraction date."
            />
            <PipelineCard
              icon={Database}
              title="Cleaned Parquet"
              body="Columns are typed, exact flight keys are deduplicated, identifiers are retained, and invalid durations are flagged."
            />
            <PipelineCard
              icon={Layers3}
              title="Origin partitions"
              body="DuckDB calculates exact cohort metrics, then emits compact Zstandard Parquet files used by the web application."
            />
          </div>
        </section>

        <section
          aria-labelledby="rules-title"
          className="grid gap-8 lg:grid-cols-2"
        >
          <Card className="p-6 sm:p-8">
            <CheckCircle2 className="size-6 text-teal" />
            <h2
              id="rules-title"
              className="mt-4 font-display text-2xl font-semibold tracking-[-0.035em]"
            >
              Inclusion and comparison rules
            </h2>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-muted">
              <li>
                • US domestic scheduled flights reported in the BTS source
                table.
              </li>
              <li>• Calendar month uses the scheduled flight month.</li>
              <li>• Departure band uses scheduled local origin time.</li>
              <li>
                • Carrier identity retains stable DOT ID plus the historical
                reporting code.
              </li>
              <li>• Rankings apply only inside one route/month/time cohort.</li>
              <li>
                • A minimum of 100 observed arrivals is required to receive a
                rank.
              </li>
              <li>
                • Current-period comparisons use the same calendar month one
                year earlier.
              </li>
            </ul>
          </Card>
          <Card className="p-6 sm:p-8">
            <TriangleAlert className="size-6 text-[#956725]" />
            <h2 className="mt-4 font-display text-2xl font-semibold tracking-[-0.035em]">
              Exclusions and known limitations
            </h2>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-muted">
              <li>• Cancelled flights never receive a zero-minute delay.</li>
              <li>
                • Cancelled and diverted flights are excluded from delay
                distributions.
              </li>
              <li>
                • Missing cause minutes stay missing; they are not assigned to
                “other.”
              </li>
              <li>
                • Codes and ownership can change; names are display labels, not
                stable keys.
              </li>
              <li>
                • Reporting-carrier data may differ from the marketing airline a
                traveler sees.
              </li>
              <li>
                • The dataset excludes unreported, international, and
                non-scheduled operations.
              </li>
              <li>
                • Weather and operational conditions for a future trip may be
                materially different.
              </li>
            </ul>
          </Card>
        </section>

        <section aria-labelledby="quality-title">
          <p className="font-mono text-xs font-semibold tracking-[0.14em] text-teal uppercase">
            Publication gate
          </p>
          <h2
            id="quality-title"
            className="mt-3 font-display text-3xl font-semibold tracking-[-0.045em]"
          >
            Checks that block a refresh
          </h2>
          <div className="mt-7 grid gap-x-10 gap-y-4 sm:grid-cols-2">
            {[
              "Missing required BTS source columns",
              "Download byte-count or checksum mismatch",
              "Rows without stable airport or carrier identifiers",
              "Source, deduplicated, and published row counts that do not reconcile",
              "Cancelled or diverted rows included as arrival observations",
              "Invalid calendar months or departure time bands",
              "Missing origin partitions or aggregate files",
              "Aggregate file counts or byte counts that differ from the manifest",
            ].map((check) => (
              <div
                key={check}
                className="flex gap-3 border-t border-line py-4 text-sm leading-6"
              >
                <CheckCircle2 className="mt-1 size-4 shrink-0 text-teal" />
                {check}
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function PipelineCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Database;
  title: string;
  body: string;
}) {
  return (
    <Card className="p-6">
      <span className="grid size-10 place-items-center rounded-xl bg-teal/10 text-teal">
        <Icon className="size-5" />
      </span>
      <h3 className="mt-5 font-display text-xl font-semibold tracking-[-0.035em]">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-6 text-muted">{body}</p>
    </Card>
  );
}
