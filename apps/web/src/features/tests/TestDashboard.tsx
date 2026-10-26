"use client";
import type { TestRunRecord } from "@wcro/core";
import { METRIC_DEFINITIONS } from "@wcro/metrics";
import { FlaskConical, Play, Square, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, PageHeader, Table } from "@/components/ui";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { clearTestRuns, listTestRuns } from "@/lib/api";
import { fmt, fmtInt } from "@/lib/format";
import { DistanceScatter, GroupBars, SavingsScatter } from "./TestCharts";
import { summarize, summarizeByGroup, savingPct } from "./stats";
import { useTestAll } from "./useTestAll";

export function TestDashboard({ initial, initialError }: { initial: TestRunRecord[]; initialError: string | null }) {
  const [runs, setRuns] = useState(initial);
  const [loadError, setLoadError] = useState(initialError);

  const reload = useCallback(() => {
    listTestRuns()
      .then((r) => {
        setRuns(r);
        setLoadError(null);
      })
      .catch((err: Error) => setLoadError(err.message));
  }, []);

  const { state, start, cancel, reset } = useTestAll(reload);
  const clear = async () => {
    await clearTestRuns();
    reset();
    reload();
  };
  const overall = useMemo(() => summarize(runs), [runs]);
  const groups = useMemo(() => summarizeByGroup(runs), [runs]);
  const percent = state.total ? Math.round((state.done / state.total) * 100) : 0;

  return (
    <div className="animate-rise space-y-6">
      <PageHeader
        eyebrow="Testing"
        title="Test dashboard"
        description="Runs every bundled test route one by one and combines the results. Each run is saved to History as a test. Clear the test data before testing again to start from a clean slate."
        actions={
          <div className="flex flex-wrap items-start justify-end gap-2">
            {runs.length > 0 && (
              <ConfirmDeleteButton
                warning={`Delete all ${fmtInt(runs.length)} test runs?`}
                confirmLabel="Clear test data"
                onConfirm={clear}
                disabled={state.running}
              >
                Clear test data
              </ConfirmDeleteButton>
            )}
            {state.running ? (
              <Button onClick={cancel}>
                <Square className="size-4" aria-hidden />
                Stop
              </Button>
            ) : (
              <Button variant="primary" onClick={start}>
                <Play className="size-4" aria-hidden />
                {runs.length > 0 ? "Test all again" : "Test all"}
              </Button>
            )}
          </div>
        }
      />

      {(state.running || state.done > 0 || state.fatal) && (
        <Card>
          <CardBody className="space-y-3">
            {state.fatal ? (
              <p className="text-sm text-danger">{state.fatal}</p>
            ) : (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <p className="font-medium" aria-live="polite">
                    {state.running
                      ? state.resumeAt
                        ? `Paused at test ${state.done + 1} of ${state.total} while your API calls refresh. Resuming at ${new Date(state.resumeAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                        : `Running test ${Math.min(state.done + 1, state.total)} of ${state.total}`
                      : state.cancelled
                        ? `Stopped after ${state.done} of ${state.total}`
                        : `Finished ${state.done} of ${state.total}`}
                  </p>
                  {state.current && <p className="min-w-0 truncate text-muted">{state.current}</p>}
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-surface-2"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percent}
                  aria-label="Test all progress"
                >
                  <div
                    className="h-full rounded-full bg-brand transition-[width] duration-200"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </>
            )}
            {state.failures.length > 0 && (
              <div className="rounded-xl bg-danger-soft p-3 text-sm text-danger">
                <p className="font-medium">
                  {state.failures.length} {state.failures.length === 1 ? "test" : "tests"} did not finish
                </p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {state.failures.slice(0, 10).map((f) => (
                    <li key={f.file} className="break-words">
                      <span className="num">{f.file}</span>: {f.message}
                    </li>
                  ))}
                  {state.failures.length > 10 && <li>and {state.failures.length - 10} more</li>}
                </ul>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {loadError && (
        <Card>
          <EmptyState
            icon={<TriangleAlert className="size-7" />}
            title="Could not load the test results"
            description={loadError}
            action={<Button onClick={reload}>Try again</Button>}
          />
        </Card>
      )}

      {!loadError && runs.length === 0 && (
        <Card>
          <EmptyState
            icon={<FlaskConical className="size-7" />}
            title="No test results yet"
            description="Press Test all to run every bundled test route. The charts and averages appear here as results come in."
          />
        </Card>
      )}

      {runs.length > 0 && (
        <>
          <section aria-label="Average results" className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold tracking-tight">Averages across {fmtInt(overall.count)} tests</h2>
              <p className="text-sm text-muted">
                Average {fmt(overall.avgPoints, 1)} collection points per test. Saving is each test's own percentage,
                averaged.
              </p>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {METRIC_DEFINITIONS.map((m) => {
                const t = overall.traditional[m.metric];
                const o = overall.optimized[m.metric];
                const saved = t === 0 ? 0 : ((t - o) / t) * 100;
                return (
                  <div key={m.metric} className="rounded-2xl border border-line bg-surface p-4 shadow-card">
                    <dt className="text-sm text-muted">{m.label}</dt>
                    <dd className="mt-1">
                      <span className="num text-2xl font-semibold text-optimized">{fmt(o)}</span>
                      <span className="ml-1 text-xs text-muted">{m.unit} A* Pathfinding Routes</span>
                    </dd>
                    <p className="num mt-0.5 text-sm text-traditional">
                      {fmt(t)} <span className="text-xs text-muted">{m.unit} traditional</span>
                    </p>
                    <p className="mt-2">
                      <Badge tone={saved > 0 ? "ok" : saved < 0 ? "danger" : "neutral"}>
                        <span className="num">{fmt(saved)}% saved</span>
                      </Badge>
                    </p>
                  </div>
                );
              })}
            </dl>
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader
                title="Distance by test size"
                description="Every test, traditional against A* Pathfinding Routes."
              />
              <CardBody>
                <DistanceScatter records={runs} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader
                title="Distance saved per test"
                description="The dashed lines are the average of each size group."
              />
              <CardBody>
                <SavingsScatter records={runs} />
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Average distance by group"
              description="Low is 10 or fewer collection points, mid is 11 to 19, many is 20 or more."
            />
            <CardBody>
              <div className="grid items-start gap-6 lg:grid-cols-2">
                <GroupBars records={runs} />
                <Table>
                  <thead>
                    <tr>
                      <th>Group</th>
                      <th className="text-right">Tests</th>
                      <th className="text-right">Avg points</th>
                      <th className="text-right">Avg traditional</th>
                      <th className="text-right">Avg A* Pathfinding Routes</th>
                      <th className="text-right">Avg saved</th>
                      <th className="text-right">Best / worst</th>
                      <th className="text-right">Avg solve time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ...groups.map((g) => ({ label: g.label, range: g.range, s: g.summary })),
                      { label: "All", range: "every test", s: overall },
                    ].map(({ label, range, s }) => (
                      <tr key={label}>
                        <td>
                          <p className="font-medium">{label}</p>
                          <p className="text-xs text-muted">{range}</p>
                        </td>
                        <td className="num text-right">{s.count}</td>
                        {s.count === 0 ? (
                          <td colSpan={6} className="text-right text-muted">
                            No tests in this group
                          </td>
                        ) : (
                          <>
                            <td className="num text-right">{fmt(s.avgPoints, 1)}</td>
                            <td className="num text-right">{fmt(s.traditional.distanceKm)} km</td>
                            <td className="num text-right">{fmt(s.optimized.distanceKm)} km</td>
                            <td className="num text-right">{fmt(s.avgSavingPct)}%</td>
                            <td className="num text-right">
                              {fmt(s.bestSavingPct)}% / {fmt(s.worstSavingPct)}%
                            </td>
                            <td className="num text-right">{fmt(s.avgOptimizedComputeMs, 0)} ms</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>

          <p className="text-sm text-muted">
            {fmtInt(runs.length)} test runs are saved. Testing again adds new runs next to these, so use Clear test data
            first if you only want the latest results. Single runs can be deleted in{" "}
            <Link href="/simulations" className="font-medium text-brand-ink hover:underline">
              History
            </Link>
            .{" "}
            {runs.some((r) => savingPct(r) < 0) &&
              "Some tests have a negative saving, which means the A* Pathfinding Routes were longer."}
          </p>
        </>
      )}
    </div>
  );
}
