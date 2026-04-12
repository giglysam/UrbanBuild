import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteName = "UrbanBuild";
const title = {
  default: `${siteName} — Beirut urban planning MVP`,
  template: `%s · ${siteName}`,
};

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description:
    "AI-assisted, map-grounded urban analysis for Beirut. OSM context, heuristic indicators, scenario cards, planning Q&A, and exportable briefs — with observed / inferred / speculative labels.",
  applicationName: siteName,
  keywords: [
    "urban planning",
    "Beirut",
    "OpenStreetMap",
    "GIS",
    "planning brief",
    "Mapbox",
    "walkability",
  ],
  authors: [{ name: "UrbanBuild" }],
  openGraph: {
    type: "website",
    siteName,
    title: title.default,
    description:
      "Site-aware urban intelligence for planners: map study areas, pull OSM context, run AI analysis, generate scenarios.",
  },
  twitter: {
    card: "summary_large_image",
    title: title.default,
    description:
      "Beirut MVP — map, metrics, AI insights, and planning brief export.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
