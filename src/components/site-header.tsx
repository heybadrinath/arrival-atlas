import { Code2, Menu, Plane } from "lucide-react";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-midnight/95 text-white backdrop-blur-md">
      <div className="page-shell flex h-16 items-center justify-between gap-6">
        <Link
          href="/"
          className="group flex items-center gap-3"
          aria-label="Arrival Atlas home"
        >
          <span className="relative grid size-9 place-items-center rounded-full border border-teal-light/40 bg-white/5">
            <span className="absolute left-1.5 size-1.5 rounded-full bg-coral" />
            <span className="absolute right-1.5 size-1.5 rounded-full bg-teal-light" />
            <span className="h-px w-5 rotate-[-18deg] bg-white/50" />
            <Plane className="absolute size-3 rotate-45 text-white transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
          <span className="font-display text-[1.05rem] font-semibold tracking-[-0.03em]">
            Arrival Atlas
          </span>
        </Link>

        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-7 text-sm md:flex"
        >
          <Link
            className="text-white/72 transition-colors hover:text-white"
            href="/route"
          >
            Route explorer
          </Link>
          <Link
            className="text-white/72 transition-colors hover:text-white"
            href="/airport"
          >
            Airports
          </Link>
          <Link
            className="text-white/72 transition-colors hover:text-white"
            href="/methodology"
          >
            Methodology
          </Link>
          <a
            className="flex items-center gap-2 text-white/72 transition-colors hover:text-white"
            href="https://github.com/heybadrinath/arrival-atlas"
            target="_blank"
            rel="noreferrer"
          >
            <Code2 className="size-4" aria-hidden="true" />
            Source
          </a>
        </nav>

        <details className="relative md:hidden">
          <summary className="grid size-10 cursor-pointer list-none place-items-center rounded-full border border-white/15 text-white [&::-webkit-details-marker]:hidden">
            <Menu className="size-5" aria-label="Open navigation" />
          </summary>
          <nav className="absolute top-12 right-0 flex w-56 flex-col rounded-xl border border-white/10 bg-midnight p-2 shadow-2xl">
            <Link
              className="rounded-lg px-4 py-3 hover:bg-white/8"
              href="/route"
            >
              Route explorer
            </Link>
            <Link
              className="rounded-lg px-4 py-3 hover:bg-white/8"
              href="/airport"
            >
              Airports
            </Link>
            <Link
              className="rounded-lg px-4 py-3 hover:bg-white/8"
              href="/methodology"
            >
              Methodology
            </Link>
            <a
              className="rounded-lg px-4 py-3 hover:bg-white/8"
              href="https://github.com/heybadrinath/arrival-atlas"
            >
              Source code ↗
            </a>
          </nav>
        </details>
      </div>
    </header>
  );
}
