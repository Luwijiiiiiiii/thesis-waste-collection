"use client";
import { ArrowDown, ArrowUp, Home, Trash2 } from "lucide-react";
import type { DraftAction, DraftPoint, RouteDraft } from "@wcro/core";

const iconButton =
  "grid size-10 shrink-0 place-items-center rounded-lg text-muted transition-colors duration-200 hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-30";

const coords = (p: DraftPoint) => `${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}`;

export function StopList({ draft, onAction }: { draft: RouteDraft; onAction: (a: DraftAction) => void }) {
  if (!draft.garage && draft.stops.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-sm text-muted">
        Nothing placed yet. Tap the map to place the garage.
      </p>
    );
  }
  return (
    <ol className="divide-y divide-line rounded-xl border border-line">
      {draft.garage && (
        <li className="flex items-center gap-3 px-3 py-1.5">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#0f172a] text-white dark:bg-slate-600" aria-hidden>
            <Home className="size-3" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">Garage</span>
            <span className="num block break-words text-xs text-muted">{coords(draft.garage)}</span>
          </span>
          <button type="button" className={iconButton} aria-label="Delete Garage" onClick={() => onAction({ type: "remove", id: "garage" })}>
            <Trash2 className="size-4" aria-hidden />
          </button>
        </li>
      )}
      {draft.stops.map((s, i) => (
        <li key={s.id} className="flex items-center gap-3 px-3 py-1.5">
          <span className="num grid size-6 shrink-0 place-items-center rounded-full bg-brand text-[11px] font-semibold text-white" aria-hidden>
            {i + 1}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">Stop {i + 1}</span>
            <span className="num block break-words text-xs text-muted">{coords(s)}</span>
          </span>
          <button
            type="button"
            className={iconButton}
            aria-label={`Move Stop ${i + 1} up`}
            disabled={i === 0}
            onClick={() => onAction({ type: "reorder", id: s.id, direction: "up" })}
          >
            <ArrowUp className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            className={iconButton}
            aria-label={`Move Stop ${i + 1} down`}
            disabled={i === draft.stops.length - 1}
            onClick={() => onAction({ type: "reorder", id: s.id, direction: "down" })}
          >
            <ArrowDown className="size-4" aria-hidden />
          </button>
          <button type="button" className={iconButton} aria-label={`Delete Stop ${i + 1}`} onClick={() => onAction({ type: "remove", id: s.id })}>
            <Trash2 className="size-4" aria-hidden />
          </button>
        </li>
      ))}
    </ol>
  );
}
