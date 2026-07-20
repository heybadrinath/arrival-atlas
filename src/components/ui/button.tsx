import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-[0.75rem] px-5 text-sm font-bold transition-[transform,background-color,border-color,color] disabled:cursor-not-allowed disabled:opacity-45",
        variant === "primary" &&
          "bg-coral text-midnight shadow-[0_7px_22px_rgb(237_113_95_/_20%)] hover:-translate-y-0.5 hover:bg-[#f07d6b]",
        variant === "secondary" &&
          "border border-ink/15 bg-surface text-ink hover:border-teal hover:text-teal",
        variant === "ghost" && "bg-transparent text-current hover:bg-current/8",
        className,
      )}
      {...props}
    />
  );
}
