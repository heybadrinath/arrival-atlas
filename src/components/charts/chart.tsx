"use client";

import type { EChartsOption } from "echarts";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="h-full min-h-64 animate-pulse rounded-xl bg-paper-deep" />
  ),
});

export const CHART_COLORS = {
  midnight: "#071922",
  ink: "#10252d",
  teal: "#0c7067",
  tealLight: "#a8d8d0",
  coral: "#ed715f",
  sky: "#9cc9d7",
  paper: "#f4f2e9",
  muted: "#586b70",
  line: "#cfd4ce",
  gold: "#c7964d",
};

export function Chart({
  option,
  label,
  height = 320,
}: {
  option: EChartsOption;
  label: string;
  height?: number;
}) {
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const accessibleOption = useMemo<EChartsOption>(
    () => ({
      animation: !reducedMotion,
      animationDuration: 450,
      animationEasing: "cubicOut",
      aria: { enabled: true, decal: { show: false } },
      textStyle: {
        fontFamily: "var(--font-manrope), sans-serif",
        color: CHART_COLORS.ink,
      },
      color: [
        CHART_COLORS.teal,
        CHART_COLORS.coral,
        CHART_COLORS.sky,
        CHART_COLORS.gold,
        CHART_COLORS.midnight,
      ],
      ...option,
    }),
    [option, reducedMotion],
  );

  return (
    <div
      role="img"
      aria-label={label}
      style={{ height }}
      className="w-full min-w-0"
    >
      <ReactECharts
        option={accessibleOption}
        notMerge
        lazyUpdate
        opts={{ renderer: "svg" }}
        style={{ height: "100%", width: "100%" }}
      />
    </div>
  );
}
