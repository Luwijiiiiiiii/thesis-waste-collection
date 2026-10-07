"use client";
// First screen: explain the tool in one glance, then get a route loaded
import Link from "next/link";
import { useRef } from "react";
import type { SimulationLogEntry } from "@wcro/core";
import { ArrowDown, ArrowRight, BarChart3, Clock, FileUp, Fuel, Leaf, MousePointerClick, Route } from "lucide-react";
import { HelpButton, useTour } from "@/components/Tour";
import { buttonClasses, Card } from "@/components/ui";
import { fmt, fmtDateTime } from "@/lib/format";
import { landingTour } from "@/features/onboarding/tours";
import { DropZone } from "@/features/upload/RouteFileInput";

const savings = [
  { icon: Route, label: "Distance" },
  { icon: Clock, label: "Time" },
  { icon: Fuel, label: "Fuel & cost" },
  { icon: Leaf, label: "CO₂ emissions" },
];

const steps = [
  {
    icon: FileUp,
    title: "Add your route",
    text: "Upload your route file or mark the stops on a map. It's checked right away, and you'll be told if anything is missing.",
  },
  {
    icon: Route,
    title: "We find a shorter path",
    text: "The tool follows Baguio's real roads and works out the best order to visit every collection point.",
  },
  {
    icon: BarChart3,
    title: "See what you save",
    text: "Compare distance, travel time, fuel, cost and CO₂ side by side with today's route.",
  },
];

// Same garage (G) and stops in both drawings – only the visiting order differs
const G = [30, 120] as const;
const stops = [
  [60, 40],
  [150, 30],
  [100, 80],
  [170, 110],
  [40, 75],
  [120, 125],
] as const;
const toPath = (order: number[]) => `M${G.join(",")} ${order.map((i) => `L${stops[i].join(",")}`).join(" ")} Z`;
const todayPath = toPath([1, 4, 3, 0, 5, 2]);
const optimizedPath = toPath([4, 0, 2, 1, 3, 5]);

function RouteSketch({ path, tone }: { path: string; tone: "traditional" | "optimized" }) {
  const stroke = tone === "optimized" ? "stroke-optimized" : "stroke-brand-ink";
  return (
    <svg viewBox="0 0 200 150" className="h-auto w-full" aria-hidden>
      {/* faint street grid so it reads as a map */}
      <g className="stroke-line" strokeWidth="1.5">
        <path d="M0 55 H200 M0 100 H200 M80 0 V150 M135 0 V150" />
      </g>
      <path
        d={path}
        pathLength={1}
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`${stroke} ${tone === "optimized" ? "route-draw" : ""}`}
        strokeDasharray={tone === "traditional" ? "0.02 0.015" : undefined}
      />
      {stops.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="6" strokeWidth="3" className={`fill-surface ${stroke}`} />
      ))}
      <rect x={G[0] - 9} y={G[1] - 9} width="18" height="18" rx="5" className="fill-ink" />
      <text x={G[0]} y={G[1] + 3.5} textAnchor="middle" fontSize="10" fontWeight="700" className="fill-surface">
        G
      </text>
    </svg>
  );
}

function RouteComparison() {
  return (
    <figure className="rounded-3xl border border-line bg-surface p-4 shadow-pop sm:p-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="rounded-2xl bg-surface-2 p-3">
          <RouteSketch path={todayPath} tone="traditional" />
          <p className="mt-2 text-sm font-semibold sm:text-base">Traditional</p>
          <p className="text-xs leading-5 text-brand-ink sm:text-sm">Zig-zags across town</p>
        </div>
        <div className="rounded-2xl bg-optimized-soft p-3">
          <RouteSketch path={optimizedPath} tone="optimized" />
          <p className="mt-2 text-sm font-semibold sm:text-base">A*</p>
          <p className="text-xs leading-5 text-optimized sm:text-sm">One smooth loop</p>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs leading-5 text-muted sm:text-sm">
        Same truck, same stops (<span className="font-semibold text-ink">G</span> = garage) — just a smarter order.
      </figcaption>
    </figure>
  );
}

