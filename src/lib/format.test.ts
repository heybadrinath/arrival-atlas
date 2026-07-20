import { describe, expect, it } from "vitest";

import {
  bytes,
  minutes,
  percent,
  percentText,
  periodLabel,
} from "@/lib/format";

describe("metric formatting", () => {
  it("uses the requested metric denominators", () => {
    expect(percent(73, 100)).toBe(73);
    expect(percent(1, 0)).toBeNull();
    expect(percentText(percent(2, 3))).toBe("66.7%");
  });

  it("makes early and late minutes explicit", () => {
    expect(minutes(-8)).toBe("−8 min");
    expect(minutes(17.6)).toBe("+18 min");
    expect(minutes(null)).toBe("—");
  });

  it("formats periods and aggregate sizes", () => {
    expect(periodLabel(2026, 5)).toBe("May 2026");
    expect(bytes(1024 * 1024)).toBe("1.0 MB");
  });
});
