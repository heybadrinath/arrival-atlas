"use client";

import {
  ArrowRight,
  ArrowRightLeft,
  CalendarDays,
  Clock3,
  MapPin,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { MONTHS, TIME_BANDS } from "@/lib/format";
import { useManifest } from "@/lib/data";
import { cn } from "@/lib/utils";

type RouteSearchProps = {
  initialOrigin?: string;
  initialDestination?: string;
  initialMonth?: number;
  initialBand?: string;
  dark?: boolean;
  compact?: boolean;
};

export function RouteSearch({
  initialOrigin,
  initialDestination,
  initialMonth,
  initialBand,
  dark = false,
  compact = false,
}: RouteSearchProps) {
  const router = useRouter();
  const manifestState = useManifest();
  const [selectedOrigin, setSelectedOrigin] = useState(initialOrigin ?? "");
  const [selectedDestination, setSelectedDestination] = useState(
    initialDestination ?? "",
  );
  const [selectedMonth, setSelectedMonth] = useState(
    initialMonth?.toString() ?? "",
  );
  const [band, setBand] = useState(initialBand ?? "All");

  const manifest =
    manifestState.status === "ready" ? manifestState.data : undefined;
  const airportByCode = useMemo(
    () =>
      new Map(
        manifest?.airports.map((airport) => [airport.code, airport]) ?? [],
      ),
    [manifest],
  );

  const defaultRoute =
    manifest?.top_routes.find(
      (route) => route.origin === "LAX" && route.destination === "SFO",
    ) ?? manifest?.top_routes[0];
  const origin =
    (selectedOrigin && manifest?.routes[selectedOrigin]
      ? selectedOrigin
      : "") ||
    (initialOrigin && manifest?.routes[initialOrigin] ? initialOrigin : "") ||
    defaultRoute?.origin ||
    "";
  const destinations = origin ? (manifest?.routes[origin] ?? []) : [];
  const destination =
    (selectedDestination &&
    destinations.some((route) => route.destination === selectedDestination)
      ? selectedDestination
      : "") ||
    (initialDestination &&
    destinations.some((route) => route.destination === initialDestination)
      ? initialDestination
      : "") ||
    (defaultRoute &&
    defaultRoute.origin === origin &&
    destinations.some((route) => route.destination === defaultRoute.destination)
      ? defaultRoute.destination
      : "") ||
    destinations[0]?.destination ||
    "";
  const month =
    selectedMonth ||
    initialMonth?.toString() ||
    (manifest
      ? String(Number(manifest.coverage.latest_complete_month.slice(5)))
      : "");

  function changeOrigin(nextOrigin: string) {
    setSelectedOrigin(nextOrigin);
    const available = manifest?.routes[nextOrigin] ?? [];
    if (!available.some((route) => route.destination === destination)) {
      setSelectedDestination(available[0]?.destination ?? "");
    }
  }

  function swapRoute() {
    if (!manifest || !origin || !destination) return;
    const reverseExists = manifest.routes[destination]?.some(
      (route) => route.destination === origin,
    );
    if (reverseExists) {
      setSelectedOrigin(destination);
      setSelectedDestination(origin);
    }
  }

  function explore() {
    if (!origin || !destination || !month) return;
    const query = new URLSearchParams({ origin, destination, month, band });
    router.push(`/route?${query.toString()}`);
  }

  const labelClass = dark ? "[&_span:first-child]:text-white/58" : undefined;
  const disabled = !manifest || !origin || !destination || !month;

  return (
    <div
      className={cn(
        "grid items-end gap-3",
        compact
          ? "md:grid-cols-[1fr_auto_1fr_0.8fr_0.9fr_auto]"
          : "lg:grid-cols-[1fr_auto_1fr_0.8fr_0.9fr_auto]",
      )}
    >
      <SelectField
        label="From"
        value={origin}
        onChange={(event) => changeOrigin(event.target.value)}
        disabled={!manifest}
        className={labelClass}
        aria-label="Origin airport"
      >
        {!manifest ? <option>Loading airports…</option> : null}
        {Object.keys(manifest?.routes ?? {})
          .sort()
          .map((code) => (
            <option key={code} value={code}>
              {code} — {airportByCode.get(code)?.city_name ?? "US airport"}
            </option>
          ))}
      </SelectField>

      <Button
        type="button"
        variant="ghost"
        className={cn(
          "mb-0.5 size-11 min-h-11 rounded-full p-0",
          dark ? "text-white hover:bg-white/10" : "text-muted",
        )}
        onClick={swapRoute}
        aria-label="Swap origin and destination"
        title="Swap route"
      >
        <ArrowRightLeft className="size-4" />
      </Button>

      <SelectField
        label="To"
        value={destination}
        onChange={(event) => setSelectedDestination(event.target.value)}
        disabled={!manifest || !origin}
        className={labelClass}
        aria-label="Destination airport"
      >
        {destinations.map((route) => (
          <option key={route.destination} value={route.destination}>
            {route.destination} —{" "}
            {airportByCode.get(route.destination)?.city_name ?? "US airport"}
          </option>
        ))}
      </SelectField>

      <SelectField
        label="Travel month"
        value={month}
        onChange={(event) => setSelectedMonth(event.target.value)}
        disabled={!manifest}
        className={labelClass}
        aria-label="Travel month"
      >
        {MONTHS.map((name, index) => (
          <option key={name} value={index + 1}>
            {name}
          </option>
        ))}
      </SelectField>

      <SelectField
        label="Departure"
        value={band}
        onChange={(event) => setBand(event.target.value)}
        disabled={!manifest}
        className={labelClass}
        aria-label="Departure time window"
      >
        {TIME_BANDS.map((name) => (
          <option key={name} value={name}>
            {name === "All" ? "Any time" : name}
          </option>
        ))}
      </SelectField>

      <Button
        type="button"
        className="h-12 whitespace-nowrap"
        onClick={explore}
        disabled={disabled}
      >
        Explore route
        <ArrowRight className="size-4" aria-hidden="true" />
      </Button>

      {!compact ? (
        <div className="col-span-full mt-1 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/58">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5" /> US domestic routes
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" />{" "}
            {manifest?.coverage.start ?? "2021-01"} to{" "}
            {manifest?.coverage.end ?? "latest complete month"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="size-3.5" /> Local scheduled departure time
          </span>
        </div>
      ) : null}
    </div>
  );
}
