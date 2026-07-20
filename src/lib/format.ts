const integerFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const TIME_BANDS = [
  "All",
  "Overnight",
  "Morning",
  "Afternoon",
  "Evening",
];

export function integer(value: number | null | undefined): string {
  return value == null || Number.isNaN(value)
    ? "—"
    : integerFormatter.format(value);
}

export function compactInteger(value: number | null | undefined): string {
  return value == null || Number.isNaN(value)
    ? "—"
    : compactFormatter.format(value);
}

export function percent(numerator: number, denominator: number): number | null {
  return denominator > 0 ? (numerator / denominator) * 100 : null;
}

export function percentText(value: number | null | undefined): string {
  return value == null || Number.isNaN(value)
    ? "—"
    : `${decimalFormatter.format(value)}%`;
}

export function minutes(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  const rounded = Math.round(value);
  if (rounded === 0) return "0 min";
  return `${rounded > 0 ? "+" : "−"}${integerFormatter.format(Math.abs(rounded))} min`;
}

export function bytes(value: number): string {
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB"];
  let size = value / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && size >= 1024; index += 1) {
    size /= 1024;
    unit = units[index];
  }
  return `${decimalFormatter.format(size)} ${unit}`;
}

export function signedPoints(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${decimalFormatter.format(Math.abs(value))} pts`;
}

export function periodLabel(year: number, month: number): string {
  return `${MONTHS[month - 1].slice(0, 3)} ${year}`;
}
