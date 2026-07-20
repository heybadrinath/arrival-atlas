# Metric definitions

## Populations

- **Scheduled:** every selected BTS flight row after exact-key deduplication.
- **Operated:** scheduled flights that were not cancelled. A diverted flight is operated.
- **Observed arrival:** operated, non-diverted flight with a non-null BTS `ArrDelay`.

## Rates

| Metric           | Numerator                               | Denominator       |
| ---------------- | --------------------------------------- | ----------------- |
| On-time arrival  | Observed arrivals with `ArrDelay < 15`  | Observed arrivals |
| Cancellation     | Cancelled flights                       | Scheduled flights |
| Diversion        | Diverted flights                        | Scheduled flights |
| 30+ minutes late | Observed arrivals with `ArrDelay >= 30` | Observed arrivals |
| 60+ minutes late | Observed arrivals with `ArrDelay >= 60` | Observed arrivals |

An arrival exactly 15 minutes late is not on time. Percentages are derived from published count
columns so a consumer can audit the denominator.

## Arrival-delay quantiles

Median, 75th percentile, and 90th percentile use DuckDB `quantile_cont` over BTS `ArrDelay` for
the exact displayed cohort. Cancelled and diverted flights are excluded. An exact `All` time-band
cohort is calculated from flight rows; subgroup percentiles are never averaged.

Negative arrival delay means the flight arrived early. No missing delay is converted to zero.

## Delay distribution

Observed arrivals are counted in mutually exclusive bins:

- early: under 0 minutes
- 0–14 minutes
- 15–29 minutes
- 30–59 minutes
- 60–119 minutes
- 120 minutes or more

## Delay causes

The five source-supported causes are carrier, weather, National Airspace System, security, and
late-arriving aircraft. The interface shows each cause's positive minutes divided by total
positive reported cause minutes for the cohort.

Cause data is not present for every delayed flight. Missing values remain missing and are not
assigned to an “other” cause.

## Time bands

| Band      | Scheduled local departure time |
| --------- | ------------------------------ |
| Overnight | 00:00–05:59                    |
| Morning   | 06:00–11:59                    |
| Afternoon | 12:00–17:59                    |
| Evening   | 18:00–23:59                    |

Arrival delay is read from BTS rather than inferred from local clock values, which avoids errors
from time zones and flights crossing midnight.

## Rankings

An airline receives a rank only within one selected route, calendar month, and departure-time
cohort, and only with at least 100 observed arrivals. Rows below that rule remain visible and are
marked small sample. Arrival Atlas does not produce global airline rankings or a composite score.

## Comparable period

The current comparison uses the latest year available for the selected calendar month and the
same calendar month one year earlier. Both use the same route and departure-time filter. A current
year without the selected complete month does not substitute a different month.
