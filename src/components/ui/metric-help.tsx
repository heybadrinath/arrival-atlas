"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import { CircleHelp } from "lucide-react";

export function MetricHelp({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip.Provider delayDuration={250}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            className="inline-grid size-5 place-items-center rounded-full text-muted hover:text-teal"
            aria-label={`Definition: ${label}`}
          >
            <CircleHelp className="size-3.5" />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            sideOffset={7}
            className="z-[80] max-w-64 rounded-lg bg-midnight px-3 py-2 text-xs leading-5 text-white shadow-xl"
          >
            {children}
            <Tooltip.Arrow className="fill-midnight" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
