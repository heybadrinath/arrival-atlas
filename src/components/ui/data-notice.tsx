import { Info } from "lucide-react";

import { cn } from "@/lib/utils";

export function DataNotice({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "warning";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border px-4 py-3 text-sm leading-6",
        tone === "neutral" && "border-sky/60 bg-sky/12 text-ink",
        tone === "warning" && "border-[#d9bf91] bg-[#f7edda] text-[#624719]",
        className,
      )}
    >
      <Info className="mt-1 size-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
