import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight, JetBrains_Mono } from "next/font/google";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { themeScript } from "@/components/theme-toggle";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
});
const mono = JetBrains_Mono({ variable: "--font-mono-ui", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://baseline-wheat.vercel.app",
  ),
  title: {
    default: "Baseline — typography and colour tools for designers",
    template: "%s · Baseline",
  },
  description:
    "Browse 1,900+ open-licence font families, build a modular type scale, generate an OKLCH palette that passes WCAG, and identify the fonts on any page. Free, no login.",
  keywords: [
    "font library",
    "google fonts",
    "type scale generator",
    "modular scale",
    "colour palette generator",
    "OKLCH",
    "WCAG contrast checker",
    "font identifier",
    "open font license",
  ],
  openGraph: {
    type: "website",
    siteName: "Baseline",
    title: "Baseline — typography and colour tools for designers",
    description:
      "Fonts, scales and palettes in one place. Licence-checked, contrast-checked, free.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Baseline — typography and colour tools for designers",
    description:
      "Fonts, scales and palettes in one place. Licence-checked, contrast-checked, free.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfcfd" },
    { media: "(prefers-color-scheme: dark)", color: "#141519" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${interTight.variable} ${mono.variable} h-full`}
    >
      <head>
        {/* Applies the stored theme before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col antialiased">
        <a
          href="#main"
          className="sr-only rounded-control focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-fg"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
