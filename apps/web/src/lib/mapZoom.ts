// Shared mouse-wheel zoom tuning for every Leaflet map: fractional steps so zoom follows the wheel smoothly
export const WHEEL_ZOOM = {
  scrollWheelZoom: true,
  zoomSnap: 0.25,
  wheelPxPerZoomLevel: 100,
  wheelDebounceTime: 20,
} as const;
