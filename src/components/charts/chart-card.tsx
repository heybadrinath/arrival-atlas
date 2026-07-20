import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ChartCard({
  title,
  eyebrow,
  meta,
  explanation,
  children,
  className,
}: {
  title: string;
  eyebrow?: string;
  meta: string;
  explanation?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("min-w-0 overflow-hidden", className)}>
      <div className="flex flex-col gap-2 border-b border-line px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          {eyebrow ? (
            <p className="font-mono text-[0.66rem] font-semibold tracking-[0.11em] text-teal uppercase">
              {eyebrow}
            </p>
          ) : null}
          <h3 className="mt-1 font-display text-xl font-semibold tracking-[-0.035em]">
            {title}
          </h3>
        </div>
        <p className="font-mono text-[0.66rem] leading-5 text-muted sm:text-right">
          {meta}
        </p>
      </div>
      <div className="px-2 py-4 sm:px-4">{children}</div>
      {explanation ? (
        <p className="border-t border-line px-5 py-4 text-xs leading-5 text-muted sm:px-6">
          {explanation}
        </p>
      ) : null}
    </Card>
  );
}
