// Automatic comparison table (notebook objective)
import type { ComparisonRow } from "@wcro/core";
import { Table } from "@/components/ui";
import { fmt } from "@/lib/format";

export function ComparisonTable({ rows }: { rows: ComparisonRow[] }) {
  return (
    <Table>
      <thead>
        <tr>
          <th>Metric</th>
          <th className="text-right">Traditional</th>
          <th className="text-right">Optimized</th>
          <th className="text-right">Savings</th>
          <th className="w-[26%]">Relative</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const max = Math.max(r.traditional, r.optimized) || 1;
          const tone = r.savings > 0 ? "text-optimized" : r.savings < 0 ? "text-danger" : "text-muted";
          return (
            <tr key={r.metric}>
              <td className="font-medium">
                {r.label} <span className="text-xs font-normal text-muted">({r.unit})</span>
              </td>
              <td className="num text-right">{fmt(r.traditional)}</td>
              <td className="num text-right">{fmt(r.optimized)}</td>
              <td className={`num text-right font-semibold ${tone}`}>
                {fmt(r.savings)} <span className="text-xs font-medium">({fmt(r.savingsPercent)}%)</span>
              </td>
              <td>
                <div className="space-y-1" aria-hidden>
                  <div className="h-2 rounded-full bg-traditional-solid" style={{ width: `${(r.traditional / max) * 100}%` }} />
                  <div className="h-2 rounded-full bg-optimized-solid" style={{ width: `${(r.optimized / max) * 100}%` }} />
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
