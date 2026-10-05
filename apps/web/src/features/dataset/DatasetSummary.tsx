// Dataset Summary + Collection Points Preview (notebook CELL 10)
import { resolveVehicle, type RouteFile } from "@wcro/core";
import { Badge, KeyValue, Table } from "@/components/ui";
import { fmtPhp } from "@/lib/format";

const priorityTone = (p?: string | number) => {
  const v = String(p ?? "").toLowerCase();
  if (v === "high" || v === "1") return "danger" as const;
  if (v === "medium" || v === "2") return "warn" as const;
  return "neutral" as const;
};

export function CollectionPointsTable({ data }: { data: RouteFile }) {
  return (
    <Table maxHeight="440px">
      <thead>
        <tr>
          <th>#</th>
          <th>ID</th>
          <th>Name</th>
          <th>Waste type</th>
          <th>Priority</th>
          <th className="text-right">Latitude</th>
          <th className="text-right">Longitude</th>
        </tr>
      </thead>
      <tbody>
        <tr className="bg-surface-2/50">
          <td className="num text-muted">G</td>
          <td className="num">{data.garage.id}</td>
          <td className="font-medium">{data.garage.name}</td>
          <td className="text-muted">—</td>
          <td>
            <Badge>Garage</Badge>
          </td>
          <td className="num text-right">{data.garage.latitude.toFixed(5)}</td>
          <td className="num text-right">{data.garage.longitude.toFixed(5)}</td>
        </tr>
        {data.collection_points.map((p, i) => (
          <tr key={String(p.id)}>
            <td className="num text-muted">{i + 1}</td>
            <td className="num">{p.id}</td>
            <td className="font-medium">{p.name}</td>
            <td>{p.waste_type ?? "—"}</td>
            <td>{p.priority !== undefined ? <Badge tone={priorityTone(p.priority)}>{p.priority}</Badge> : "—"}</td>
            <td className="num text-right">{p.latitude.toFixed(5)}</td>
            <td className="num text-right">{p.longitude.toFixed(5)}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

export function DatasetDetails({ data }: { data: RouteFile }) {
  const vehicle = resolveVehicle(data);
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-1 text-sm font-semibold">Route</h3>
        <KeyValue
          items={[
            ["Name", data.route_name],
            ["Study area", data.study_area],
            ["Garage", data.garage.name],
            ["Driver", data.driver.name],
            ["Schema version", <span key="s" className="num">{data.schema_version}</span>],
            ["Created", data.created_date],
          ]}
        />
      </div>
      <div>
        <h3 className="mb-1 text-sm font-semibold">Vehicle (route file values over defaults)</h3>
        <KeyValue
          items={[
            ["Vehicle", `${vehicle.vehicleName} (${vehicle.vehicleId})`],
            ["Average speed", `${vehicle.averageSpeedKmh} km/h`],
            ["Fuel efficiency", `${vehicle.fuelEfficiencyKmpl} km/L`],
            ["Fuel price", `${fmtPhp(vehicle.fuelPricePerLiter)}/L`],
            ["CO₂ factor", `${vehicle.co2FactorKgPerLiter} kg/L`],
          ]}
        />
      </div>
    </div>
  );
}
