import type { ComparisonRow } from "@wcro/core";
import { ArrowDown, ArrowUp, Banknote, Clock, Leaf, Route, type LucideIcon } from "lucide-react";
import { fmt, fmtMinutes, fmtPhp } from "@/lib/format";

const icons: Partial<Record<ComparisonRow["metric"], LucideIcon>> = {
  distanceKm: Route,
  travelTimeMin: Clock,
  fuelCostPhp: Banknote,
  co2Kg: Leaf,
};

const formatValue = (row: ComparisonRow, value: number) => {
  switch (row.metric) {
    case "fuelCostPhp":
      return fmtPhp(value);
    case "travelTimeMin":
      return fmtMinutes(value);
    default:
      return `${fmt(value)} ${row.unit}`;
  }
};

export function SavingsTiles({ comparison }: { comparison: ComparisonRow[] }) {
  const tiles = comparison.filter((r) => r.metric !== "fuelLiters");
  return (
    <ul className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {tiles.map((row, i) => {
        const better = row.savings > 0;
        const worse = row.savings < 0;
        const Icon = icons[row.metric] ?? Route;
        const max = Math.max(row.traditional, row.optimized) || 1;
        return (
          <li
            key={row.metric}
            className="animate-rise rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
              <p className="flex items-center gap-2 text-sm font-medium text-muted">
                <Icon className="size-4" aria-hidden />
                {row.label} saved
              </p>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  better
                    ? "bg-optimized-soft text-optimized"
                    : worse
                      ? "bg-danger-soft text-danger"
                      : "bg-surface-2 text-muted"
                }`}
              >
                {better ? (
                  <ArrowUp className="size-3" aria-hidden />
                ) : worse ? (
                  <ArrowDown className="size-3" aria-hidden />
                ) : null}
                {(better || worse) && <span aria-hidden>{better ? "A*" : "Traditional"}</span>}
                <span className="num">{fmt(Math.abs(row.savingsPercent))}%</span>
                <span className="sr-only">{worse ? "more than traditional" : "less than traditional"}</span>
              </span>
            </div>

            <p
              className={`num mt-3 text-2xl font-semibold leading-8 sm:text-[28px] ${better ? "text-optimized" : worse ? "text-danger" : ""}`}
            >
              {formatValue(row, Math.abs(row.savings))}
            </p>

            <div className="mt-4 hidden space-y-1.5 sm:block" aria-hidden>
              <Bar label="Traditional" value={row.traditional} max={max} className="bg-traditional-solid" />
              <Bar label="Optimized" value={row.optimized} max={max} className="bg-optimized-solid" />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Bar({ label, value, max, className }: { label: string; value: number; max: number; className: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-muted">
      <span className="w-[68px] shrink-0">{label}</span>
      <div className="h-1.5 flex-1 rounded-full bg-surface-2">
        <div className={`h-full rounded-full ${className}`} style={{ width: `${Math.max((value / max) * 100, 2)}%` }} />
      </div>
      <span className="num w-14 shrink-0 text-right">{fmt(value)}</span>
    </div>
  );
}
