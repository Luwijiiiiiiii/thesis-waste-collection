"use client";
// Pre-run preview: shows the garage and collection points as soon as a file is loaded
import { useEffect, useMemo, useRef, useState } from "react";
import { Marker, Popup, type MapRef } from "react-map-gl/mapbox";
import type { LatLng, RouteFile } from "@wcro/core";
import { BaseMap, boundsOf } from "@/components/BaseMap";

const FIT = { padding: 40, maxZoom: 16 };

export default function StopsPreviewMap({ data }: { data: RouteFile }) {
  const mapRef = useRef<MapRef>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const points = useMemo<LatLng[]>(
    () => [
      [data.garage.latitude, data.garage.longitude],
      ...data.collection_points.map((p) => [p.latitude, p.longitude] as LatLng),
    ],
    [data],
  );

  // Refit when a different file is loaded into the same map
  useEffect(() => {
    setOpenId(null);
    mapRef.current?.fitBounds(boundsOf(points), FIT);
  }, [points]);

  const open = openId === "garage" ? null : data.collection_points.find((p) => String(p.id) === openId);

  return (
    <BaseMap
      ref={mapRef}
      initialViewState={{ bounds: boundsOf(points), fitBoundsOptions: FIT }}
      className="h-[360px] w-full rounded-xl border border-line sm:h-[440px]"
    >
      <Marker
        longitude={data.garage.longitude}
        latitude={data.garage.latitude}
        onClick={(e) => {
          e.originalEvent.stopPropagation();
          setOpenId("garage");
        }}
      >
        <div className="stop-marker stop-marker--garage" style={{ width: 28, height: 28 }} title={data.garage.name}>
          G
        </div>
      </Marker>
      {data.collection_points.map((p, i) => (
        <Marker
          key={String(p.id)}
          longitude={p.longitude}
          latitude={p.latitude}
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            setOpenId(String(p.id));
          }}
        >
          <div className="stop-marker stop-marker--file" style={{ width: 24, height: 24 }} title={p.name}>
            {i + 1}
          </div>
        </Marker>
      ))}

      {openId === "garage" && (
        <Popup
          longitude={data.garage.longitude}
          latitude={data.garage.latitude}
          offset={16}
          onClose={() => setOpenId(null)}
        >
          <p className="text-sm font-semibold">{data.garage.name}</p>
          <p className="text-xs">Garage · {data.garage.id}</p>
        </Popup>
      )}
      {open && (
        <Popup longitude={open.longitude} latitude={open.latitude} offset={14} onClose={() => setOpenId(null)}>
          <div className="space-y-0.5 text-xs">
            <p className="text-sm font-semibold">{open.name}</p>
            <p>ID: {open.id}</p>
            {open.waste_type && <p>Waste type: {open.waste_type}</p>}
            {open.priority !== undefined && <p>Priority: {String(open.priority)}</p>}
          </div>
        </Popup>
      )}
    </BaseMap>
  );
}
