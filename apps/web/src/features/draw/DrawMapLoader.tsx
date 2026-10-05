"use client";
import dynamic from "next/dynamic";

// Leaflet touches `window`, so the map renders on the client only
export const DrawMapLoader = dynamic(() => import("./DrawMap"), {
  ssr: false,
  loading: () => <div className="h-[420px] w-full animate-pulse rounded-xl bg-surface-2 lg:h-[600px]" />,
});
