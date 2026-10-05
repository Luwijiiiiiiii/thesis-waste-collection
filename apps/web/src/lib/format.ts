/**
 * Decimal places for every computed value shown in the app (distance, time,
 * fuel, cost, CO2, savings, percentages). Change it here and all tables,
 * tiles and headlines follow. Values are computed exactly; only display rounds.
 */
export const DECIMALS = 2;

export const fmt = (n: number, digits = DECIMALS) =>
  n.toLocaleString("en-PH", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const fmtInt = (n: number) => n.toLocaleString("en-PH");

export const fmtPhp = (n: number) => `₱${fmt(n)}`;

/** "45.27 min", or "1 h 23.45 min" from 60 min up. Rounds before splitting so 119.999 never shows as "1 h 60.00 min". */
export const fmtMinutes = (min: number) => {
  const total = Number(min.toFixed(DECIMALS));
  if (total < 60) return `${fmt(total)} min`;
  const h = Math.floor(total / 60);
  return `${h} h ${fmt(total - h * 60)} min`;
};

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
