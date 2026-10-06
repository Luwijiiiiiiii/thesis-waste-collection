import "dotenv/config";

export const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/wcro";
export const PORT = Number(process.env.PORT || 3001);
export const SECRET_KEY = process.env.SECRET_KEY as string;
export const isDev = process.env.NODE_ENV !== "production";
export const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true";
export const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
export const MAILER_TRANSPORT_HOST = process.env.MAILER_TRANSPORT_HOST as string;
export const MAILER_TRANSPORT_PORT = Number(process.env.MAILER_TRANSPORT_PORT || 465);
export const MAILER_TRANSPORT_SECURE = process.env.MAILER_TRANSPORT_SECURE === "true";
export const MAILER_EMAIL = process.env.MAILER_EMAIL as string;
export const MAILER_PASSWORD = process.env.MAILER_PASSWORD as string;
export const MAILER_FROM_NAME = process.env.MAILER_FROM_NAME || "Waste Route Optimizer";
export const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET as string;
export const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET as string;
export const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY as string;
export const REDIS_HOST = process.env.REDIS_HOST as string;
export const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);
export const REDIS_PASSWORD = process.env.REDIS_PASSWORD as string;
export const SERVICE_ACCOUNT = process.env.SERVICE_ACCOUNT as string;
// Road network download (OpenStreetMap). Defaults live in @wcro/road-network.
export const OVERPASS_URL = process.env.OVERPASS_URL || undefined;
export const NOMINATIM_URL = process.env.NOMINATIM_URL || undefined;
/** Skip the Nominatim lookup by giving the OSM relation id of the city boundary. */
export const OSM_RELATION_ID = process.env.OSM_RELATION_ID ? Number(process.env.OSM_RELATION_ID) : undefined;
/** Request body limit; route files with many collection points exceed express's 100kb default. */
export const BODY_LIMIT = process.env.BODY_LIMIT || "5mb";
/** Requests per IP per 15 minutes in production (the Next.js server's page loads count against one IP). */
export const RATE_LIMIT = Number(process.env.RATE_LIMIT || 100);
