"use client";
// Pre-run preview: shows the garage and collection points as soon as a file is loaded
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { LatLng, RouteFile } from "@wcro/core";

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length) map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 16 });
  }, [map, points]);
  return null;
}

const icon = (label: string, garage: boolean) =>
  L.divIcon({
    className: "",
    html: `<div class="stop-marker ${garage ? "stop-marker--garage" : "stop-marker--file"}" style="width:${garage ? 28 : 24}px;height:${garage ? 28 : 24}px">${label}</div>`,
    iconSize: garage ? [28, 28] : [24, 24],
    iconAnchor: garage ? [14, 14] : [12, 12],
  });

export default function StopsPreviewMap({ data }: { data: RouteFile }) {
  const points = useMemo<LatLng[]>(
    () => [
      [data.garage.latitude, data.garage.longitude],
      ...data.collection_points.map((p) => [p.latitude, p.longitude] as LatLng),
    ],
    [data],
  );

  return (
    <MapContainer
      center={points[0]}
      zoom={14}
      scrollWheelZoom={false}
      className="h-[360px] w-full rounded-xl border border-line sm:h-[440px]"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={points} />
      <Marker position={points[0]} icon={icon("G", true)}>
        <Tooltip direction="top" offset={[0, -12]}>
          {data.garage.name}
        </Tooltip>
        <Popup>
          <p className="text-sm font-semibold">{data.garage.name}</p>
          <p className="text-xs">Garage · {data.garage.id}</p>
        </Popup>
      </Marker>
      {data.collection_points.map((p, i) => (
        <Marker key={String(p.id)} position={[p.latitude, p.longitude]} icon={icon(String(i + 1), false)}>
          <Tooltip direction="top" offset={[0, -10]}>
            {p.name}
          </Tooltip>
          <Popup>
            <div className="space-y-0.5 text-xs">
              <p className="text-sm font-semibold">{p.name}</p>
              <p>ID: {p.id}</p>
              {p.waste_type && <p>Waste type: {p.waste_type}</p>}
              {p.priority !== undefined && <p>Priority: {String(p.priority)}</p>}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
