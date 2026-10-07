import type { Metadata, Viewport } from "next";
import { Fira_Code, Fira_Sans } from "next/font/google";
import Link from "next/link";
import { BottomNav, SidebarNav } from "@/components/AppNav";
import { BrandLockup } from "@/components/BrandLogo";
import { HelpButton, TourOverlay } from "@/components/Tour";
import { ThemeToggle } from "@/components/ThemeToggle";
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
  title: "Route Optimizer · Baguio City",
  applicationName: "Route Optimizer",
  description:
    "Decision-support prototype for municipal solid waste collection routing using TSP and A* on OpenStreetMap.",
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
    <html lang="en" className={`${firaSans.variable} ${firaCode.variable}`} suppressHydrationWarning>
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static theme script, no user input; must run before paint
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.theme||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only z-[2000] rounded-lg bg-brand px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>

        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface px-4 py-5 lg:flex">
          <Link href="/" className="rounded-xl px-1 py-1">
            <BrandLockup subtitle="Baguio City · TSP + A*" />
          </Link>
          <div className="mt-8">
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Navigate</p>
            <SidebarNav />
          </div>
          <div className="mt-auto">
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <HelpButton />
            </div>
            <p className="mt-2 px-3 text-xs leading-5 text-muted">
              Road data © OpenStreetMap contributors. Thesis prototype – results are estimates.
            </p>
          </div>
        </aside>

        {/* Mobile / tablet top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
          <Link href="/">
            <BrandLockup />
          </Link>
          <HelpButton className="ml-auto" />
          <ThemeToggle />
        </header>

        <div className="lg:pl-64">
          <main id="main" className="mx-auto max-w-[1280px] px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-12">
            {children}
          </main>
        </div>

        <BottomNav />
        <TourOverlay />
      </body>
    </html>
  );
}
