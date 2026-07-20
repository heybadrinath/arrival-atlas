"use client";

import { CalendarCheck2, Database, FileCheck2, RefreshCcw } from "lucide-react";

import { Card } from "@/components/ui/card";
import { bytes, integer, MONTHS } from "@/lib/format";
import { useManifest } from "@/lib/data";

export function DataQualitySnapshot() {
  const state = useManifest();
  if (state.status !== "ready") {
    return <div className="h-52 animate-pulse rounded-2xl bg-line/45" />;
  }
  const { data } = state;
  const latestMonth = Number(data.coverage.latest_complete_month.slice(5));
  const generated = new Date(data.generated_at);
  return (
    <section aria-labelledby="snapshot-title">
      <p className="font-mono text-xs font-semibold tracking-[0.14em] text-teal uppercase">
        Published snapshot
      </p>
      <h2
        id="snapshot-title"
        className="mt-3 font-display text-3xl font-semibold tracking-[-0.045em]"
      >
        Current data status
      </h2>
      <div className="mt-6 grid overflow-hidden rounded-[var(--radius-md)] border border-line bg-surface shadow-[var(--shadow-sm)] sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-line">
        <SnapshotItem
          icon={CalendarCheck2}
          label="Latest complete month"
          value={`${MONTHS[latestMonth - 1]} ${data.coverage.latest_complete_month.slice(0, 4)}`}
        />
        <SnapshotItem
          icon={Database}
          label="Cleaned flight rows"
          value={integer(data.source.cleaned_rows)}
        />
        <SnapshotItem
          icon={FileCheck2}
          label="Aggregate payload"
          value={`${data.file_count} files · ${bytes(data.aggregate_bytes)}`}
        />
        <SnapshotItem
          icon={RefreshCcw}
          label="Generated"
          value={
            Number.isNaN(generated.valueOf())
              ? data.generated_at
              : generated.toLocaleDateString("en-US", { dateStyle: "medium" })
          }
        />
      </div>
    </section>
  );
}

function SnapshotItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Database;
  label: string;
  value: string;
}) {
  return (
    <Card className="rounded-none border-0 border-b border-line p-5 shadow-none last:border-b-0 sm:p-6 lg:border-b-0">
      <Icon className="size-5 text-teal" />
      <p className="mt-4 text-xs font-bold tracking-[0.06em] text-muted uppercase">
        {label}
      </p>
      <p className="mt-2 font-display text-xl font-semibold tabular-nums">
        {value}
      </p>
    </Card>
  );
}
