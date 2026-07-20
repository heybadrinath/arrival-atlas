"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { RouteRibbon } from "@/components/route-ribbon";
import { Card } from "@/components/ui/card";
import { compactInteger, MONTHS } from "@/lib/format";
import { useManifest } from "@/lib/data";

export function LandingDataStrip() {
  const state = useManifest();
  const manifest = state.status === "ready" ? state.data : undefined;
  const latest = manifest?.coverage.latest_complete_month;
  const latestText = latest
    ? `${MONTHS[Number(latest.slice(5)) - 1]} ${latest.slice(0, 4)}`
    : "Loading…";
  return (
    <div className="border-b border-line bg-surface">
      <div className="page-shell grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <DataFact label="Latest complete month" value={latestText} />
        <DataFact
          label="Processed scheduled flights"
          value={
            manifest ? compactInteger(manifest.source.cleaned_rows) : "Loading…"
          }
        />
        <DataFact
          label="Source partitions"
          value={
            manifest
              ? `${manifest.source.partition_count} official months`
              : "Loading…"
          }
        />
      </div>
    </div>
  );
}

function DataFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-5 sm:px-6 first:pl-0 last:pr-0">
      <p className="font-mono text-[0.68rem] font-semibold tracking-[0.1em] text-muted uppercase">
        {label}
      </p>
      <p className="mt-1.5 font-display text-lg font-semibold tabular-nums">
        {value}
      </p>
    </div>
  );
}

export function PopularRoutes() {
  const state = useManifest();
  if (state.status !== "ready") {
    return <div className="mt-8 h-56 animate-pulse rounded-2xl bg-line/45" />;
  }
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {state.data.top_routes.slice(0, 6).map((route) => (
        <Card
          key={`${route.origin}-${route.destination}`}
          className="group p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
        >
          <RouteRibbon
            origin={route.origin}
            destination={route.destination}
            compact
          />
          <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
            <span className="text-xs text-muted">
              {compactInteger(route.scheduled_flights)} scheduled flights
            </span>
            <Link
              href={`/route?origin=${route.origin}&destination=${route.destination}&month=${Number(state.data.coverage.latest_complete_month.slice(5))}&band=All`}
              className="grid size-8 place-items-center rounded-full bg-midnight text-white transition-transform group-hover:translate-x-0.5"
              aria-label={`Explore ${route.origin} to ${route.destination}`}
            >
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </Card>
      ))}
    </div>
  );
}