export function Landing({
  recent,
  onLoad,
  onDraw,
}: {
  recent: SimulationLogEntry[];
  onLoad: (fileName: string, text: string) => void;
  onDraw: () => void;
}) {
  // First visit: the tour starts when the user reaches "Start here"
  const startRef = useRef<HTMLElement>(null);
  useTour(landingTour, startRef);

  return (
    <div className="space-y-12 sm:space-y-16">
      {/* ---------- Hero ---------- */}
      <section
        aria-labelledby="hero-heading"
        className="relative overflow-hidden rounded-3xl border border-line px-5 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16"
        style={{
          background:
            "radial-gradient(90% 70% at 0% 0%, var(--brand-soft), transparent 70%), radial-gradient(70% 60% at 100% 100%, var(--optimized-soft), transparent 70%), var(--surface)",
        }}
      >
        <div className="animate-rise">
          <h1
            id="hero-heading"
            className="mt-5 max-w-5xl text-[2.75rem] font-bold leading-[1.04] tracking-tight text-balance sm:text-6xl xl:text-7xl"
          >
            Plan <span className="text-optimized">shorter</span> garbage collection routes.
          </h1>
        </div>

        <div className="mt-8 grid items-center gap-10 lg:mt-10 lg:grid-cols-[1fr_minmax(0,460px)] lg:gap-14">
          <div className="animate-rise [animation-delay:60ms]">
            <p className="max-w-2xl text-pretty text-lg leading-8 text-muted sm:text-xl sm:leading-9">
              Compare today&apos;s collection order with an optimized route on real roads, and see exactly how much
              distance, fuel and emissions it saves.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              <a href="#start" className={buttonClasses("primary", "lg", "min-h-14 px-7 text-lg")}>
                Get started
                <ArrowDown className="size-5" aria-hidden />
              </a>
              <p className="text-sm text-muted">No route file? You can use our Baguio sample.</p>
            </div>

            <div className="mt-10">
              <p className="text-sm font-medium text-muted">You&apos;ll see how much you save on:</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {savings.map(({ icon: Icon, label }) => (
                  <li
                    key={label}
                    className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium sm:text-base"
                  >
                    <Icon className="size-4 text-optimized sm:size-5" aria-hidden />
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="animate-rise [animation-delay:120ms]">
            <RouteComparison />
          </div>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section aria-labelledby="how-heading">
        <h2 id="how-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
          How it works
        </h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {steps.map(({ icon: Icon, title, text }, i) => (
            <li key={title}>
              <Card className="h-full p-6">
                <div className="flex items-center gap-3">
                  <span
                    className="num grid size-9 place-items-center rounded-full bg-brand text-sm font-semibold text-white"
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <Icon className="size-6 text-brand-ink" aria-hidden />
                </div>
                <h3 className="mt-4 text-lg font-semibold tracking-tight">
                  <span className="sr-only">Step {i + 1}: </span>
                  {title}
                </h3>
                <p className="mt-2 text-base leading-7 text-muted">{text}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- Start: add a route ---------- */}
      <section ref={startRef} id="start" aria-labelledby="start-heading" className="scroll-mt-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-ink">Start here</p>
          <h2 id="start-heading" className="mt-2 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Add the route you want to improve
          </h2>
          <p className="mt-3 text-pretty text-base leading-7 text-muted sm:text-lg">
            Pick whichever is easier for you. You can always change it later.
          </p>
          <HelpButton label className="mt-2" />
        </div>

        <div className="mt-8 grid items-stretch gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-6">
          <fieldset
            aria-label="How do you want to add your route?"
            className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-1 lg:content-start"
          >
            <button
              type="button"
              aria-pressed="true"
              data-tour="upload-card"
              className="flex min-h-11 items-start gap-4 rounded-2xl border-2 border-brand bg-brand-soft p-5 text-left"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand text-white" aria-hidden>
                <FileUp className="size-6" />
              </span>
              <span>
                <span className="block text-lg font-semibold leading-6">Upload a file</span>
                <span className="mt-1 block text-sm leading-6 text-muted">
                  Already have a route file? Drop it in the box.
                </span>
              </span>
            </button>
            <button
              type="button"
              aria-pressed="false"
              onClick={onDraw}
              data-tour="draw-card"
              className="group flex min-h-11 items-start gap-4 rounded-2xl border-2 border-line bg-surface p-5 text-left transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-line-strong"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink" aria-hidden>
                <MousePointerClick className="size-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-lg font-semibold leading-6">
                  Draw on the map
                  <ArrowRight
                    className="size-4 text-muted transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
                <span className="mt-1 block text-sm leading-6 text-muted">
                  No file? Click on the map to place the garage and each pickup point.
                </span>
              </span>
            </button>
          </fieldset>

          <div data-tour="dropzone" className="grid">
            <DropZone onLoad={onLoad} />
          </div>
        </div>
      </section>

      {recent.length > 0 && (
        <section aria-labelledby="recent-heading" data-tour="recent">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="recent-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
              Your recent results
            </h2>
            <Link
              href="/simulations"
              className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-ink hover:underline"
            >
              View all
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <ul className="grid gap-4 sm:grid-cols-3">
            {recent.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/simulations/${s.id}`}
                  className="block h-full rounded-2xl border border-line bg-surface p-5 shadow-card transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-line-strong"
                >
                  <p className="truncate text-base font-semibold">{s.routeName}</p>
                  <p className="text-sm text-muted">{fmtDateTime(s.createdAt)}</p>
                  <p className="mt-3 flex items-baseline gap-1.5">
                    <span className="num text-3xl font-semibold text-optimized">{fmt(s.distanceSavingsPercent)}%</span>
                    <span className="text-sm text-muted">shorter</span>
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
