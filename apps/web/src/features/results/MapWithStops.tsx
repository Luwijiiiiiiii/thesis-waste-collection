"use client";
// Map + visiting order for either route; picking a stop flies the map to it
import { useState } from "react";
import type { RouteKind, SimulationResult } from "@wcro/core";
import { Home, MapPin } from "lucide-react";
import { fmt } from "@/lib/format";
import { RouteMapLoader } from "./RouteMapLoader";

const ORDERS: { kind: RouteKind; label: string }[] = [
  { kind: "optimized", label: "Optimized" },
  { kind: "traditional", label: "Traditional" },
];

export function MapWithStops({ result }: { result: SimulationResult }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [kind, setKind] = useState<RouteKind>("optimized");
  const route = result[kind];
  const seq = route.visitSequence;
  const isOpt = kind === "optimized";

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        <RouteMapLoader result={result} activeId={activeId} orderKind={kind} />
      </div>

      <div className="flex min-h-0 flex-col rounded-xl border border-line lg:h-[560px]">
        <div className="space-y-3 border-b border-line px-4 py-3">
          <fieldset className="grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-1">
            <legend className="sr-only">Visiting order to show</legend>
            {ORDERS.map((o) => (
              <label
                key={o.kind}
                className={`grid min-h-9 cursor-pointer place-items-center rounded-md text-sm font-medium transition-colors duration-200 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand ${
                  kind === o.kind
                    ? `bg-surface shadow-card ${o.kind === "optimized" ? "text-optimized" : "text-traditional"}`
                    : "text-muted hover:text-ink"
                }`}
              >
                <input
                  type="radio"
                  name="visiting-order"
                  value={o.kind}
                  checked={kind === o.kind}
                  onChange={() => setKind(o.kind)}
                  className="sr-only"
                />
                {o.label}
              </label>
            ))}
          </fieldset>
          <div>
            <h3 className="text-sm font-semibold">
              {isOpt ? "Optimized visiting order" : "Traditional visiting order"}{" "}
              <span className="num font-normal text-muted">· {fmt(route.metrics.distanceKm)} km</span>
            </h3>
            <p className="text-xs text-muted">
              {isOpt ? "Order chosen by the TSP solver." : "Order from the route file."} Select a stop to find it on the
              map.
            </p>
          </div>
        </div>
        <ol className="max-h-72 flex-1 divide-y divide-line overflow-y-auto lg:max-h-none">
          {seq.map((stop, i) => {
            const isGarage = stop.role === "garage";
            const seg = route.segments[i];
            const active = stop.id === activeId;
            return (
              <li key={isGarage && i > 0 ? `${stop.id}-return` : stop.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(stop.id)}
                  aria-pressed={active}
                  className={`flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-200 ${
                    active ? "bg-brand-soft" : "hover:bg-surface-2"
                  }`}
                >
                  <span
                    className={`num grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white ${
                      isGarage
                        ? "bg-[#0f172a] dark:bg-slate-600"
                        : isOpt
                          ? "bg-optimized-solid"
                          : "bg-traditional-solid"
                    }`}
                    aria-hidden
                  >
                    {isGarage ? <Home className="size-3" /> : i}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {stop.name}
                      {isGarage && i > 0 && <span className="font-normal text-muted"> (return)</span>}
                    </span>
                    {seg && <span className="num block text-xs text-muted">next: {fmt(seg.distanceM / 1000)} km</span>}
                  </span>
                  <MapPin className="size-4 shrink-0 text-muted" aria-hidden />
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
