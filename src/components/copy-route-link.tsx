"use client";

import { Check, Copy, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

type CopyState = "idle" | "copied" | "error";

function fallbackCopy(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("The browser did not copy the route link.");
}

export function CopyRouteLink({
  origin,
  destination,
  month,
  band,
}: {
  origin: string;
  destination: string;
  month: number;
  band: string;
}) {
  const [state, setState] = useState<CopyState>("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  async function copyLink() {
    const query = new URLSearchParams({
      origin,
      destination,
      month: String(month),
      band,
    });
    const url = `${window.location.origin}/route?${query.toString()}`;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        fallbackCopy(url);
      }
      setState("copied");
    } catch {
      setState("error");
    }

    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setState("idle"), 2400);
  }

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={copyLink}
      className="h-10 min-h-10 px-3.5"
      aria-live="polite"
    >
      {state === "copied" ? (
        <>
          <Check className="size-4" aria-hidden="true" /> Link copied
        </>
      ) : state === "error" ? (
        <>
          <TriangleAlert className="size-4" aria-hidden="true" /> Copy failed
        </>
      ) : (
        <>
          <Copy className="size-4" aria-hidden="true" /> Copy route link
        </>
      )}
    </Button>
  );
}
