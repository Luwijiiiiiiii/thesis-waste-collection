"use client";
// Shared Mapbox GL map: token, theme-aware style and the "no token" fallback for every map in the app
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useState, type Ref } from "react";
import MapGL, { type LngLatBoundsLike, type MapProps, type MapRef } from "react-map-gl/mapbox";
import type { LatLng } from "@wcro/core";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const MAPBOX_STYLES = {
  light: "mapbox://styles/mapbox/streets-v12",
  dark: "mapbox://styles/mapbox/dark-v11",
} as const;

const readTheme = (): "light" | "dark" => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

/** Tracks the `data-theme` attribute that ThemeToggle sets on <html> */
function useTheme(): "light" | "dark" {
  const [theme, setTheme] = useState(readTheme);
  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(readTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  return theme;
}

/** Mapbox expects [lng, lat]; the app stores [lat, lng] */
export const toLngLat = ([lat, lng]: LatLng): [number, number] => [lng, lat];

/** Bounding box of [lat, lng] points in Mapbox's [[west, south], [east, north]] form */
export function boundsOf(points: LatLng[]): LngLatBoundsLike {
  const lats = points.map((p) => p[0]);
  const lngs = points.map((p) => p[1]);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

export function BaseMap({
  className,
  ref,
  children,
  ...props
}: Omit<MapProps, "mapboxAccessToken" | "mapStyle" | "style"> & { className: string; ref?: Ref<MapRef> }) {
  const theme = useTheme();

  if (!MAPBOX_TOKEN) {
    return (
      <div className={`${className} grid place-items-center bg-surface-2 p-6 text-center text-sm text-muted`}>
        <p>
          Map unavailable: set <code className="font-mono">NEXT_PUBLIC_MAPBOX_TOKEN</code> in{" "}
          <code className="font-mono">apps/web/.env.local</code> and restart the dev server.
        </p>
      </div>
    );
  }

  return (
    <div className={`${className} map-frame overflow-hidden`}>
      <MapGL
        ref={ref}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle={MAPBOX_STYLES[theme]}
        style={{ width: "100%", height: "100%" }}
        {...props}
      >
        {children}
      </MapGL>
    </div>
  );
}
