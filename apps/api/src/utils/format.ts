// Same number format as apps/web/src/lib/format.ts, for progress messages built on the server.
export const fmt = (n: number, digits = 2) =>
  n.toLocaleString("en-PH", { minimumFractionDigits: digits, maximumFractionDigits: digits });
