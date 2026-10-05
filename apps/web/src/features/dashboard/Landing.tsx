"use client";
// First screen: explain the tool in one glance and get a file loaded
import Link from "next/link";
import type { SimulationLogEntry } from "@wcro/core";
import { ArrowRight, BarChart3, FileCheck2, FileUp, MapPin, Route } from "lucide-react";
import { Card } from "@/components/ui";
import { fmt, fmtDateTime } from "@/lib/format";
import { DropZone } from "@/features/upload/RouteFileInput";

const steps = [
  {
    icon: FileCheck2,
    title: "Load & validate",
    text: "Upload a route file. It is checked instantly against six rules before anything runs.",
  },
  {
    icon: Route,
    title: "Optimize",
    text: "Stops are snapped to the OpenStreetMap road network, ordered with TSP and routed with A*.",
  },
  {
    icon: BarChart3,
    title: "Compare",
    text: "See distance, time, fuel, cost and CO₂ against a simulated traditional route.",
  },
];

export function Landing({
  recent,
  onLoad,
  onDraw,
}: {
  recent: SimulationLogEntry[];
  onLoad: (fileName: string, text: string) => void;
  onDraw: () => void;
}) {
  return (
    <div className="space-y-10">
      <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
        <div className="animate-rise">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-ink">Baguio City · Decision support</p>
          <h1 className="mt-3 text-4xl font-semibold leading-[1.08] tracking-tight text-balance sm:text-5xl">
            Plan shorter garbage collection routes.
          </h1>
          <p className="mt-4 max-w-xl text-pretty text-base leading-7 text-muted sm:text-lg">
            Compare today&apos;s collection order with an optimized route on real roads, and see exactly how much distance, fuel
            and emissions it saves.
          </p>
        </div>
        <div className="animate-rise [animation-delay:80ms]">
          <div role="group" aria-label="Input method" className="mb-3 inline-flex rounded-xl border border-line bg-surface p-1">
            <button
              type="button"
              aria-pressed="true"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand-soft px-4 text-sm font-medium text-brand-ink"
            >
              <FileUp className="size-4" aria-hidden />
              Upload file
            </button>
            <button
              type="button"
              aria-pressed="false"
              onClick={onDraw}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium text-muted transition-colors duration-200 hover:text-ink"
            >
              <MapPin className="size-4" aria-hidden />
              Draw on map
            </button>
          </div>
          <DropZone onLoad={onLoad} />
        </div>
      </div>

      <ol className="grid gap-3 sm:grid-cols-3">
        {steps.map(({ icon: Icon, title, text }, i) => (
          <li key={title}>
            <Card className="h-full p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand-ink" aria-hidden>
                  <Icon className="size-5" />
                </span>
                <span className="num text-xs font-medium text-muted">Step {i + 1}</span>
              </div>
              <h2 className="mt-3 text-base font-semibold tracking-tight">{title}</h2>
              <p className="mt-1 text-sm leading-6 text-muted">{text}</p>
            </Card>
          </li>
        ))}
      </ol>

      {recent.length > 0 && (
        <section aria-labelledby="recent-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="recent-heading" className="text-base font-semibold tracking-tight">
              Recent simulations
            </h2>
            <Link href="/simulations" className="inline-flex min-h-9 items-center gap-1 text-sm font-medium text-brand-ink hover:underline">
              View all
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-3">
            {recent.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/simulations/${s.id}`}
                  className="block h-full rounded-2xl border border-line bg-surface p-4 shadow-card transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-line-strong"
                >
                  <p className="truncate text-sm font-semibold">{s.routeName}</p>
                  <p className="text-xs text-muted">{fmtDateTime(s.createdAt)}</p>
                  <p className="mt-3 flex items-baseline gap-1.5">
                    <span className="num text-2xl font-semibold text-optimized">{fmt(s.distanceSavingsPercent, 1)}%</span>
                    <span className="text-xs text-muted">shorter</span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
