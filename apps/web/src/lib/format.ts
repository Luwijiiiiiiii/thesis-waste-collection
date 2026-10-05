export const fmt = (n: number, digits = 2) =>
  n.toLocaleString("en-PH", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const fmtInt = (n: number) => n.toLocaleString("en-PH");

export const fmtPhp = (n: number) => `₱${fmt(n)}`;

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });

export const fmtMinutes = (min: number) => {
  if (min < 60) return `${fmt(min, 1)} min`;
  const h = Math.floor(min / 60);
  return `${h} h ${Math.round(min - h * 60)} min`;
};
