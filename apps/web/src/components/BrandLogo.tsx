// Route Optimizer identity: the "Search Grid" mark (see brand-geometry.ts)
import { EXPLORED, GOAL, GRID, ROUTE_PATH, SIZE, START, TILE, TILE_TRANSFORM } from "./brand-geometry";

/** The mark's shapes in the given colours. `explored` adds the rejected-node rings. */
function SearchGrid({
  route,
  node,
  faint,
  explored,
}: {
  route: string;
  node: string;
  faint: string;
  explored: boolean;
}) {
  return (
    <>
      {GRID.flatMap((x) => GRID.map((y) => <circle key={`n${x}-${y}`} cx={x} cy={y} r={SIZE.node} fill={faint} />))}
      {explored &&
        EXPLORED.map(([x, y]) => (
          <circle
            key={`e${x}-${y}`}
            cx={x}
            cy={y}
            r={SIZE.explored}
            fill="none"
            stroke={faint}
            strokeWidth={SIZE.exploredStroke}
          />
        ))}
      <path
        d={ROUTE_PATH}
        fill="none"
        stroke={route}
        strokeWidth={SIZE.route}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <rect {...START} fill={node} />
      <circle {...GOAL} fill={node} />
    </>
  );
}

/** Bare mark. Route uses the optimized colour, nodes follow the text colour. */
export function BrandMark({
  variant = "full",
  className = "size-10",
}: {
  variant?: "full" | "compact";
  className?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" className={`text-ink ${className}`} aria-hidden>
      <SearchGrid
        route="var(--optimized)"
        node="currentColor"
        faint="var(--line-strong)"
        explored={variant === "full"}
      />
    </svg>
  );
}

/** App tile: mark on a dark rounded square (same art as the favicon) */
export function BrandTile({ className = "size-9" }: { className?: string }) {
  return (
    <span className={`shrink-0 rounded-xl dark:bg-surface-2 dark:ring-1 dark:ring-line ${className}`} aria-hidden>
      <svg viewBox="0 0 24 24" className="size-full" aria-hidden>
        <rect width="24" height="24" rx="8" fill={TILE.bg} className="dark:fill-transparent" />
        <g transform={TILE_TRANSFORM}>
          <SearchGrid route={TILE.route} node={TILE.node} faint={TILE.faint} explored />
        </g>
      </svg>
    </span>
  );
}

/** Horizontal lockup used in the app chrome */
export function BrandLockup({ subtitle }: { subtitle?: string }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <BrandTile />
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold leading-5 tracking-tight">Route Optimizer</span>
        {subtitle && <span className="block text-xs text-muted">{subtitle}</span>}
      </span>
    </span>
  );
}
