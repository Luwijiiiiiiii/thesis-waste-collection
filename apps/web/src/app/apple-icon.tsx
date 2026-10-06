// Home-screen icon (180×180 PNG) – same Search Grid tile as app/icon.svg
import { ImageResponse } from "next/og";
import { EXPLORED, GOAL, GRID, ROUTE_PATH, SIZE, START, TILE, TILE_TRANSFORM } from "@/components/brand-geometry";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const nodes = GRID.flatMap((x) =>
  GRID.map((y) => `<circle cx="${x}" cy="${y}" r="${SIZE.node}" fill="${TILE.faint}"/>`),
);
const explored = EXPLORED.map(
  ([x, y]) =>
    `<circle cx="${x}" cy="${y}" r="${SIZE.explored}" fill="none" stroke="${TILE.faint}" stroke-width="${SIZE.exploredStroke}"/>`,
);
// iOS applies its own rounded mask, so the tile is a full square here
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" fill="${TILE.bg}"/><g transform="${TILE_TRANSFORM}">${nodes.join("")}${explored.join("")}<path d="${ROUTE_PATH}" fill="none" stroke="${TILE.route}" stroke-width="${SIZE.route}" stroke-linejoin="round" stroke-linecap="round"/><rect x="${START.x}" y="${START.y}" width="${START.width}" height="${START.height}" rx="${START.rx}" fill="${TILE.node}"/><circle cx="${GOAL.cx}" cy="${GOAL.cy}" r="${GOAL.r}" fill="${TILE.node}"/></g></svg>`;

export default function AppleIcon() {
  return new ImageResponse(
    // biome-ignore lint/performance/noImgElement: ImageResponse renders plain JSX, not next/image
    <img src={`data:image/svg+xml,${encodeURIComponent(svg)}`} width={size.width} height={size.height} alt="" />,
    size,
  );
}
