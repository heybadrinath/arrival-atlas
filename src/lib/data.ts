"use client";

import { useEffect, useState } from "react";

import type { DataManifest, DataState, MetricRow } from "@/lib/types";

const manifestUrl = `${process.env.NEXT_PUBLIC_DATA_BASE_URL ?? "/data"}/catalog.json`;
const tableCache = new Map<string, Promise<MetricRow[]>>();
let manifestCache: Promise<DataManifest> | undefined;

function normalizeValue(value: unknown): unknown {
  if (typeof value === "bigint") return Number(value);
  if (value instanceof Date) return value.toISOString();
  return value;
}

function normalizeRow(row: Record<string, unknown>): MetricRow {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, normalizeValue(value)]),
  ) as MetricRow;
}

export async function loadManifest(): Promise<DataManifest> {
  if (!manifestCache) {
    manifestCache = fetch(manifestUrl, { cache: "no-cache" }).then(
      async (response) => {
        if (!response.ok)
          throw new Error(`Data manifest returned ${response.status}`);
        return (await response.json()) as DataManifest;
      },
    );
  }
  return manifestCache;
}

export async function loadOriginTable(
  manifest: DataManifest,
  table: string,
  origin: string,
): Promise<MetricRow[]> {
  const relativePath = manifest.tables[table]?.partitions[origin];
  if (!relativePath) return [];
  const baseUrl = process.env.NEXT_PUBLIC_DATA_BASE_URL ?? "/data";
  const url = `${baseUrl}/${relativePath}`;
  if (!tableCache.has(url)) {
    tableCache.set(
      url,
      Promise.all([import("hyparquet"), import("hyparquet-compressors")]).then(
        async ([
          { asyncBufferFromUrl, parquetReadObjects },
          { compressors },
        ]) => {
          const file = await asyncBufferFromUrl({ url });
          const rows = await parquetReadObjects({ file, compressors });
          return rows.map(normalizeRow);
        },
      ),
    );
  }
  return tableCache.get(url)!;
}

export function useManifest(): DataState<DataManifest> {
  const [state, setState] = useState<DataState<DataManifest>>({
    status: "loading",
  });
  useEffect(() => {
    let active = true;
    loadManifest().then(
      (data) => active && setState({ status: "ready", data }),
      (error: Error) => active && setState({ status: "error", error }),
    );
    return () => {
      active = false;
    };
  }, []);
  return state;
}

export function useOriginTables(
  manifest: DataManifest | undefined,
  origin: string | undefined,
  tables: string[],
): DataState<Record<string, MetricRow[]>> {
  const tableKey = tables.join("|");
  const requestKey =
    manifest && origin ? `${manifest.version}|${origin}|${tableKey}` : "";
  const [snapshot, setSnapshot] = useState<{
    key: string;
    state: DataState<Record<string, MetricRow[]>>;
  }>({ key: "", state: { status: "loading" } });
  useEffect(() => {
    let active = true;
    if (!manifest || !origin) {
      return () => {
        active = false;
      };
    }
    Promise.all(
      tables.map((table) => loadOriginTable(manifest, table, origin)),
    ).then(
      (rows) => {
        if (!active) return;
        setSnapshot({
          key: requestKey,
          state: {
            status: "ready",
            data: Object.fromEntries(
              tables.map((table, index) => [table, rows[index]]),
            ),
          },
        });
      },
      (error: Error) =>
        active &&
        setSnapshot({ key: requestKey, state: { status: "error", error } }),
    );
    return () => {
      active = false;
    };
    // tableKey is a stable representation of the caller's table list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manifest, origin, requestKey, tableKey]);
  return snapshot.key === requestKey && requestKey
    ? snapshot.state
    : { status: "loading" };
}
