"use client";
// Map + ordered stop list; picking a stop flies the map to it
import { useState } from "react";
import type { SimulationResult } from "@wcro/core";
import { Home, MapPin } from "lucide-react";
import { fmt } from "@/lib/format";
import { RouteMapLoader } from "./RouteMapLoader";

export function MapWithStops({ result }: { result: SimulationResult }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const seq = result.optimized.visitSequence;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        <RouteMapLoader result={result} activeId={activeId} />
      </div>

      <div className="flex min-h-0 flex-col rounded-xl border border-line lg:h-[560px]">
        <div className="border-b border-line px-4 py-3">
          <h3 className="text-sm font-semibold">Optimized visiting order</h3>
          <p className="text-xs text-muted">Select a stop to find it on the map.</p>
        </div>
        <ol className="max-h-72 flex-1 divide-y divide-line overflow-y-auto lg:max-h-none">
          {seq.map((stop, i) => {
            const isGarage = stop.role === "garage";
            const seg = result.optimized.segments[i];
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
                      isGarage ? "bg-[#0f172a] dark:bg-slate-600" : "bg-optimized-solid"
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
