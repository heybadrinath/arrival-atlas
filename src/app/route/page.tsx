import type { Metadata } from "next";
import { Suspense } from "react";

import { RouteExplorer } from "@/components/explorer/route-explorer";

export const metadata: Metadata = {
  title: "Route explorer",
  description:
    "Compare historical airline reliability, delay tails, cancellations, and time bands for a US domestic route.",
};

export default function RoutePage() {
  return (
    <Suspense
      fallback={
        <div className="page-shell min-h-[70vh] py-16">
          Loading route explorer…
        </div>
      }
    >
      <RouteExplorer />
    </Suspense>
  );
}
