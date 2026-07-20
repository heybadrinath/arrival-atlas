import { Plane } from "lucide-react";

import { cn } from "@/lib/utils";

export function RouteRibbon({
  origin,
  destination,
  dark = false,
  compact = false,
}: {
  origin: string;
  destination: string;
  dark?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[auto_1fr_auto] items-center",
        compact ? "gap-3" : "gap-4 md:gap-7",
      )}
      aria-label={`${origin} to ${destination}`}
    >
      <span
        className={cn(
          "font-display font-semibold tracking-[-0.07em]",
          compact ? "text-3xl" : "text-5xl sm:text-6xl md:text-7xl",
          dark ? "text-white" : "text-midnight",
        )}
      >
        {origin}
      </span>
      <span className="route-dash relative h-8 min-w-16" aria-hidden="true">
        <span className="absolute top-1/2 left-0 size-2 -translate-y-1/2 rounded-full bg-coral" />
        <Plane
          className={cn(
            "absolute top-1/2 left-[58%] -translate-x-1/2 -translate-y-1/2 rotate-45",
            compact ? "size-4" : "size-5 md:size-6",
            dark ? "fill-midnight text-teal-light" : "fill-paper text-teal",
          )}
        />
        <span className="absolute top-1/2 right-0 size-2 -translate-y-1/2 rounded-full bg-teal-light" />
      </span>
      <span
        className={cn(
          "font-display font-semibold tracking-[-0.07em]",
          compact ? "text-3xl" : "text-5xl sm:text-6xl md:text-7xl",
          dark ? "text-white" : "text-midnight",
        )}
      >
        {destination}
      </span>
    </div>
  );
}
