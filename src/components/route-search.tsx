"use client";

import {
  ArrowRight,
  ArrowRightLeft,
  CalendarDays,
  Clock3,
  History,
  LoaderCircle,
  MapPin,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";

import { Button } from "@/components/ui/button";
import { SelectField, type SelectOption } from "@/components/ui/select-field";
import { useManifest } from "@/lib/data";
import { compactInteger, MONTHS, TIME_BANDS } from "@/lib/format";
import { cn } from "@/lib/utils";

type RouteSearchProps = {
  initialOrigin?: string;
  initialDestination?: string;
  initialMonth?: number;
  initialBand?: string;
  dark?: boolean;
  compact?: boolean;
};

type RecentRoute = {
  origin: string;
  destination: string;
  month: number;
  band: string;
};

const RECENT_ROUTES_KEY = "arrival-atlas:recent-routes-v1";
const RECENT_ROUTES_EVENT = "arrival-atlas:recent-routes-changed";

const MONTH_OPTIONS: SelectOption[] = MONTHS.map((label, index) => ({
  value: String(index + 1),
  label,
}));

const TIME_OPTIONS: SelectOption[] = [
  { value: "All", label: "Any time", detail: "All scheduled departures" },
  { value: "Overnight", label: "Overnight", detail: "00:00–05:59 local" },
  { value: "Morning", label: "Morning", detail: "06:00–11:59 local" },
  { value: "Afternoon", label: "Afternoon", detail: "12:00–17:59 local" },
  { value: "Evening", label: "Evening", detail: "18:00–23:59 local" },
];

function isRecentRoute(value: unknown): value is RecentRoute {
  if (!value || typeof value !== "object") return false;
  const route = value as Partial<RecentRoute>;
  return (
    typeof route.origin === "string" &&
    typeof route.destination === "string" &&
    typeof route.month === "number" &&
    route.month >= 1 &&
    route.month <= 12 &&
    typeof route.band === "string" &&
    TIME_BANDS.includes(route.band)
  );
}

function parseRecentRoutes(saved: string | null): RecentRoute[] {
  try {
    const parsed: unknown = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed)
      ? parsed.filter(isRecentRoute).slice(0, 3)
      : [];
  } catch {
    return [];
  }
}

