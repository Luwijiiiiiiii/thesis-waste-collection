import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { buttonClasses } from "@/components/ui";
import { ResultsView } from "@/features/results/ResultsView";
import { getSimulation } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function SimulationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getSimulation(id);
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
