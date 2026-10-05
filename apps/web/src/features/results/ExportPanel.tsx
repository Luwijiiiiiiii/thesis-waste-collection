"use client";
// CSV / JSON / GeoJSON export (replaces the WasteCollectionOutputs folders)
import type { SimulationResult } from "@wcro/core";
import {
  comparisonCsv,
  nodeRegistryCsv,
  routeJson,
  routeSegmentsCsv,
  simulationGeoJson,
} from "@wcro/exports";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui";
import { downloadText } from "@/lib/download";

interface ExportItem {
  label: string;
  format: string;
  run: () => void;
}

export function ExportPanel({ result }: { result: SimulationResult }) {
  const p = `simulation_${result.id}`;
  const groups: { title: string; hint: string; items: ExportItem[] }[] = [
    {
      title: "Tables",
      hint: "For spreadsheets and your manuscript",
      items: [
        { label: "Comparison table", format: "CSV", run: () => downloadText(`${p}_comparison.csv`, comparisonCsv(result.comparison), "text/csv") },
        { label: "Node registry", format: "CSV", run: () => downloadText(`${p}_node_registry.csv`, nodeRegistryCsv(result.nodeRegistry), "text/csv") },
        { label: "Traditional segments", format: "CSV", run: () => downloadText(`${p}_traditional_segments.csv`, routeSegmentsCsv(result.traditional), "text/csv") },
        { label: "Optimized segments", format: "CSV", run: () => downloadText(`${p}_optimized_segments.csv`, routeSegmentsCsv(result.optimized), "text/csv") },
      ],
    },
    {
      title: "Routes & maps",
      hint: "For GIS software and reuse",
      items: [
        { label: "Traditional route", format: "JSON", run: () => downloadText(`${p}_simulated_traditional_route.json`, routeJson(result.traditional), "application/json") },
        { label: "Optimized route", format: "JSON", run: () => downloadText(`${p}_optimized_route.json`, routeJson(result.optimized), "application/json") },
        { label: "Map layers", format: "GeoJSON", run: () => downloadText(`${p}.geojson`, simulationGeoJson(result), "application/geo+json") },
      ],
    },
    {
      title: "Archive",
      hint: "Everything in one file",
      items: [
        { label: "Full simulation log", format: "JSON", run: () => downloadText(`${p}.json`, JSON.stringify(result, null, 2), "application/json") },
      ],
    },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {groups.map((g) => (
        <section key={g.title}>
          <h3 className="text-sm font-semibold">{g.title}</h3>
          <p className="mb-3 text-xs text-muted">{g.hint}</p>
          <ul className="space-y-2">
            {g.items.map((it) => (
              <li key={it.label}>
                <button
                  type="button"
                  onClick={it.run}
                  className="group flex min-h-12 w-full items-center gap-3 rounded-xl border border-line bg-surface px-3.5 text-left text-sm font-medium transition-colors duration-200 hover:border-line-strong hover:bg-surface-2"
                >
                  <span className="min-w-0 flex-1 truncate">{it.label}</span>
                  <Badge>{it.format}</Badge>
                  <Download className="size-4 shrink-0 text-muted transition-colors group-hover:text-brand-ink" aria-hidden />
                  <span className="sr-only">Download</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