function recentRoutesSnapshot() {
  try {
    return window.localStorage.getItem(RECENT_ROUTES_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function subscribeToRecentRoutes(onStoreChange: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === RECENT_ROUTES_KEY) onStoreChange();
  }
  window.addEventListener("storage", handleStorage);
  window.addEventListener(RECENT_ROUTES_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(RECENT_ROUTES_EVENT, onStoreChange);
  };
}

function rememberRoute(route: RecentRoute) {
  const current = parseRecentRoutes(recentRoutesSnapshot());
  const next = [
    route,
    ...current.filter(
      (item) =>
        !(
          item.origin === route.origin &&
          item.destination === route.destination &&
          item.month === route.month &&
          item.band === route.band
        ),
    ),
  ].slice(0, 3);
  try {
    window.localStorage.setItem(RECENT_ROUTES_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(RECENT_ROUTES_EVENT));
  } catch {
    // Browsing can continue when storage is unavailable or full.
  }
  return next;
}

function routeQuery(route: RecentRoute) {
  return new URLSearchParams({
    origin: route.origin,
    destination: route.destination,
    month: String(route.month),
    band: route.band,
  });
}

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
  const [isPending, startTransition] = useTransition();
  const [selectedOrigin, setSelectedOrigin] = useState(initialOrigin ?? "");
  const [selectedDestination, setSelectedDestination] = useState(
    initialDestination ?? "",
  );
  const [selectedMonth, setSelectedMonth] = useState(
    initialMonth?.toString() ?? "",
  );
  const [band, setBand] = useState(initialBand ?? "All");
  const recentRoutesJson = useSyncExternalStore(
    subscribeToRecentRoutes,
    recentRoutesSnapshot,
    () => "[]",
  );
  const recentRoutes = useMemo(
    () => parseRecentRoutes(recentRoutesJson),
    [recentRoutesJson],
  );

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
  const destinations = useMemo(
    () => (origin ? (manifest?.routes[origin] ?? []) : []),
    [manifest, origin],
  );
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

  const originOptions = useMemo<SelectOption[]>(
    () =>
      Object.keys(manifest?.routes ?? {})
        .sort()
        .map((code) => {
          const airport = airportByCode.get(code);
          const destinationCount = manifest?.routes[code]?.length ?? 0;
          return {
            value: code,
            code,
            label: airport?.city_name ?? "US airport",
            keywords: airport?.state,
            meta: `${destinationCount} ${destinationCount === 1 ? "route" : "routes"}`,
          };
        }),
    [airportByCode, manifest],
  );

  const destinationOptions = useMemo<SelectOption[]>(
    () =>
      [...destinations]
        .sort((left, right) => right.scheduled_flights - left.scheduled_flights)
        .map((route) => {
          const airport = airportByCode.get(route.destination);
          return {
            value: route.destination,
            code: route.destination,
            label: airport?.city_name ?? "US airport",
            keywords: airport?.state,
            meta: `${compactInteger(route.scheduled_flights)} flights`,
          };
        }),
    [airportByCode, destinations],
  );

  const reverseExists =
    !!manifest &&
    !!origin &&
    !!destination &&
    !!manifest.routes[destination]?.some(
      (route) => route.destination === origin,
    );
  const disabled = !manifest || !origin || !destination || !month || isPending;
  const validRecentRoutes = recentRoutes.filter(
    (route) =>
      manifest?.routes[route.origin]?.some(
        (option) => option.destination === route.destination,
      ) ?? false,
  );

  useEffect(() => {
    if (
      compact &&
      initialOrigin &&
      initialDestination &&
      initialMonth &&
      initialBand
    ) {
      rememberRoute({
        origin: initialOrigin,
        destination: initialDestination,
        month: initialMonth,
        band: initialBand,
      });
    }
  }, [compact, initialBand, initialDestination, initialMonth, initialOrigin]);

  function changeOrigin(nextOrigin: string) {
    setSelectedOrigin(nextOrigin);
    const available = manifest?.routes[nextOrigin] ?? [];
    if (!available.some((route) => route.destination === destination)) {
      setSelectedDestination(
        [...available].sort(
          (left, right) => right.scheduled_flights - left.scheduled_flights,
        )[0]?.destination ?? "",
      );
    }
  }

  function swapRoute() {
    if (!reverseExists) return;
    setSelectedOrigin(destination);
    setSelectedDestination(origin);
  }

  function openRoute(route: RecentRoute) {
    if (
      !manifest?.routes[route.origin]?.some(
        (option) => option.destination === route.destination,
      )
    )
      return;
    setSelectedOrigin(route.origin);
    setSelectedDestination(route.destination);
    setSelectedMonth(String(route.month));
    setBand(route.band);
    rememberRoute(route);
    startTransition(() =>
      router.push(`/route?${routeQuery(route).toString()}`),
    );
  }

  function explore() {
    if (!origin || !destination || !month || disabled) return;
    const route = { origin, destination, month: Number(month), band };
    rememberRoute(route);
    startTransition(() =>
      router.push(`/route?${routeQuery(route).toString()}`),
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        explore();
      }}
      className={cn(
        "grid items-end gap-3",
        compact
          ? "md:grid-cols-[minmax(0,1.6fr)_minmax(15rem,0.95fr)_auto]"
          : "lg:grid-cols-[minmax(0,1.6fr)_minmax(15rem,0.95fr)_auto]",
      )}
    >
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)] items-end gap-2">
        <SelectField
          label="Origin"
          ariaLabel="Origin airport"
          value={origin}
          options={originOptions}
          onValueChange={changeOrigin}
          disabled={!manifest || isPending}
          dark={dark}
          searchable
          searchPlaceholder="Airport code or city"
          emptyText="No origin airports match that search"
          placeholder={manifest ? "Choose origin" : "Loading airports…"}
          menuWidth="wide"
        />

        <Button
          type="button"
          variant="ghost"
          className={cn(
            "mb-0 size-10 min-h-10 rounded-full p-0",
            dark ? "text-white hover:bg-white/10" : "text-muted",
          )}
          onClick={swapRoute}
          disabled={!reverseExists || isPending}
          aria-label="Swap origin and destination"
          title={
            reverseExists
              ? "Swap route"
              : "The reverse route is not available in this dataset"
          }
        >
          <ArrowRightLeft className="size-4" />
        </Button>

        <SelectField
          label="Destination"
          ariaLabel="Destination airport"
          value={destination}
          options={destinationOptions}
          onValueChange={setSelectedDestination}
          disabled={!manifest || !origin || isPending}
          dark={dark}
          searchable
          searchPlaceholder="Airport code or city"
          emptyText="No destinations from this origin match"
          placeholder="Choose destination"
          menuAlign="end"
          menuWidth="wide"
        />
      </div>

      <div className="grid min-w-0 grid-cols-2 gap-2">
        <SelectField
          label="Month"
          ariaLabel="Travel month"
          value={month}
          options={MONTH_OPTIONS}
          onValueChange={setSelectedMonth}
          disabled={!manifest || isPending}
          dark={dark}
          placeholder="Month"
          columns={2}
          menuWidth="wide"
        />

        <SelectField
          label="Departure"
          ariaLabel="Departure time window"
          value={band}
          options={TIME_OPTIONS}
          onValueChange={setBand}
          disabled={!manifest || isPending}
          dark={dark}
          menuAlign="end"
          menuWidth="wide"
        />
      </div>

      <Button
        type="submit"
        className={cn(
          "h-11 w-full whitespace-nowrap",
          compact ? "md:w-auto" : "lg:w-auto",
        )}
        disabled={disabled}
      >
        {isPending ? (
          <>
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            Opening route…
          </>
        ) : (
          <>
            Explore route
            <ArrowRight className="size-4" aria-hidden="true" />
          </>
        )}
      </Button>

      {!compact ? (
        <div className="col-span-full mt-1 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 pt-3 text-xs text-white/60">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5" /> Search by airport code or city
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" />{" "}
            {manifest?.coverage.start ?? "2021-01"} to{" "}
            {manifest?.coverage.end ?? "latest complete month"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="size-3.5" /> Times use the origin airport’s local
            clock
          </span>
        </div>
      ) : null}

      {!compact && validRecentRoutes.length > 0 ? (
        <div
          className="col-span-full flex flex-wrap items-center gap-2"
          aria-label="Recent routes"
        >
          <span className="mr-1 inline-flex items-center gap-1.5 text-[0.68rem] font-bold tracking-[0.08em] text-white/52 uppercase">
            <History className="size-3.5" aria-hidden="true" /> Recent
          </span>
          {validRecentRoutes.map((route) => (
            <button
              key={`${route.origin}-${route.destination}-${route.month}-${route.band}`}
              type="button"
              onClick={() => openRoute(route)}
              disabled={isPending}
              aria-label={`Open recent route ${route.origin} to ${route.destination}, ${MONTHS[route.month - 1]}, ${route.band === "All" ? "any time" : route.band}`}
              className="inline-flex min-h-8 items-center gap-2 rounded-full border border-white/14 bg-white/[0.055] px-3 text-xs text-white/78 transition-colors hover:border-teal-light/55 hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              <span className="font-mono font-semibold text-white">
                {route.origin}→{route.destination}
              </span>
              <span>{MONTHS[route.month - 1].slice(0, 3)}</span>
              {route.band !== "All" ? <span>· {route.band}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </form>
  );
}
