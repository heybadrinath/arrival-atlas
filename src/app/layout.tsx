import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Manrope, Space_Grotesk } from "next/font/google";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import "./globals.css";

const display = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const body = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const utility = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://arrival-atlas.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Arrival Atlas — Historical US flight reliability",
    template: "%s · Arrival Atlas",
  },
  description:
    "Compare historical on-time, cancellation, and severe-delay performance for US domestic routes using official BTS data.",
  applicationName: "Arrival Atlas",
  keywords: [
    "flight reliability",
    "flight delays",
    "airline cancellations",
    "BTS on-time performance",
    "US domestic flights",
  ],
  authors: [{ name: "Arrival Atlas contributors" }],
  creator: "Arrival Atlas contributors",
  openGraph: {
    type: "website",
    siteName: "Arrival Atlas",
    title: "Arrival Atlas — Know the route before you book",
    description:
      "Historical reliability by route, airline, month, and departure time—built from official BTS records.",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Arrival Atlas — Historical US flight reliability",
    description:
      "Compare route-level on-time, cancellation, and severe-delay history from official BTS data.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#071922",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${display.variable} ${body.variable} ${utility.variable}`}
    >
      <body>
        <a
          href="#main-content"
          className="fixed top-3 left-3 z-[100] -translate-y-24 rounded-md bg-coral px-4 py-2 font-semibold text-midnight transition-transform focus:translate-y-0"
        >
          Skip to content
        </a>
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
