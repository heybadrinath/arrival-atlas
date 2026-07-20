import type { Metadata } from "next";
import { Suspense } from "react";

import { AirportExplorer } from "@/components/explorer/airport-explorer";

export const metadata: Metadata = {
  title: "Airport explorer",
  description:
    "Explore historical route volume, cancellations, severe delays, and time-of-day performance from US airports.",
};

export default function AirportPage() {
  return (
    <Suspense
      fallback={
        <div className="page-shell min-h-[70vh] py-16">
          Loading airport explorer…
        </div>
      }
    >
      <AirportExplorer />
    </Suspense>
  );
}
