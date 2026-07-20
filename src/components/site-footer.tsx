import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-midnight py-10 text-white/70">
      <div className="page-shell grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-end">
        <div>
          <p className="font-display text-lg font-semibold text-white">
            Arrival Atlas
          </p>
          <p className="mt-2 max-w-xl text-sm leading-6">
            A public, descriptive view of US domestic flight reliability.
            Historical performance is context—not a prediction of a future
            flight.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm md:justify-end">
          <Link href="/methodology" className="hover:text-white">
            Methodology
          </Link>
          <a
            href="https://www.transtats.bts.gov/TableInfo.asp?QO_fu146_anzr=b0-gvzr&gnoyr_VQ=FGJ"
            target="_blank"
            rel="noreferrer"
            className="hover:text-white"
          >
            BTS source ↗
          </a>
          <a
            href="https://github.com/heybadrinath/arrival-atlas"
            target="_blank"
            rel="noreferrer"
            className="hover:text-white"
          >
            GitHub ↗
          </a>
        </div>
      </div>
    </footer>
  );
}
