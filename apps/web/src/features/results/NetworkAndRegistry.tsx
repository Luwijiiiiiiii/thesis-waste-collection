// Road Network Summary + Node Registry (notebook CELL 14)
import type { NodeRegistry, RoadNetworkSummary } from "@wcro/core";
import { TriangleAlert } from "lucide-react";
import { Badge, KeyValue, Table } from "@/components/ui";
import { fmt, fmtDateTime, fmtInt } from "@/lib/format";

export function NetworkAndRegistry({ network, registry }: { network: RoadNetworkSummary; registry: NodeRegistry }) {
  const stops = [registry.garage, ...registry.collectionPoints];
  return (
    <div className="space-y-6">
      <KeyValue
        items={[
          ["Study area", network.studyArea],
          ["Network type", network.networkType],
          ["Graph nodes", <span key="n" className="num">{fmtInt(network.nodeCount)}</span>],
          ["Graph edges (directed)", <span key="e" className="num">{fmtInt(network.edgeCount)}</span>],
          [
            "Boundary",
            network.boundarySource === "relation" ? `OSM relation ${network.osmRelationId}` : "Fallback bounding box",
          ],
          ["Downloaded", fmtDateTime(network.fetchedAt)],
          ["Garage node", <span key="g" className="num">{registry.garage.node}</span>],
          ["Source", network.fromCache ? <Badge>Cache</Badge> : <Badge tone="brand">Fresh download</Badge>],
        ]}
      />
      <div>
        <h3 className="mb-1 text-sm font-semibold">Node registry</h3>
        <p className="mb-3 text-sm text-muted">Each stop is snapped to its nearest drivable road node.</p>
        <Table maxHeight="420px">
          <thead>
            <tr>
              <th>Point ID</th>
              <th>Name</th>
              <th>OSM node</th>
              <th className="text-right">Snap distance</th>
            </tr>
          </thead>
          <tbody>
            {stops.map((s) => (
              <tr key={s.id}>
                <td className="num">{s.id}</td>
                <td>
                  <span className="font-medium">{s.name}</span> {s.role === "garage" && <Badge>garage</Badge>}
                </td>
                <td className="num">{s.node}</td>
                <td className={`num text-right ${s.snapDistanceM > 300 ? "font-semibold text-warn" : ""}`}>
                  {s.snapDistanceM > 300 && <TriangleAlert className="mr-1 inline size-3.5 align-[-2px]" aria-label="Far from road" />}
                  {fmt(s.snapDistanceM, 1)} m
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
