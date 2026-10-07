"use client";
// Interactive route map (replaces the planned Folium visualization)
import { useEffect, useMemo, useRef, useState } from "react";
import { Layer, Marker, Popup, Source, type MapRef } from "react-map-gl/mapbox";
import type { LatLng, RegisteredStop, RouteKind, RouteResult, SimulationResult } from "@wcro/core";
import { BaseMap, boundsOf, toLngLat } from "@/components/BaseMap";
import { fmt } from "@/lib/format";

const FIT = { padding: 36 };

/** Position of each collection point in a route's visiting order */
const orderOf = (route: RouteResult) => {
  const m = new Map<string, number>();
  route.visitSequence.forEach((s, i) => {
    if (s.role !== "garage" && !m.has(s.id)) m.set(s.id, i);
  });
  return m;
};

const line = (path: LatLng[]) => ({
  type: "Feature" as const,
  properties: {},
  geometry: { type: "LineString" as const, coordinates: path.map(toLngLat) },
});

export default function RouteMap({
  result,
  activeId = null,
  orderKind = "optimized",
  heightClass = "h-[420px] lg:h-[560px]",
}: {
  result: SimulationResult;
  activeId?: string | null;
  /** Which route's visiting order numbers the markers */
  orderKind?: RouteKind;
  heightClass?: string;
}) {
  const mapRef = useRef<MapRef>(null);
  const [show, setShow] = useState({ traditional: true, optimized: true });
  const [openId, setOpenId] = useState<string | null>(null);
  const stops: RegisteredStop[] = useMemo(
    () => [result.nodeRegistry.garage, ...result.nodeRegistry.collectionPoints],
    [result],
  );
  const orders = useMemo(
    () => ({ optimized: orderOf(result.optimized), traditional: orderOf(result.traditional) }),
    [result],
  );
  // Markers are numbered by the order picked in the side list
  const order = orders[orderKind];
  const bounds = useMemo(
    () =>
      boundsOf([
        ...stops.map((s) => [s.latitude, s.longitude] as LatLng),
        ...result.optimized.path,
        ...result.traditional.path,
      ]),
    [stops, result],
  );
  const paths = useMemo(
    () => ({ traditional: line(result.traditional.path), optimized: line(result.optimized.path) }),
    [result],
  );

  // Refit when a different result is shown in the same map
  useEffect(() => {
    mapRef.current?.fitBounds(bounds, FIT);
  }, [bounds]);

  // Fly to the stop picked in the sidebar list
  useEffect(() => {
    const s = stops.find((x) => x.id === activeId);
    const map = mapRef.current;
    if (s && map) map.flyTo({ center: [s.longitude, s.latitude], zoom: Math.max(map.getZoom(), 16), duration: 600 });
  }, [stops, activeId]);

  const open = stops.find((s) => s.id === openId);

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
      <BaseMap
        ref={mapRef}
        initialViewState={{ bounds, fitBoundsOptions: FIT }}
        className={`${heightClass} w-full rounded-xl border border-line`}
      >
        <Source id="route-traditional" type="geojson" data={paths.traditional}>
          <Layer
            id="route-traditional"
            type="line"
            layout={{ visibility: show.traditional ? "visible" : "none", "line-join": "round" }}
            paint={{ "line-color": "#2563eb", "line-width": 5, "line-opacity": 0.6, "line-dasharray": [1.6, 1.4] }}
          />
        </Source>
        <Source id="route-optimized" type="geojson" data={paths.optimized}>
          <Layer
            id="route-optimized"
            type="line"
            layout={{ visibility: show.optimized ? "visible" : "none", "line-join": "round", "line-cap": "round" }}
            paint={{ "line-color": "#059669", "line-width": 5, "line-opacity": 0.95 }}
          />
        </Source>
        {stops.map((s) => {
          const garage = s.role === "garage";
          const active = s.id === activeId;
          const size = garage ? 28 : 24;
          return (
            <Marker
              key={s.id}
              longitude={s.longitude}
              latitude={s.latitude}
              style={{ zIndex: active ? 1 : 0 }}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setOpenId(s.id);
              }}
            >
              <div
                className={`stop-marker ${garage ? "stop-marker--garage" : orderKind === "optimized" ? "stop-marker--point" : "stop-marker--traditional"} ${active ? "stop-marker--active" : ""}`}
                style={{ width: size, height: size }}
              >
                {garage ? "G" : String(order.get(s.id) ?? "•")}
              </div>
            </Marker>
          );
        })}
        {open && (
          <Popup longitude={open.longitude} latitude={open.latitude} offset={16} onClose={() => setOpenId(null)}>
            <div className="space-y-0.5 text-xs">
              <p className="text-sm font-semibold">{open.name}</p>
              <p>ID: {open.id}</p>
              {open.wasteType && <p>Waste type: {open.wasteType}</p>}
              {open.priority !== undefined && <p>Priority: {String(open.priority)}</p>}
              <p>OSM node: {open.node}</p>
              <p>Snap distance: {fmt(open.snapDistanceM)} m</p>
              {open.role !== "garage" && (
                <>
                  <p>Optimized stop #{orders.optimized.get(open.id)}</p>
                  <p>Traditional stop #{orders.traditional.get(open.id)}</p>
                </>
              )}
            </div>
          </Popup>
        )}
      </BaseMap>
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
