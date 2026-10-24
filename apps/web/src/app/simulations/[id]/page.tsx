import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { buttonClasses, Card, EmptyState, PageHeader } from "@/components/ui";
import { ResultsView } from "@/features/results/ResultsView";
import { getSimulation } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function SimulationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let result: Awaited<ReturnType<typeof getSimulation>>;
  try {
    result = await getSimulation(id);
  } catch (err) {
    return (
      <div className="animate-rise space-y-6">
        <PageHeader eyebrow="History" title="Simulation" />
        <Card>
          <EmptyState
            icon={<TriangleAlert className="size-7" />}
            title="Could not load this simulation"
            description={(err as Error).message}
            action={
              <Link href="/simulations" className={buttonClasses("secondary", "md")}>
                <ArrowLeft className="size-4" aria-hidden />
                History
              </Link>
            }
          />
        </Card>
      </div>
    );
  }
  if (!result) notFound();
  return (
    <ResultsView
      result={result}
      actions={
        <Link href="/simulations" className={buttonClasses("secondary", "md")}>
          <ArrowLeft className="size-4" aria-hidden />
          History
        </Link>
      }
    />
  );
}
