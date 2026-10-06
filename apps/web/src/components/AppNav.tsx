"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, Sparkles } from "lucide-react";

const links = [
  { href: "/", label: "Workspace", icon: Sparkles, match: (p: string) => p === "/" },
  { href: "/simulations", label: "History", icon: History, match: (p: string) => p.startsWith("/simulations") },
];

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {links.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors duration-200 ${
              active ? "bg-brand-soft text-brand-ink" : "text-muted hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <Icon className="size-[18px]" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-[1000] border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto flex max-w-md">
        {links.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors duration-200 ${
                  active ? "text-brand-ink" : "text-muted"
                }`}
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
