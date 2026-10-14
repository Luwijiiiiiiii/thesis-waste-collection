"use client";
import { type SimulationLogEntry, TSP_SOLVERS } from "@wcro/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { Badge, Table } from "@/components/ui";
import { clearSimulations, deleteSimulations } from "@/lib/api";
import { fmt, fmtDateTime } from "@/lib/format";

const plural = (n: number) => `${n} ${n === 1 ? "run" : "runs"}`;

/** The History table with row checkboxes, "Delete selected" and "Clear history". */
export function HistoryTable({ sims }: { sims: SimulationLogEntry[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allBox = useRef<HTMLInputElement>(null);

  // Drop ids that are no longer listed (deleted, or gone after a refresh)
  useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(sims.map((s) => s.id));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [sims]);

  const count = selected.size;
  const allSelected = count > 0 && count === sims.length;
  useEffect(() => {
    if (allBox.current) allBox.current.indeterminate = count > 0 && !allSelected;
  }, [count, allSelected]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(sims.map((s) => s.id)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="min-h-11 content-center text-sm text-muted" aria-live="polite">
          {count ? `${plural(count)} selected` : "Select runs to delete them."}
        </p>
        <div className="flex flex-wrap items-start justify-end gap-2">
          {count > 0 && (
            <ConfirmDeleteButton
              warning={`Delete ${plural(count)}?`}
              confirmLabel="Delete"
              onConfirm={async () => {
                await deleteSimulations([...selected]);
                setSelected(new Set());
                router.refresh();
              }}
            >
              Delete selected
            </ConfirmDeleteButton>
          )}
          <ConfirmDeleteButton
            warning={`Delete all ${plural(sims.length)}, tests included?`}
            confirmLabel="Clear history"
            onConfirm={async () => {
              await clearSimulations();
              setSelected(new Set());
              router.refresh();
            }}
          >
            Clear history
          </ConfirmDeleteButton>
        </div>
      </div>

      <div data-tour="history-table">
        <Table>
          <thead>
            <tr>
              <th className="w-10">
                <input
                  ref={allBox}
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all runs"
                  className="size-4 accent-[var(--brand)]"
                />
              </th>
              <th>Simulation</th>
              <th>Route</th>
              <th className="text-right">Points</th>
              <th>Algorithm</th>
              <th className="text-right">Traditional</th>
              <th className="text-right">Optimized</th>
              <th className="text-right">Saved</th>
            </tr>
          </thead>
          <tbody>
            {sims.map((s, i) => (
              <tr key={s.id} className={selected.has(s.id) ? "bg-surface-2/70" : undefined}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggle(s.id)}
                    aria-label={`Select ${s.id}`}
                    className="size-4 accent-[var(--brand)]"
                  />
                </td>
                <td>
                  <Link
                    href={`/simulations/${s.id}`}
                    data-tour={i === 0 ? "history-open" : undefined}
                    className="num font-medium text-brand-ink hover:underline"
                  >
                    {s.id}
                  </Link>
                  <p className="text-xs text-muted">
                    {fmtDateTime(s.createdAt)}
                    {s.isTest && (
                      <span className="ml-2">
                        <Badge tone="warn">Test</Badge>
                      </span>
                    )}
                  </p>
                </td>
                <td className="font-medium">{s.routeName}</td>
                <td className="num text-right">{s.collectionPoints}</td>
                <td>
                  <Badge>{TSP_SOLVERS.find((x) => x.value === s.solver)?.label ?? "—"}</Badge>
                </td>
                <td className="num text-right">{fmt(s.traditionalKm)} km</td>
                <td className="num text-right">{fmt(s.optimizedKm)} km</td>
                <td className="text-right">
                  <Badge
                    tone={s.distanceSavingsPercent > 0 ? "ok" : s.distanceSavingsPercent < 0 ? "danger" : "neutral"}
                  >
                    <span className="num">{fmt(s.distanceSavingsPercent)}%</span>
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
