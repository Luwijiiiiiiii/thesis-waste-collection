"use client";
// Interactive route map (replaces the planned Folium visualization)
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import type { LatLng, RegisteredStop, SimulationResult } from "@wcro/core";
import { BaseTileLayer } from "@/components/BaseTileLayer";
import { WHEEL_ZOOM } from "@/lib/mapZoom";
import { fmt } from "@/lib/format";

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length) map.fitBounds(L.latLngBounds(points), { padding: [36, 36] });
  }, [map, points]);
  return null;
}

/** Fly to the stop picked in the sidebar list */
function FlyTo({ target }: { target: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, Math.max(map.getZoom(), 16), { duration: 0.6 });
  }, [map, target]);
  return null;
}

const stopIcon = (label: string, garage: boolean, active: boolean) =>
  L.divIcon({
    className: "",
    html: `<div class="stop-marker ${garage ? "stop-marker--garage" : "stop-marker--point"} ${active ? "stop-marker--active" : ""}" style="width:${garage ? 28 : 24}px;height:${garage ? 28 : 24}px">${label}</div>`,
    iconSize: garage ? [28, 28] : [24, 24],
    iconAnchor: garage ? [14, 14] : [12, 12],
  });

export default function RouteMap({
  result,
  activeId = null,
  heightClass = "h-[420px] lg:h-[560px]",
}: {
  result: SimulationResult;
  activeId?: string | null;
  heightClass?: string;
}) {
  const [show, setShow] = useState({ traditional: true, optimized: true });
  const stops: RegisteredStop[] = useMemo(
    () => [result.nodeRegistry.garage, ...result.nodeRegistry.collectionPoints],
    [result],
  );
  // Number each point by its position in the optimized sequence
  const order = useMemo(() => {
    const m = new Map<string, number>();
    result.optimized.visitSequence.forEach((s, i) => {
      if (s.role !== "garage" && !m.has(s.id)) m.set(s.id, i);
    });
    return m;
  }, [result]);
  const bounds = useMemo<LatLng[]>(
    () => [...stops.map((s) => [s.latitude, s.longitude] as LatLng), ...result.optimized.path],
    [stops, result],
  );
  const target = useMemo<LatLng | null>(() => {
    const s = stops.find((x) => x.id === activeId);
    return s ? [s.latitude, s.longitude] : null;
  }, [stops, activeId]);

  return (
    <div className="relative">
      <fieldset className="absolute right-3 top-3 z-[500] min-w-0 space-y-0.5 rounded-xl border border-line bg-surface/95 p-1.5 text-sm shadow-pop backdrop-blur">
        <legend className="sr-only">Map layers</legend>
        <LayerToggle
          checked={show.optimized}
          onChange={(v) => setShow((s) => ({ ...s, optimized: v }))}
          swatch={<span className="h-1 w-6 rounded bg-optimized-solid" />}
          label="Optimized"
        />
        <LayerToggle
          checked={show.traditional}
          onChange={(v) => setShow((s) => ({ ...s, traditional: v }))}
          swatch={<span className="h-1 w-6 rounded border-t-2 border-dashed border-brand-ink" />}
          label="Traditional"
        />
      </fieldset>
      <MapContainer
        center={bounds[0] ?? [16.4123, 120.596]}
        zoom={14}
        {...WHEEL_ZOOM}
        className={`${heightClass} w-full rounded-xl border border-line`}
      >
        <BaseTileLayer />
        <FitBounds points={bounds} />
        <FlyTo target={target} />
        {show.traditional && (
          <Polyline
            positions={result.traditional.path}
            pathOptions={{ color: "#2563eb", weight: 5, opacity: 0.6, dashArray: "8 7" }}
          />
        )}
        {show.optimized && (
          <Polyline positions={result.optimized.path} pathOptions={{ color: "#059669", weight: 5, opacity: 0.95 }} />
        )}
        {stops.map((s) => (
          <Marker
            key={s.id}
            position={[s.latitude, s.longitude]}
            zIndexOffset={s.id === activeId ? 1000 : 0}
            icon={stopIcon(
              s.role === "garage" ? "G" : String(order.get(s.id) ?? "•"),
              s.role === "garage",
              s.id === activeId,
            )}
          >
            <Popup>
              <div className="space-y-0.5 text-xs">
                <p className="text-sm font-semibold">{s.name}</p>
                <p>ID: {s.id}</p>
                {s.wasteType && <p>Waste type: {s.wasteType}</p>}
                {s.priority !== undefined && <p>Priority: {String(s.priority)}</p>}
                <p>OSM node: {s.node}</p>
                <p>Snap distance: {fmt(s.snapDistanceM)} m</p>
                {s.role !== "garage" && <p>Optimized stop #{order.get(s.id)}</p>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

function LayerToggle({
  checked,
  onChange,
  swatch,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  swatch: React.ReactNode;
  label: string;
}) {
  return (
    <label className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 hover:bg-surface-2 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-[var(--brand)]"
      />
      {swatch}
      <span className="font-medium text-ink">{label}</span>
    </label>
  );
}
