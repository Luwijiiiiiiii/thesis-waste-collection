// Prototype configuration (notebook CELL 5)
import { NETWORK_TYPE, STUDY_AREA, VEHICLE_DEFAULTS } from "@wcro/core";
import { KeyValue } from "@/components/ui";
import { fmtPhp } from "@/lib/format";

export function ConfigPanel() {
  return (
    <div>
      <h3 className="text-sm font-semibold">Defaults</h3>
      <p className="mb-1 text-sm text-muted">Used when the route file does not specify a vehicle value.</p>
      <KeyValue
        items={[
          ["Study area", STUDY_AREA.name],
          ["Road network", `OpenStreetMap · ${NETWORK_TYPE}`],
          ["Average speed", `${VEHICLE_DEFAULTS.averageSpeedKmh} km/h`],
          ["Fuel efficiency", `${VEHICLE_DEFAULTS.fuelEfficiencyKmpl} km/L`],
          ["Fuel price", `${fmtPhp(VEHICLE_DEFAULTS.fuelPricePerLiter)}/L`],
          ["CO₂ factor", `${VEHICLE_DEFAULTS.co2FactorKgPerLiter} kg/L`],
        ]}
      />
    </div>
  );
}
