"use client";
import type { SimulationLogEntry } from "@wcro/core";
import { TSP_SOLVERS } from "@wcro/core";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui";
import { fmt, fmtDateTime } from "@/lib/format";
import { DeleteTestButton } from "./DeleteTestButton";

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
 * each linking to its own result. Renders table rows, so it goes inside a <tbody>.
 */
export function TestRunGroupRows({ runs }: { runs: SimulationLogEntry[] }) {
  const [open, setOpen] = useState(false);
  const newest = runs[0];
  const solvers = new Set(runs.map((r) => r.solver));
  const solver = solvers.size === 1 ? TSP_SOLVERS.find((x) => x.value === newest.solver) : undefined;

  return (
    <>
      <tr className="bg-surface-2/50">
        <td>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
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
        <td />
      </tr>
      {open &&
        runs.map((s) => (
          <tr key={s.id}>
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
            <td className="text-right">
              <DeleteTestButton id={s.id} />
            </td>
          </tr>
        ))}
    </>
  );
}
