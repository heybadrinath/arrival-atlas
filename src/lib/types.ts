export type Airport = {
  code: string;
  airport_id: number;
  airport_seq_id: number;
  city_name: string;
  state: string;
  last_seen: string;
};

export type RouteOption = {
  destination: string;
  scheduled_flights: number;
};

export type ManifestTable = {
  rows: number;
  partitions: Record<string, string>;
};

export type DataManifest = {
  schema_version: number;
  product: string;
  version: string;
  generated_at: string;
  coverage: {
    start: string;
    end: string;
    latest_complete_month: string;
  };
  source: {
    name: string;
    table_info_url: string;
    download_url: string;
    source_rows: number;
    cleaned_rows: number;
    duplicates_removed: number;
    partition_count: number;
  };
  ranking_minimum_observations: number;
  airports: Airport[];
  carriers: Record<string, string>;
  routes: Record<string, RouteOption[]>;
  top_routes: Array<RouteOption & { origin: string }>;
  tables: Record<string, ManifestTable>;
  file_count: number;
  aggregate_rows: number;
  aggregate_bytes: number;
};

export type MetricRow = {
  origin?: string;
  origin_airport_id?: number;
  destination?: string;
  destination_airport_id?: number;
  carrier_id?: number;
  carrier_code?: string;
  calendar_month?: number;
  year?: number;
  month?: number;
  departure_time_band: string;
  scheduled_flights: number;
  operated_flights: number;
  observations: number;
  cancelled_flights: number;
  diverted_flights: number;
  on_time_arrivals: number;
  arrivals_30_plus: number;
  arrivals_60_plus: number;
  median_arrival_delay: number | null;
  p75_arrival_delay: number | null;
  p90_arrival_delay: number | null;
  delay_bin_early: number;
  delay_bin_0_14: number;
  delay_bin_15_29: number;
  delay_bin_30_59: number;
  delay_bin_60_119: number;
  delay_bin_120_plus: number;
  carrier_delay_minutes: number;
  weather_delay_minutes: number;
  nas_delay_minutes: number;
  security_delay_minutes: number;
  late_aircraft_delay_minutes: number;
};

export type DataState<T> =
  | { status: "loading"; data?: never; error?: never }
  | { status: "ready"; data: T; error?: never }
  | { status: "error"; data?: never; error: Error };
