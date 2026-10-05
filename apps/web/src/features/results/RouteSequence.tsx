// Route summaries (notebook CELLS 17 and 22)
import { TSP_SOLVERS, type RouteResult } from "@wcro/core";
import { Badge } from "@/components/ui";
import { fmt, fmtInt } from "@/lib/format";

export function RouteSequence({ route }: { route: RouteResult }) {
  const isOpt = route.kind === "optimized";
  const solver = TSP_SOLVERS.find((s) => s.value === route.solver);
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <div
        className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 ${isOpt ? "bg-optimized-soft" : "bg-traditional-soft"}`}
      >
        <h3 className={`text-sm font-semibold ${isOpt ? "text-optimized" : "text-traditional"}`}>
          {isOpt ? "Optimized route" : "Simulated traditional route"}
        </h3>
        <Badge tone={isOpt ? "ok" : "traditional"}>{isOpt ? (solver?.label ?? "A*") : "File order + A*"}</Badge>
      </div>
      <dl className="grid grid-cols-3 gap-2 border-b border-line px-4 py-3 text-center text-xs text-muted">
        <div>
          <dt>Distance</dt>
          <dd className="num text-base font-semibold text-ink">{fmt(route.metrics.distanceKm)} km</dd>
        </div>
        <div>
          <dt>Road segments</dt>
          <dd className="num text-base font-semibold text-ink">{route.segments.length}</dd>
        </div>
        <div>
          <dt>Graph nodes</dt>
          <dd className="num text-base font-semibold text-ink">{fmtInt(route.nodesUsed)}</dd>
        </div>
      </dl>
      <ol className="px-4 py-4 text-sm">
        {route.visitSequence.map((stop, i) => {
          const seg = route.segments[i];
          const isGarage = stop.role === "garage";
          return (
            <li key={isGarage && i > 0 ? `${stop.id}-return` : stop.id} className="relative flex gap-3 pb-4 last:pb-0">
              {i < route.visitSequence.length - 1 && (
                <span
                  className={`absolute left-[11px] top-6 h-full w-px ${isOpt ? "bg-optimized/40" : "bg-traditional/40"}`}
                />
              )}
              <span
                className={`num relative z-10 grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white ${
                  isGarage ? "bg-[#0f172a] dark:bg-slate-600" : isOpt ? "bg-optimized-solid" : "bg-traditional-solid"
                }`}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`leading-6 ${isGarage ? "font-medium" : ""}`}>
                  {stop.name}
                  {isGarage && i > 0 && <span className="text-muted"> (return)</span>}
                </p>
                {seg && <p className="num text-xs text-muted">then {fmt(seg.distanceM / 1000)} km</p>}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="border-t border-line bg-surface-2/50 px-4 py-2 text-xs text-muted">
        Computed in <span className="num">{fmtInt(route.computeTimeMs)}</span> ms
      </p>
    </div>
  );
}
