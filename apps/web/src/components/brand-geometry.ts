// ==========================================================
// "Search Grid" mark – single source of truth for the logo geometry.
// A* on a grid of road nodes: the route steps from the garage
// (square, bottom-left) to the goal (top-right). Ringed nodes are
// ones the search explored and rejected. 24-unit grid.
// public/brand/*.svg and app/icon.svg use these exact values.
// ==========================================================

/** Road-node grid coordinates (4 × 4) */
export const GRID = [3.5, 9, 14.5, 20] as const;

/** Explored-but-rejected nodes (full mark only) */
export const EXPLORED: readonly (readonly [number, number])[] = [
  [3.5, 14.5],
  [9, 9],
  [14.5, 3.5],
  [20, 14.5],
];

/** The path A* found, garage → goal */
export const ROUTE_PATH = "M3.5 20 H9 V14.5 H14.5 V9 H20 V3.5";

/** Garage (start) square and goal node */
export const START = { x: 1.2, y: 17.7, width: 4.6, height: 4.6, rx: 1 } as const;
export const GOAL = { cx: 20, cy: 3.5, r: 2.1 } as const;

export const SIZE = { node: 0.95, explored: 1.7, exploredStroke: 0.7, route: 3 } as const;

/** Places the mark inside the app tile / favicon */
export const TILE_TRANSFORM = "translate(12 12) scale(0.8) translate(-12 -12)";

/** Fixed tile colours (the tile stays dark in both themes) */
export const TILE = { bg: "#0f172a", route: "#34d399", node: "#e8eef8", faint: "#475569" } as const;
