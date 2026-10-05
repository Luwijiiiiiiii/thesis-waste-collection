import type { Metadata, Viewport } from "next";
import { Fira_Code, Fira_Sans } from "next/font/google";
import Link from "next/link";
import { BottomNav, BrandMark, SidebarNav } from "@/components/AppNav";
import "./globals.css";

const firaSans = Fira_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fira-sans",
  display: "swap",
});
const firaCode = Fira_Code({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-fira-code",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Waste Route Optimizer · Baguio City",
  description: "Decision-support prototype for municipal solid waste collection routing using TSP and A* on OpenStreetMap.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0a101d" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${firaSans.variable} ${firaCode.variable}`}>
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only z-[2000] rounded-lg bg-brand px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>

        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface px-4 py-5 lg:flex">
          <Link href="/" className="flex items-center gap-3 rounded-xl px-1 py-1">
            <BrandMark />
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold leading-5 tracking-tight">Route Optimizer</span>
              <span className="block text-xs text-muted">Baguio City · TSP + A*</span>
            </span>
          </Link>
          <div className="mt-8">
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Navigate</p>
            <SidebarNav />
          </div>
          <p className="mt-auto px-3 text-xs leading-5 text-muted">
            Road data © OpenStreetMap contributors. Thesis prototype – results are estimates.
          </p>
        </aside>

        {/* Mobile / tablet top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
          <Link href="/" className="flex items-center gap-3">
            <BrandMark />
            <span className="text-[15px] font-semibold tracking-tight">Route Optimizer</span>
          </Link>
        </header>

        <div className="lg:pl-64">
          <main id="main" className="mx-auto max-w-[1280px] px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-12">
            {children}
          </main>
        </div>

        <BottomNav />
      </body>
    </html>
  );
}
