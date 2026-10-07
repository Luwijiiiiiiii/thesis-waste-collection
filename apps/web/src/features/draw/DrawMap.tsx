"use client";
// Tap-to-place map for draw mode: tap = add, drag = adjust, popup = delete
import { useState } from "react";
import { Layer, Marker, Popup, Source, type LngLatBoundsLike } from "react-map-gl/mapbox";
import { inStudyArea, STUDY_AREA, type DraftAction, type DraftPoint, type RouteDraft } from "@wcro/core";
import { BaseMap, toLngLat } from "@/components/BaseMap";

const [south, west, north, east] = STUDY_AREA.fallbackBBox;
const BOUNDS: LngLatBoundsLike = [
  [west, south],
  [east, north],
];
const OUTLINE = {
  type: "Feature" as const,
  properties: {},
  geometry: {
    type: "LineString" as const,
    coordinates: [
      [west, south],
      [east, south],
      [east, north],
      [west, north],
      [west, south],
    ],
  },
};

function PointMarker({
  point,
  label,
  garage,
  onOpen,
  onAction,
}: {
  point: DraftPoint;
  label: string;
  garage: boolean;
  onOpen: () => void;
  onAction: (a: DraftAction) => void;
}) {
  const size = garage ? 28 : 26;
  return (
    <Marker
      longitude={point.lon}
      latitude={point.lat}
      draggable
      onClick={(e) => {
        // Keep the map's own click handler from placing a new point
        e.originalEvent.stopPropagation();
        onOpen();
      }}
      onDragEnd={(e) => {
        const { lat, lng } = e.lngLat;
        // Snap back visually when dropped outside Baguio; the reducer shows the notice
        if (!inStudyArea(lat, lng)) e.target.setLngLat([point.lon, point.lat]);
        onAction({ type: "move", id: point.id, lat, lon: lng });
      }}
    >
      <div
        className={`stop-marker ${garage ? "stop-marker--garage" : "stop-marker--file"}`}
        style={{ width: size, height: size }}
      >
        {label}
      </div>
    </Marker>
  );
}

export default function DrawMap({ draft, onAction }: { draft: RouteDraft; onAction: (a: DraftAction) => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const points = [
    ...(draft.garage
      ? [{ point: draft.garage, label: "G", title: draft.garage.info?.name ?? "Garage", garage: true }]
      : []),
    ...draft.stops.map((s, i) => ({
      point: s,
      label: String(i + 1),
      title: s.info?.name ?? `Stop ${i + 1}`,
      garage: false,
    })),
  ];
  const open = points.find((p) => p.point.id === openId);
  const [lon, lat] = toLngLat(STUDY_AREA.mapCenter);

  return (
    <BaseMap
      initialViewState={{ longitude: lon, latitude: lat, zoom: 14 }}
      minZoom={12}
      maxBounds={BOUNDS}
      cursor="crosshair"
      onClick={(e) => {
        // A tap that only dismisses an open popup must not also place a point
        if (open) {
          setOpenId(null);
          return;
        }
        onAction({ type: "place", lat: e.lngLat.lat, lon: e.lngLat.lng });
      }}
      className="h-[420px] w-full rounded-xl border border-line lg:h-[600px]"
    >
      <Source id="study-area" type="geojson" data={OUTLINE}>
        <Layer
          id="study-area-outline"
          type="line"
          paint={{ "line-color": "#2563eb", "line-width": 2, "line-dasharray": [3, 3] }}
        />
      </Source>
      {points.map((p) => (
        <PointMarker
          key={p.point.id}
          point={p.point}
          label={p.label}
          garage={p.garage}
          onOpen={() => setOpenId(p.point.id)}
          onAction={onAction}
        />
      ))}
      {open && (
        <Popup
          longitude={open.point.lon}
          latitude={open.point.lat}
          offset={16}
          closeOnClick={false}
          onClose={() => setOpenId(null)}
        >
          <div className="space-y-2">
            <p className="text-sm font-semibold">{open.title}</p>
            <button
              type="button"
              onClick={() => {
                setOpenId(null);
                onAction({ type: "remove", id: open.point.id });
              }}
              className="inline-flex min-h-9 items-center rounded-lg bg-[#b91c1c] px-3 text-sm font-medium text-white"
            >
              Delete
            </button>
          </div>
        </Popup>
      )}
    </BaseMap>
  );
}
