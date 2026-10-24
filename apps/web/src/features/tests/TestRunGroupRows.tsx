"use client";
import type { SimulationLogEntry } from "@wcro/core";
import { TSP_SOLVERS } from "@wcro/core";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui";
import { fmt, fmtDateTime } from "@/lib/format";

const mean = (values: number[]) => values.reduce((n, v) => n + v, 0) / values.length;

function SavedBadge({ percent }: { percent: number }) {
  return (
    <Badge tone={percent > 0 ? "ok" : percent < 0 ? "danger" : "neutral"}>
      <span className="num">{fmt(percent)}%</span>
    </Badge>
  );
}

/**
 * One "Test all" run as a single History row. Pressing it shows every test of the run underneath,
 * each linking to its own result. Its checkbox selects every test of the run; the tests can also be
 * selected one by one. Renders table rows, so it goes inside a <tbody>.
 */
export function TestRunGroupRows({
  runs,
  selected,
  onToggle,
  tourAnchor,
}: {
  runs: SimulationLogEntry[];
  selected: ReadonlySet<string>;
  /** Selects or deselects the given runs */
  onToggle: (ids: string[], on: boolean) => void;
  /** Marks the row button as the target of the History tour step */
  tourAnchor?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const groupBox = useRef<HTMLInputElement>(null);
  const newest = runs[0];
  const solvers = new Set(runs.map((r) => r.solver));
  const solver = solvers.size === 1 ? TSP_SOLVERS.find((x) => x.value === newest.solver) : undefined;

  const ids = runs.map((r) => r.id);
  const count = ids.filter((id) => selected.has(id)).length;
  const all = count === ids.length;
  useEffect(() => {
    if (groupBox.current) groupBox.current.indeterminate = count > 0 && !all;
  }, [count, all]);

  return (
    <>
      <tr className={count > 0 ? "bg-surface-2/70" : "bg-surface-2/40"}>
        <td>
          <input
            ref={groupBox}
            type="checkbox"
            checked={all}
            onChange={() => onToggle(ids, !all)}
            aria-label={`Select all ${runs.length} tests of the test run from ${fmtDateTime(newest.createdAt)}`}
            className="size-4 accent-[var(--brand)]"
          />
        </td>
        <td>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            data-tour={tourAnchor ? "history-open" : undefined}
            className="flex items-center gap-2 rounded-lg text-left font-medium text-brand-ink hover:underline"
          >
            <ChevronRight className={`size-4 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} aria-hidden />
            <span>
              Test run
              <span className="block text-xs font-normal text-muted">
                {fmtDateTime(newest.createdAt)}
                <span className="ml-2">
                  <Badge tone="warn">Test</Badge>
                </span>
              </span>
            </span>
          </button>
        </td>
        <td className="font-medium">
          {runs.length} {runs.length === 1 ? "test" : "tests"}
          <p className="text-xs font-normal text-muted">{open ? "Hide the list" : "Show the list"}</p>
        </td>
        <td className="num text-right">
          {fmt(mean(runs.map((r) => r.collectionPoints)), 1)}
          <p className="text-xs text-muted">avg</p>
        </td>
        <td>{solver ? <Badge>{solver.label}</Badge> : "—"}</td>
        <td className="num text-right">
          {fmt(mean(runs.map((r) => r.traditionalKm)))} km
          <p className="text-xs text-muted">avg</p>
        </td>
        <td className="num text-right">
          {fmt(mean(runs.map((r) => r.optimizedKm)))} km
          <p className="text-xs text-muted">avg</p>
        </td>
        <td className="text-right">
          <SavedBadge percent={mean(runs.map((r) => r.distanceSavingsPercent))} />
          <p className="text-xs text-muted">avg</p>
        </td>
      </tr>
      {open &&
        runs.map((s) => (
          <tr key={s.id} className={selected.has(s.id) ? "bg-surface-2/70" : undefined}>
            <td>
              <input
                type="checkbox"
                checked={selected.has(s.id)}
                onChange={() => onToggle([s.id], !selected.has(s.id))}
                aria-label={`Select ${s.id}`}
                className="size-4 accent-[var(--brand)]"
              />
            </td>
            <td className="pl-10">
              <Link href={`/simulations/${s.id}`} className="num font-medium text-brand-ink hover:underline">
                {s.id}
              </Link>
              <p className="text-xs text-muted">{fmtDateTime(s.createdAt)}</p>
            </td>
            <td className="font-medium">{s.routeName}</td>
            <td className="num text-right">{s.collectionPoints}</td>
            <td>
              <Badge>{TSP_SOLVERS.find((x) => x.value === s.solver)?.label ?? "—"}</Badge>
            </td>
            <td className="num text-right">{fmt(s.traditionalKm)} km</td>
            <td className="num text-right">{fmt(s.optimizedKm)} km</td>
            <td className="text-right">
              <SavedBadge percent={s.distanceSavingsPercent} />
            </td>
          </tr>
        ))}
    </>
  );
}
