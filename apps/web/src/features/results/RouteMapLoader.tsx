"use client";
import dynamic from "next/dynamic";

// Mapbox GL touches `window` and WebGL, so the map renders on the client only
export const RouteMapLoader = dynamic(() => import("./RouteMap"), {
  ssr: false,
  loading: () => <div className="h-[420px] w-full animate-pulse rounded-xl bg-surface-2 lg:h-[560px]" />,
});
