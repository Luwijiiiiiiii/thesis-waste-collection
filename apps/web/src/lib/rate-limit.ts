// The API answers 429 once this browser's IP has used up its write/simulate budget (see apps/api/src/app.ts).
// Client code that gets one calls reportRateLimit, and <RateLimitDialog /> in the root layout explains the wait.

export const RATE_LIMIT_MESSAGE =
  "Please wait for your API calls to be refreshed. You are currently experiencing rate limiting.";

/** Used when a 429 has no readable Retry-After header; long enough to outlast most of the API's 15-minute window */
const DEFAULT_RETRY_AFTER_SECONDS = 180;

/** Seconds to wait before the API accepts writes again, from a 429 response */
export function retryAfterSeconds(res: Response): number {
  const header = Number(res.headers.get("Retry-After"));
  return Number.isFinite(header) && header > 0 ? header : DEFAULT_RETRY_AFTER_SECONDS;
}

export interface RateLimitNotice {
  /** When the wait started and ends (ms since epoch) */
  from: number;
  until: number;
  /** Extra sentence about what is waiting, e.g. a paused test batch */
  note?: string;
  /** Optional second button, e.g. stopping the paused test batch */
  action?: { label: string; run: () => void };
}

let notice: RateLimitNotice | null = null;
const listeners = new Set<() => void>();
const emit = () => {
  for (const listener of listeners) listener();
};

export function reportRateLimit(seconds: number, extra?: Pick<RateLimitNotice, "note" | "action">) {
  const from = Date.now();
  notice = { from, until: from + seconds * 1000, ...extra };
  emit();
}

export function dismissRateLimit() {
  if (!notice) return;
  notice = null;
  emit();
}

/** For useSyncExternalStore */
export function subscribeRateLimit(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getRateLimitNotice = () => notice;
