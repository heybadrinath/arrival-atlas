import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  hint?: string;
};

export function SelectField({
  label,
  hint,
  className,
  children,
  id,
  ...props
}: SelectFieldProps) {
  const fieldId = id ?? label.toLowerCase().replaceAll(" ", "-");
  return (
    <label htmlFor={fieldId} className={cn("block min-w-0", className)}>
      <span className="mb-2 flex items-baseline justify-between gap-2 text-xs font-bold tracking-[0.08em] text-muted uppercase">
        {label}
        {hint ? (
          <span className="font-normal tracking-normal normal-case">
            {hint}
          </span>
        ) : null}
      </span>
      <span className="relative block">
        <select
          id={fieldId}
          className="h-12 w-full appearance-none rounded-xl border border-ink/15 bg-surface pr-10 pl-4 text-sm font-semibold text-ink shadow-sm transition-colors hover:border-ink/30 disabled:cursor-not-allowed disabled:bg-paper-deep"
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
      </span>
    </label>
  );
}
