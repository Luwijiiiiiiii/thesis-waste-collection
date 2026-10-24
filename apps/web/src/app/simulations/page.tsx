// Simulation log – every archived run (notebook "Simulation logging")
import Link from "next/link";
import { ArrowRight, History, Plus, TriangleAlert } from "lucide-react";
import { ScreenTour } from "@/components/Tour";
import { buttonClasses, Card, CardBody, EmptyState, PageHeader } from "@/components/ui";
import { fmt } from "@/lib/format";
import { historyTour } from "@/features/onboarding/tours";
import { HistoryTable } from "@/features/history/HistoryTable";
import { listSimulations } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function SimulationsPage() {
  let sims: Awaited<ReturnType<typeof listSimulations>>;
  try {
    sims = await listSimulations();
  } catch (err) {
    return (
      <div className="animate-rise space-y-6">
        <PageHeader eyebrow="History" title="Simulation log" />
        <Card>
          <EmptyState
            icon={<TriangleAlert className="size-7" />}
            title="Could not load the simulation log"
            description={(err as Error).message}
          />
        </Card>
      </div>
    );
  }
  const avg = sims.length ? sims.reduce((n, s) => n + s.distanceSavingsPercent, 0) / sims.length : 0;
  const best = sims.reduce<(typeof sims)[number] | null>(
    (b, s) => (b === null || s.distanceSavingsPercent > b.distanceSavingsPercent ? s : b),
    null,
  );

  return (
    <div className="animate-rise space-y-6">
      <ScreenTour tour={historyTour} />
      <PageHeader
        eyebrow="History"
        title="Simulation log"
        description="Every run is archived in the database, newest first. Open one to revisit its map and exports, or select runs to delete them."
        actions={
          <Link href="/#start" data-tour="new-simulation" className={buttonClasses("primary", "md")}>
            <Plus className="size-4" aria-hidden />
            New simulation
          </Link>
        }
      />

      {sims.length === 0 ? (
        <Card>
          <EmptyState
            icon={<History className="size-7" />}
            title="No simulations yet"
            description="Run your first simulation and it will be saved here automatically."
            action={
              <Link href="/#start" className={buttonClasses("primary", "md")}>
                Start a simulation
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          <dl data-tour="history-stats" className="grid gap-3 sm:grid-cols-3">
            <Stat label="Simulations run" value={String(sims.length)} />
            <Stat label="Average distance saved" value={`${fmt(avg)}%`} />
            <Stat label="Best result" value={`${fmt(best?.distanceSavingsPercent ?? 0)}%`} hint={best?.routeName} />
          </dl>

          <Card>
            <CardBody>
              <HistoryTable sims={sims} />
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="num mt-1 text-3xl font-semibold">{value}</dd>
      {hint && <p className="mt-0.5 truncate text-xs text-muted">{hint}</p>}
    </div>
  );
}
