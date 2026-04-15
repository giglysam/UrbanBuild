import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { getServerEnv } from "@/env/server";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const siteUrl = getServerEnv().NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "UrbanBuild — AI-assisted urban planning",
    template: "%s · UrbanBuild",
  },
  description:
    "Urban planning and design workspace: OSM site intelligence, structured AI analysis, planning briefs, scenarios, and exports.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrains.variable} min-h-dvh font-sans`}>
        {children}
      </body>
    </html>
  );
}
