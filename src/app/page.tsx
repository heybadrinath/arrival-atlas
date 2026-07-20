import { ArrowUpRight } from "lucide-react";

import { LandingDataStrip, PopularRoutes } from "@/components/landing-data";
import { RouteRibbon } from "@/components/route-ribbon";
import { RouteSearch } from "@/components/route-search";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <>
      <section className="data-grid relative bg-midnight text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(circle at 78% 15%, rgba(156,201,215,.22), transparent 30%), radial-gradient(circle at 10% 80%, rgba(237,113,95,.12), transparent 26%)",
          }}
        />
        <div className="page-shell relative py-14 sm:py-18 lg:py-20">
          <div className="grid items-end gap-10 lg:grid-cols-[1.08fr_0.92fr]">
            <div>
              <p className="font-mono text-xs font-semibold tracking-[0.18em] text-teal-light uppercase">
                Official BTS records · route-level context
              </p>
              <h1 className="balance mt-5 max-w-3xl font-display text-[clamp(3.15rem,6vw,5.85rem)] leading-[0.92] font-semibold tracking-[-0.07em]">
                Know the route before you book.
              </h1>
              <p className="mt-7 max-w-2xl text-base leading-7 text-white/72 sm:text-lg sm:leading-8">
                Compare how US domestic flights have performed by route,
                airline, month, and departure time. See the ordinary delays—and
                the bad days averages hide.
              </p>
            </div>
            <div className="border-y border-white/14 border-l-2 border-l-coral bg-white/[0.035] px-6 py-7 sm:px-8">
              <p className="mb-5 font-mono text-[0.68rem] font-semibold tracking-[0.12em] text-white/52 uppercase">
                Route brief · example
              </p>
              <RouteRibbon origin="LAX" destination="SFO" dark />
              <div className="mt-6 grid grid-cols-2 border-t border-white/12 pt-5 text-sm">
                <div>
                  <p className="text-white/48">Compare</p>
                  <p className="mt-1 font-semibold text-white">
                    Airlines & time bands
                  </p>
                </div>
                <div>
                  <p className="text-white/48">Understand</p>
                  <p className="mt-1 font-semibold text-white">
                    Typical & tail delay
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-30 mt-10 rounded-[0.9rem] border border-white/14 bg-white/[0.07] p-4 shadow-[0_18px_50px_rgb(0_0_0_/_14%)] sm:p-5">
            <RouteSearch dark />
          </div>
        </div>
      </section>

      <LandingDataStrip />

      <section className="page-shell py-20 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
          <div>
            <p className="font-mono text-xs font-semibold tracking-[0.16em] text-teal uppercase">
              Why route context matters
            </p>
            <h2 className="balance mt-4 font-display text-4xl leading-[1.02] font-semibold tracking-[-0.055em] text-midnight sm:text-5xl">
              Airline averages don’t fly your route.
            </h2>
            <p className="mt-6 text-base leading-7 text-muted">
              Reliability changes with season, airport congestion, operating
              carrier, and scheduled departure time. Arrival Atlas keeps those
              conditions visible—and shows how many flights support every
              comparison.
            </p>
          </div>
          <div className="grid border-t border-line sm:grid-cols-2">
            {[
              {
                title: "Compare like with like",
                body: "Rank only airlines that actually served the selected route and met the visible sample rule.",
              },
              {
                title: "See the tail, not just typical",
                body: "Median, 75th, and 90th-percentile delay reveal the spread hidden by a single average.",
              },
              {
                title: "Audit every number",
                body: "Definitions, coverage, source lineage, and observation counts stay one click away.",
              },
              {
                title: "Historical, not predictive",
                body: "This is historical descriptive analysis. Weather and operations can make a future trip differ.",
              },
            ].map(({ title, body }, index) => (
              <article
                key={title}
                className={cn(
                  "border-b border-line py-6 sm:px-7 sm:py-7",
                  index % 2 === 0 && "sm:border-r",
                )}
              >
                <span className="font-mono text-[0.68rem] font-semibold tracking-[0.12em] text-teal">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-4 font-display text-xl font-semibold tracking-[-0.035em]">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-paper-deep/55 py-20 sm:py-24">
        <div className="page-shell">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-xs font-semibold tracking-[0.16em] text-teal uppercase">
                Start with a busy route
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
                Routes with enough history to compare
              </h2>
            </div>
            <a
              href="/route"
              className="inline-flex items-center gap-2 text-sm font-bold text-teal hover:underline"
            >
              Open route explorer <ArrowUpRight className="size-4" />
            </a>
          </div>
          <PopularRoutes />
        </div>
      </section>

      <section className="page-shell py-20 sm:py-24">
        <div className="grid overflow-hidden rounded-[1.5rem] bg-midnight text-white lg:grid-cols-[1fr_0.9fr]">
          <div className="p-8 sm:p-12">
            <p className="font-mono text-xs font-semibold tracking-[0.16em] text-teal-light uppercase">
              Use the history carefully
            </p>
            <h2 className="balance mt-4 font-display text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
              Use history as context, not a forecast.
            </h2>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/68 sm:text-base">
              Published schedules, storms, air traffic constraints, aircraft
              rotations, and reporting coverage change. Use the history to
              compare conditions, then pair it with current advisories and your
              own risk tolerance.
            </p>
          </div>
          <div className="border-t border-white/10 bg-white/[0.045] p-8 sm:p-12 lg:border-t-0 lg:border-l">
            <p className="text-xs font-bold tracking-[0.1em] text-white/48 uppercase">
              Arrival Atlas can tell you
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-white/78">
              <li>
                • What happened on comparable flights in the covered history
              </li>
              <li>• How many records support a displayed rate or percentile</li>
              <li>
                • Whether severe delays and cancellations varied by time band
              </li>
            </ul>
            <p className="mt-7 text-xs font-bold tracking-[0.1em] text-white/48 uppercase">
              It cannot tell you
            </p>
            <p className="mt-3 text-sm leading-6 text-white/78">
              Whether a specific future flight will be delayed or cancelled.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
