"use client";
// Shared basemap: Mapbox styles when a token is configured, OpenStreetMap otherwise
import { useEffect, useState } from "react";
import { TileLayer } from "react-leaflet";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const MAPBOX_STYLES = { light: "streets-v12", dark: "dark-v11" } as const;

/** Tracks the `data-theme` attribute that ThemeToggle sets on <html> */
function useTheme(): "light" | "dark" {
  const read = (): "light" | "dark" => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  const [theme, setTheme] = useState(read);
  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(read()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  return theme;
}

export function BaseTileLayer() {
  const theme = useTheme();

  if (!MAPBOX_TOKEN) {
    return (
      <TileLayer
        className="osm-tiles"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
    );
  }

  const style = MAPBOX_STYLES[theme];
  return (
    <TileLayer
      // key forces Leaflet to swap the layer when the theme changes
      key={style}
      attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> <strong><a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a></strong>'
      url={`https://api.mapbox.com/styles/v1/mapbox/${style}/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`}
      tileSize={512}
      zoomOffset={-1}
      maxZoom={22}
    />
  );
}
