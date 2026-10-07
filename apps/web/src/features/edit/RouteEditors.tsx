"use client";
// Editable "Details" form and "Collection points" table, shared by uploaded and drawn routes
import {
  VEHICLE_DEFAULTS,
  type RouteDetailsPatch,
  type RouteFile,
  type StopInfo,
  type StopTarget,
  type Vehicle,
} from "@wcro/core";
import { Badge, KeyValue, Table } from "@/components/ui";
import { NumberField, TextField } from "./fields";

const WASTE_TYPES = ["Biodegradable", "Residual", "Recyclable", "Special"];
const PRIORITIES = ["High", "Medium", "Low"];

export function RouteDetailsForm({
  data,
  onChange,
}: {
  data: RouteFile;
  onChange: (patch: RouteDetailsPatch) => void;
}) {
  const v = data.vehicle;
  const setVehicle = (patch: Partial<Vehicle>) => onChange({ vehicle: patch });

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h3 className="text-sm font-semibold">Route</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Route name"
            required
            value={data.route_name}
            onChange={(route_name) => onChange({ route_name })}
          />
          <TextField
            label="Driver"
            required
            value={data.driver.name}
            onChange={(driver_name) => onChange({ driver_name })}
          />
        </div>
        <KeyValue
          items={[
            ["Study area", data.study_area],
            [
              "Created",
              <span key="c" className="num">
                {data.created_date}
              </span>,
            ],
          ]}
        />
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Vehicle</h3>
          <p className="text-sm text-muted">Leave a number empty to use the default shown in grey.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Vehicle ID"
            required
            value={String(v.vehicle_id)}
            onChange={(vehicle_id) => setVehicle({ vehicle_id })}
          />
          <TextField
            label="Truck name"
            required
            value={v.vehicle_name}
            onChange={(vehicle_name) => setVehicle({ vehicle_name })}
          />
          <NumberField
            label="Average speed"
            unit="km/h"
            min="positive"
            value={v.average_speed_kmh}
            placeholder={String(VEHICLE_DEFAULTS.averageSpeedKmh)}
            onChange={(average_speed_kmh) => setVehicle({ average_speed_kmh })}
          />
          <NumberField
            label="Fuel efficiency"
            unit="km/L"
            min="positive"
            value={v.fuel_efficiency_kmpl}
            placeholder={String(VEHICLE_DEFAULTS.fuelEfficiencyKmpl)}
            onChange={(fuel_efficiency_kmpl) => setVehicle({ fuel_efficiency_kmpl })}
          />
          <NumberField
            label="Fuel (gas) price"
            unit="₱/L"
            min="nonnegative"
            value={v.fuel_price_per_liter}
            placeholder={String(VEHICLE_DEFAULTS.fuelPricePerLiter)}
            onChange={(fuel_price_per_liter) => setVehicle({ fuel_price_per_liter })}
          />
          <NumberField
            label="CO₂ factor"
            unit="kg/L"
            min="nonnegative"
            value={v.co2_factor}
            placeholder={String(VEHICLE_DEFAULTS.co2FactorKgPerLiter)}
            onChange={(co2_factor) => setVehicle({ co2_factor })}
          />
        </div>
      </section>
    </div>
  );
}

export function StopsEditorTable({
  data,
  onChange,
  rowKeys,
  note,
}: {
  data: RouteFile;
  onChange: (target: StopTarget, patch: StopInfo) => void;
  /** Stable row keys; IDs are editable, so they can't be used as keys while typing */
  rowKeys?: string[];
  /** Where the coordinates come from, shown under the table */
  note: string;
}) {
  const g = data.garage;
  return (
    <div className="space-y-2">
      <Table maxHeight="480px">
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
        <tbody className="[&_td]:py-2">
          <tr className="bg-surface-2/50">
            <td className="num text-muted">G</td>
            <td className="min-w-28">
              <TextField
                compact
                required
                label="Garage ID"
                value={String(g.id)}
                onChange={(id) => onChange("garage", { id })}
              />
            </td>
            <td className="min-w-48">
              <TextField
                compact
                required
                label="Garage name"
                value={g.name}
                onChange={(name) => onChange("garage", { name })}
              />
            </td>
            <td className="text-muted">—</td>
            <td>
              <Badge>Garage</Badge>
            </td>
            <td className="num text-right">{g.latitude.toFixed(5)}</td>
            <td className="num text-right">{g.longitude.toFixed(5)}</td>
          </tr>
          {data.collection_points.map((p, i) => (
            <tr key={rowKeys?.[i] ?? i}>
              <td className="num text-muted">{i + 1}</td>
              <td className="min-w-28">
                <TextField
                  compact
                  required
                  label={`ID of stop ${i + 1}`}
                  value={String(p.id)}
                  onChange={(id) => onChange(i, { id })}
                />
              </td>
              <td className="min-w-48">
                <TextField
                  compact
                  required
                  label={`Name of stop ${i + 1}`}
                  value={p.name}
                  onChange={(name) => onChange(i, { name })}
                />
              </td>
              <td className="min-w-36">
                <TextField
                  compact
                  label={`Waste type of stop ${i + 1}`}
                  list="waste-types"
                  placeholder="—"
                  value={p.waste_type ?? ""}
                  onChange={(waste_type) => onChange(i, { waste_type })}
                />
              </td>
              <td className="min-w-28">
                <TextField
                  compact
                  label={`Priority of stop ${i + 1}`}
                  list="priorities"
                  placeholder="—"
                  value={p.priority === undefined ? "" : String(p.priority)}
                  onChange={(priority) => onChange(i, { priority })}
                />
              </td>
              <td className="num text-right">{p.latitude.toFixed(5)}</td>
              <td className="num text-right">{p.longitude.toFixed(5)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      <datalist id="waste-types">
        {WASTE_TYPES.map((w) => (
          <option key={w} value={w} />
        ))}
      </datalist>
      <datalist id="priorities">
        {PRIORITIES.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
      <p className="text-xs text-muted">
        Edit any cell. Waste type and priority suggest common values but accept anything. {note}
      </p>
    </div>
  );
}
