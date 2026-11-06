import type { ComparisonRow } from "@wcro/core";
import { Banknote, Clock, Leaf, Route, type LucideIcon } from "lucide-react";
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
                      ? "bg-traditional-soft text-traditional"
                      : "bg-surface-2 text-muted"
                }`}
              >
                {better || worse ? (
                  <>
                    {better ? "A* Pathfinding" : "Traditional"} wins by{" "}
                    <span className="num">{fmt(Math.abs(row.savingsPercent))}%</span>
                  </>
                ) : (
                  "Tied"
                )}
              </span>
            </div>

            <p
              className={`num mt-3 text-2xl font-semibold leading-8 sm:text-[28px] ${worse ? "text-traditional" : "text-ink"}`}
            >
              {formatValue(row, Math.abs(row.savings))}
            </p>

            <div className="mt-4 hidden space-y-1.5 sm:block" aria-hidden>
              <Bar
                label="Traditional"
                value={row.traditional}
                max={max}
                className="bg-traditional-solid"
                emphasis={worse ? "winner" : better ? "loser" : "even"}
              />
              <Bar
                label="A* Pathfinding"
                value={row.optimized}
                max={max}
                className="bg-optimized-solid"
                emphasis={better ? "winner" : worse ? "loser" : "even"}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

type Emphasis = "winner" | "loser" | "even";

const barStyles: Record<Emphasis, { row: string; track: string; fill: string }> = {
  winner: { row: "font-semibold text-ink", track: "h-2.5", fill: "" },
  loser: { row: "text-muted", track: "h-1", fill: "opacity-60" },
  even: { row: "text-muted", track: "h-1.5", fill: "" },
};

function Bar({
  label,
  value,
  max,
  className,
  emphasis,
}: {
  label: string;
  value: number;
  max: number;
  className: string;
  emphasis: Emphasis;
}) {
  const s = barStyles[emphasis];
  return (
    <div className={`flex h-4 items-center gap-2 text-[11px] ${s.row}`}>
      <span className="w-[88px] shrink-0">{label}</span>
      <div className={`flex-1 rounded-full bg-surface-2 transition-[height] duration-200 ${s.track}`}>
        <div
          className={`h-full rounded-full ${className} ${s.fill}`}
          style={{ width: `${Math.max((value / max) * 100, 2)}%` }}
        />
      </div>
      <span className="num w-14 shrink-0 text-right">{fmt(value)}</span>
    </div>
  );
}
