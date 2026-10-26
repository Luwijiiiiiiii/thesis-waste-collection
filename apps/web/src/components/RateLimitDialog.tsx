"use client";
import { Hourglass } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui";
import { dismissRateLimit, getRateLimitNotice, subscribeRateLimit } from "@/lib/rate-limit";

const formatWait = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/** Modal shown whenever the API rate limit is hit (reportRateLimit), with a countdown until calls work again. */
export function RateLimitDialog() {
  const notice = useSyncExternalStore(subscribeRateLimit, getRateLimitNotice, () => null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [now, setNow] = useState(() => Date.now());

  // Native <dialog>: showModal() traps focus, Esc closes it, and the page behind becomes inert
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (notice && !dialog.open) {
      dialog.showModal();
      // The main action takes focus, not "Stop testing" (which would otherwise be first)
      dialog.querySelector<HTMLButtonElement>("[data-primary]")?.focus();
    } else if (!notice && dialog.open) dialog.close();
  }, [notice]);

  useEffect(() => {
    if (!notice) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [notice]);

  const remaining = notice ? Math.max(0, Math.ceil((notice.until - now) / 1000)) : 0;
  const elapsed = notice ? Math.min(1, (now - notice.from) / Math.max(1, notice.until - notice.from)) : 0;

  return (
    <dialog
      ref={dialogRef}
      onClose={dismissRateLimit}
      aria-labelledby="rate-limit-title"
      aria-describedby="rate-limit-text"
      className="m-auto w-[min(calc(100%-2rem),28rem)] rounded-2xl border border-line bg-surface p-0 text-ink shadow-pop backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm open:animate-rise"
    >
      {notice && (
        <div className="p-5 sm:p-6">
          <span className="grid size-11 place-items-center rounded-xl bg-warn-soft text-warn" aria-hidden>
            <Hourglass className="size-5" />
          </span>
          <h2 id="rate-limit-title" className="mt-4 text-lg font-semibold tracking-tight text-balance">
            Please wait for your API calls to be refreshed
          </h2>
          <p id="rate-limit-text" className="mt-1.5 text-pretty text-sm leading-6 text-muted">
            You are currently experiencing rate limiting. The server accepts a limited number of runs and changes every
            15 minutes, and they have been used up for now.{notice.note && ` ${notice.note}`}
          </p>

          <div className="mt-5 rounded-xl bg-surface-2 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-muted">
                {remaining > 0 ? "Ready again in" : "Your API calls are ready"}
              </span>
              <span role="timer" className="num text-xl font-semibold">
                {remaining > 0 ? formatWait(remaining) : "Now"}
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
              <div
                className="h-full origin-left rounded-full bg-warn transition-transform duration-1000 ease-linear motion-reduce:transition-none"
                style={{ transform: `scaleX(${elapsed})` }}
              />
            </div>
          </div>
          <p aria-live="polite" className="sr-only">
            {remaining === 0 ? "Your API calls are ready. You can try again now." : ""}
          </p>

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            {notice.action && (
              <Button
                onClick={() => {
                  notice.action?.run();
                  dismissRateLimit();
                }}
              >
                {notice.action.label}
              </Button>
            )}
            <Button variant="primary" data-primary onClick={dismissRateLimit}>
              {remaining > 0 && notice.action ? "Keep waiting" : "Got it"}
            </Button>
          </div>
        </div>
      )}
    </dialog>
  );
}
