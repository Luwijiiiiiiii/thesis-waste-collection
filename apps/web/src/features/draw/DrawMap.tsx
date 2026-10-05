"use client";
// Tap-to-place map for draw mode: tap = add, drag = adjust, popup = delete
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useRef } from "react";
import { MapContainer, Marker, Popup, Rectangle, TileLayer, useMapEvents } from "react-leaflet";
import { inStudyArea, STUDY_AREA, type DraftAction, type DraftPoint, type RouteDraft } from "@wcro/core";

const [south, west, north, east] = STUDY_AREA.fallbackBBox;
const BOUNDS = L.latLngBounds([south, west], [north, east]);

const icon = (label: string, garage: boolean) =>
  L.divIcon({
    className: "",
    html: `<div class="stop-marker ${garage ? "stop-marker--garage" : "stop-marker--file"}" style="width:${garage ? 28 : 26}px;height:${garage ? 28 : 26}px">${label}</div>`,
    iconSize: garage ? [28, 28] : [26, 26],
    iconAnchor: garage ? [14, 14] : [13, 13],
  });

function TapToPlace({ onAction }: { onAction: (a: DraftAction) => void }) {
  const popupOpen = useRef(false);
  const map = useMapEvents({
    popupopen: () => {
      popupOpen.current = true;
    },
    popupclose: () => {
      popupOpen.current = false;
    },
    click: (e) => {
      // A tap that only dismisses an open popup must not also place a point
      if (popupOpen.current) {
        map.closePopup();
        return;
      }
      onAction({ type: "place", lat: e.latlng.lat, lon: e.latlng.lng });
    },
  });
  return null;
}

function PointMarker({
  point,
  label,
  title,
  garage,
  onAction,
}: {
  point: DraftPoint;
  label: string;
  title: string;
  garage: boolean;
  onAction: (a: DraftAction) => void;
}) {
  return (
    <Marker
      position={[point.lat, point.lon]}
      icon={icon(label, garage)}
      draggable
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target as L.Marker;
          const { lat, lng } = marker.getLatLng();
          // Snap back visually when dropped outside Baguio; the reducer shows the notice
          if (!inStudyArea(lat, lng)) marker.setLatLng([point.lat, point.lon]);
          onAction({ type: "move", id: point.id, lat, lon: lng });
        },
      }}
    >
      <Popup>
        <div className="space-y-2">
          <p className="text-sm font-semibold">{title}</p>
          <button
            type="button"
            onClick={() => onAction({ type: "remove", id: point.id })}
            className="inline-flex min-h-9 items-center rounded-lg bg-[#b91c1c] px-3 text-sm font-medium text-white"
          >
            Delete
          </button>
        </div>
      </Popup>
    </Marker>
  );
}

export default function DrawMap({ draft, onAction }: { draft: RouteDraft; onAction: (a: DraftAction) => void }) {
  return (
    <MapContainer
      center={STUDY_AREA.mapCenter}
      zoom={14}
      minZoom={12}
      maxBounds={BOUNDS}
      maxBoundsViscosity={1}
      scrollWheelZoom={false}
      closePopupOnClick={false}
      className="h-[420px] w-full rounded-xl border border-line lg:h-[600px]"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Rectangle
        bounds={BOUNDS}
        pathOptions={{ color: "#2563eb", weight: 2, fill: false, dashArray: "6 6", interactive: false }}
      />
      <TapToPlace onAction={onAction} />
      {draft.garage && <PointMarker point={draft.garage} label="G" title="Garage" garage onAction={onAction} />}
      {draft.stops.map((s, i) => (
        <PointMarker
          key={s.id}
          point={s}
          label={String(i + 1)}
          title={`Stop ${i + 1}`}
          garage={false}
          onAction={onAction}
        />
      ))}
    </MapContainer>
  );
}
