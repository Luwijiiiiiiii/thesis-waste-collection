// Charts for the test dashboard, drawn as plain SVG so they follow the app's light and dark theme.
import { TEST_GROUPS, type TestRunRecord, testGroupOf } from "@wcro/core";
import { fmt } from "@/lib/format";
import { mean, savingPct, summarize } from "./stats";

const W = 680;
const H = 320;
const M = { l: 56, r: 16, t: 22, b: 46 };
const plotW = W - M.l - M.r;
const plotH = H - M.t - M.b;

/** Round tick values (1, 2, 5 × 10ⁿ) that cover [min, max] */
function niceTicks(min: number, max: number, count = 5): number[] {
  const hi = max === min ? min + 1 : max;
  const raw = (hi - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const ticks: number[] = [];
  for (let v = Math.floor(min / step) * step; v <= Math.ceil(hi / step) * step + step / 2; v += step) {
    ticks.push(Number(v.toFixed(10)));
  }
  return ticks;
}

function Legend({ items }: { items: { label: string; className: string; dashed?: boolean }[] }) {
  return (
    <ul className="mb-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2">
          <svg width="18" height="10" aria-hidden>
            {i.dashed ? (
              <line x1="0" y1="5" x2="18" y2="5" strokeWidth="2.5" strokeDasharray="4 3" className={i.className} />
            ) : (
              <circle cx="9" cy="5" r="4.5" className={i.className} />
            )}
          </svg>
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/** Grid, axes, and axis titles shared by both chart types */
function Frame({
  yTicks,
  y,
  yFormat,
  xTicks,
  x,
  xTitle,
  yTitle,
}: {
  yTicks: number[];
  y: (v: number) => number;
  yFormat: (v: number) => string;
  xTicks?: number[];
  x?: (v: number) => number;
  xTitle?: string;
  yTitle: string;
}) {
  return (
    <>
      {yTicks.map((t) => (
        <g key={t}>
          <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} className="stroke-line" strokeWidth="1" />
          <text x={M.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" className="fill-muted">
            {yFormat(t)}
          </text>
        </g>
      ))}
      {x &&
        xTicks?.map((t) => (
          <text key={t} x={x(t)} y={H - M.b + 17} textAnchor="middle" fontSize="11" className="fill-muted">
            {t}
          </text>
        ))}
      <line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} className="stroke-line-strong" strokeWidth="1" />
      {xTitle && (
        <text x={M.l + plotW / 2} y={H - 6} textAnchor="middle" fontSize="12" className="fill-muted">
          {xTitle}
        </text>
      )}
      <text
        transform={`translate(14 ${M.t + plotH / 2}) rotate(-90)`}
        textAnchor="middle"
        fontSize="12"
        className="fill-muted"
      >
        {yTitle}
      </text>
    </>
  );
}

/** Dashed dividers at 10.5 and 19.5 points, and a label for each size group */
function GroupBands({ x, xMax }: { x: (v: number) => number; xMax: number }) {
  const edges = [0, 10.5, 19.5, xMax];
  return (
    <>
      {[10.5, 19.5].map((e) => (
        <line
          key={e}
          x1={x(e)}
          x2={x(e)}
          y1={M.t}
          y2={H - M.b}
          strokeDasharray="4 4"
          className="stroke-line-strong"
          strokeWidth="1"
        />
      ))}
      {TEST_GROUPS.map((g, i) => (
        <text
          key={g.key}
          x={(x(edges[i]) + x(edges[i + 1])) / 2}
          y={M.t - 7}
          textAnchor="middle"
          fontSize="11"
          fontWeight="600"
          className="fill-muted"
        >
          {g.label}
        </text>
      ))}
    </>
  );
}

function xScale(records: TestRunRecord[]) {
  const xMax = Math.max(25, Math.ceil(Math.max(...records.map((r) => r.collectionPoints)) / 5) * 5);
  const x = (v: number) => M.l + (v / xMax) * plotW;
  const xTicks = Array.from({ length: xMax / 5 + 1 }, (_, i) => i * 5);
  return { xMax, x, xTicks };
}

/** Every test as two dots: its traditional and its A* Pathfinding distance, by number of collection points */
export function DistanceScatter({ records }: { records: TestRunRecord[] }) {
  const { xMax, x, xTicks } = xScale(records);
  const ticks = niceTicks(0, Math.max(...records.flatMap((r) => [r.traditional.distanceKm, r.optimized.distanceKm])));
  const yMax = ticks[ticks.length - 1];
  const y = (v: number) => M.t + plotH - (v / yMax) * plotH;

  return (
    <figure>
      <Legend
        items={[
          { label: "Traditional route", className: "fill-traditional" },
          { label: "A* Pathfinding Routes", className: "fill-optimized" },
        ]}
      />
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Distance of the traditional and A* Pathfinding Routes for ${records.length} tests`}
      >
        <Frame
          yTicks={ticks}
          y={y}
          yFormat={(v) => fmt(v, v % 1 ? 1 : 0)}
          xTicks={xTicks}
          x={x}
          xTitle="Collection points in the test"
          yTitle="Route distance (km)"
        />
        <GroupBands x={x} xMax={xMax} />
        {records.map((r) => (
          <g key={r.id}>
            <circle
              cx={x(r.collectionPoints)}
              cy={y(r.traditional.distanceKm)}
              r="3.6"
              fillOpacity="0.55"
              className="fill-traditional"
            />
            <circle
              cx={x(r.collectionPoints)}
              cy={y(r.optimized.distanceKm)}
              r="3.6"
              fillOpacity="0.65"
              className="fill-optimized"
            />
          </g>
        ))}
      </svg>
    </figure>
  );
}

/** Distance saved per test, with each size group's average drawn as a line */
export function SavingsScatter({ records }: { records: TestRunRecord[] }) {
  const { xMax, x, xTicks } = xScale(records);
  const savings = records.map(savingPct);
  const ticks = niceTicks(Math.min(0, ...savings), Math.max(0, ...savings));
  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1];
  const y = (v: number) => M.t + plotH - ((v - yMin) / (yMax - yMin)) * plotH;
  const edges = [0, 10.5, 19.5, xMax];

  return (
    <figure>
      <Legend
        items={[
          { label: "One test", className: "fill-brand" },
          { label: "Group average", className: "stroke-warn", dashed: true },
        ]}
      />
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Distance saved by the A* Pathfinding Routes for ${records.length} tests`}
      >
        <Frame
          yTicks={ticks}
          y={y}
          yFormat={(v) => `${fmt(v, 0)}%`}
          xTicks={xTicks}
          x={x}
          xTitle="Collection points in the test"
          yTitle="Distance saved"
        />
        <line x1={M.l} x2={W - M.r} y1={y(0)} y2={y(0)} className="stroke-ink" strokeOpacity="0.4" strokeWidth="1" />
        <GroupBands x={x} xMax={xMax} />
        {records.map((r) => (
          <circle
            key={r.id}
            cx={x(r.collectionPoints)}
            cy={y(savingPct(r))}
            r="3.6"
            fillOpacity="0.6"
            className="fill-brand"
          />
        ))}
        {TEST_GROUPS.map((g, i) => {
          const rows = records.filter((r) => r.collectionPoints > edges[i] && r.collectionPoints < edges[i + 1]);
          if (!rows.length) return null;
          const avg = mean(rows.map(savingPct));
          return (
            <g key={g.key}>
              <line
                x1={x(edges[i]) + 4}
                x2={x(edges[i + 1]) - 4}
                y1={y(avg)}
                y2={y(avg)}
                strokeWidth="2.5"
                strokeDasharray="6 4"
                className="stroke-warn"
              />
              <text
                x={(x(edges[i]) + x(edges[i + 1])) / 2}
                y={y(avg) - 6}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                className="fill-warn"
              >
                {fmt(avg)}%
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

/** Average traditional and A* Pathfinding distance for each size group and for all tests */
export function GroupBars({ records }: { records: TestRunRecord[] }) {
  const groups = [
    ...TEST_GROUPS.map((g) => ({
      label: g.label,
      s: summarize(records.filter((r) => testGroupOf(r.collectionPoints) === g.key)),
    })),
    { label: "All tests", s: summarize(records) },
  ];
  const ticks = niceTicks(
    0,
    Math.max(...groups.flatMap((g) => [g.s.traditional.distanceKm, g.s.optimized.distanceKm])),
  );
  const yMax = ticks[ticks.length - 1];
  const y = (v: number) => M.t + plotH - (v / yMax) * plotH;
  const band = plotW / groups.length;
  const barW = Math.min(46, band / 3);

  return (
    <figure>
      <Legend
        items={[
          { label: "Traditional route", className: "fill-traditional" },
          { label: "A* Pathfinding Routes", className: "fill-optimized" },
        ]}
      />
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Average route distance by test size"
      >
        <Frame yTicks={ticks} y={y} yFormat={(v) => fmt(v, v % 1 ? 1 : 0)} yTitle="Average distance (km)" />
        {groups.map((g, i) => {
          const cx = M.l + band * i + band / 2;
          const bars = [
            { v: g.s.traditional.distanceKm, cls: "fill-traditional", dx: -barW - 2 },
            { v: g.s.optimized.distanceKm, cls: "fill-optimized", dx: 2 },
          ];
          return (
            <g key={g.label}>
              {g.s.count > 0 &&
                bars.map((b) => (
                  <g key={b.cls}>
                    <rect x={cx + b.dx} y={y(b.v)} width={barW} height={H - M.b - y(b.v)} rx="3" className={b.cls} />
                    <text
                      x={cx + b.dx + barW / 2}
                      y={y(b.v) - 5}
                      textAnchor="middle"
                      fontSize="11"
                      className="fill-ink"
                    >
                      {fmt(b.v, 1)}
                    </text>
                  </g>
                ))}
              <text x={cx} y={H - M.b + 17} textAnchor="middle" fontSize="12" fontWeight="600" className="fill-ink">
                {g.label}
              </text>
              <text x={cx} y={H - M.b + 32} textAnchor="middle" fontSize="11" className="fill-muted">
                {g.s.count} tests
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
