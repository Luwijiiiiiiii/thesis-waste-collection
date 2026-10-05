"use client";
import dynamic from "next/dynamic";

// Leaflet touches `window`, so the map renders on the client only
export const StopsPreviewMapLoader = dynamic(() => import("./StopsPreviewMap"), {
  ssr: false,
  loading: () => <div className="h-[360px] w-full animate-pulse rounded-xl bg-surface-2 sm:h-[440px]" />,
});
