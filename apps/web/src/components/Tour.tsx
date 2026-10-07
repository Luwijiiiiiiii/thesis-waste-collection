"use client";
// In-page guided tour: scrolls to each part of the screen, spotlights it and explains it.
// Each screen registers its own tour (useTour); the "?" buttons replay the current screen's tour.
// Targets are plain `data-tour="…"` attributes, so tours never reach into component internals.
//
// Motion: one requestAnimationFrame loop drives the page scroll, the spotlight and the card together,
// writing styles straight to the DOM (no React render per frame). Each step morphs from wherever the
// previous one is on screen, so steps never blank out or lag behind the scroll.
import { useEffect, useLayoutEffect, useRef, useSyncExternalStore, type KeyboardEvent, type RefObject } from "react";
import { ArrowLeft, ArrowRight, HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui";

export interface TourStep {
  /** `data-tour` value of the element to spotlight */
  target: string;
  title: string;
  text: string;
  /** Click the target when the step starts (used to open a tab) */
  activate?: boolean;
}
export interface TourDef {
  id: string;
  steps: TourStep[];
  /** `data-tour` of an element to click when the tour ends (puts tabs back) */
  resetTo?: string;
}

/* ---------- Store ---------- */

interface State {
  registered: TourDef | null;
  active: { tour: TourDef; index: number } | null;
}
let state: State = { registered: null, active: null };
const listeners = new Set<() => void>();
const set = (next: Partial<State>) => {
  state = { ...state, ...next };
  for (const l of listeners) l();
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const useTourState = () =>
  useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );

const seenKey = (id: string) => `tour.${id}.seen`;
const hasSeen = (id: string) => {
  try {
    return localStorage.getItem(seenKey(id)) === "1";
  } catch {
    return true; // storage blocked: don't auto-start on every visit
  }
};

export function startTour() {
  if (state.registered) set({ active: { tour: state.registered, index: 0 } });
}

function endTour() {
  const tour = state.active?.tour;
  if (!tour) return;
  try {
    localStorage.setItem(seenKey(tour.id), "1");
  } catch {}
  set({ active: null });
  if (tour.resetTo) findTarget(tour.resetTo)?.click();
}

/** The first visible element with this `data-tour` (layouts render some twice: sidebar vs top bar) */
function findTarget(name: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

/**
 * Registers `tour` for this screen. It starts by itself the first time:
 * on mount, or – with `whenVisible` – once that element scrolls into view.
 */
export function useTour(tour: TourDef, whenVisible?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    set({ registered: tour });
    let timer: ReturnType<typeof setTimeout> | undefined;
    let io: IntersectionObserver | undefined;
    if (!hasSeen(tour.id)) {
      const el = whenVisible?.current;
      if (el) {
        io = new IntersectionObserver(
          ([entry]) => {
            if (!entry.isIntersecting) return;
            io?.disconnect();
            if (!state.active) startTour();
          },
          { threshold: 0.35 },
        );
        io.observe(el);
      } else {
        // Just past the screen's entrance animation (animate-rise, 320ms)
        timer = setTimeout(() => !state.active && startTour(), 350);
      }
    }
    return () => {
      clearTimeout(timer);
      io?.disconnect();
      if (state.registered === tour) set({ registered: null });
      if (state.active?.tour === tour) set({ active: null });
    };
  }, [tour, whenVisible]);
}

/** Registers a tour for screens that can't call the hook directly (server pages, one branch of a component) */
export function ScreenTour({ tour }: { tour: TourDef }) {
  useTour(tour);
  return null;
}

/* ---------- Geometry ---------- */

const PAD = 6; // spotlight padding around the target
const GAP = 14; // between spotlight and card
const EDGE = 16; // viewport margin
const MOBILE_TOP = 80; // below the sticky top bar on phones
const EXIT_MS = 180;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
type Side = "below" | "above" | "pinned";

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpBox = (a: Box, b: Box, t: number): Box => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  w: lerp(a.w, b.w, t),
  h: lerp(a.h, b.h, t),
});
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max));

const spotOf = (el: HTMLElement): Box => {
  const r = el.getBoundingClientRect();
  return { x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 };
};

const fits = (side: Side, s: Box, h: number) =>
  side === "below" ? s.y + s.h + GAP + h <= window.innerHeight - EDGE : side === "above" ? s.y - GAP - h >= EDGE : true;
const pickSide = (s: Box, h: number, keep?: Side): Side =>
  keep && keep !== "pinned" && fits(keep, s, h)
    ? keep
    : fits("below", s, h)
      ? "below"
      : fits("above", s, h)
        ? "above"
        : "pinned";

/** Card's top-left for a spotlight box on a given side */
const cardAt = (s: Box, side: Side, w: number, h: number) => ({
  x: clamp(s.x + s.w / 2 - w / 2, EDGE, window.innerWidth - EDGE - w),
  y: side === "below" ? s.y + s.h + GAP : side === "above" ? s.y - GAP - h : window.innerHeight - EDGE - h,
});

/** Horizontally scrollable ancestors (e.g. the tab strip on phones) and where each should scroll to */
function innerScrolls(el: HTMLElement) {
  const out: { node: HTMLElement; from: number; to: number }[] = [];
  for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
    const ox = getComputedStyle(n).overflowX;
    if ((ox === "auto" || ox === "scroll") && n.scrollWidth > n.clientWidth) {
      const r = el.getBoundingClientRect();
      const nr = n.getBoundingClientRect();
      const to = clamp(n.scrollLeft + r.left - nr.left - (nr.width - r.width) / 2, 0, n.scrollWidth - n.clientWidth);
      out.push({ node: n, from: n.scrollLeft, to });
    }
  }
  return out;
}

/* ---------- Overlay ---------- */

export function TourOverlay() {
  const { active } = useTourState();
  if (!active) return null;
  return <Overlay tour={active.tour} index={active.index} />;
}

function Overlay({ tour, index }: { tour: TourDef; index: number }) {
  const step = tour.steps[index];
  const last = tour.steps.length - 1;
  const rootRef = useRef<HTMLDivElement>(null);
  const spotRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  // What's on screen right now – the next step morphs from here
  const shown = useRef<{ spot: Box; card: { x: number; y: number } | null; side?: Side } | null>(null);
  const closing = useRef(false);

  const goto = (i: number) => !closing.current && set({ active: { tour, index: i } });
  const close = () => {
    if (closing.current) return;
    closing.current = true;
    rootRef.current?.setAttribute("data-closing", "");
    setTimeout(endTour, EXIT_MS);
  };

  // Remember and restore focus around the whole tour
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    return () => before?.focus?.();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: the motion restarts only when the step changes
  useLayoutEffect(() => {
    const spotEl = spotRef.current;
    const cardEl = cardRef.current;
    if (!spotEl || !cardEl) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = matchMedia("(max-width: 639px)").matches;
    let frame = 0;
    let tries = 0;

    const paint = (spot: Box, card: { x: number; y: number } | null) => {
      spotEl.style.transform = `translate3d(${spot.x}px, ${spot.y}px, 0)`;
      spotEl.style.width = `${spot.w}px`;
      spotEl.style.height = `${spot.h}px`;
      if (card) cardEl.style.transform = `translate3d(${card.x}px, ${card.y}px, 0)`;
      cardEl.setAttribute("data-ready", "");
    };

    const start = (el: HTMLElement) => {
      if (step.activate) el.click();
      const inner = innerScrolls(el);
      for (const s of inner) s.node.scrollLeft = s.to; // measure as if already scrolled sideways
      const cw = cardEl.offsetWidth;
      const ch = cardEl.offsetHeight;
      const now = spotOf(el);
      for (const s of inner) s.node.scrollLeft = s.from;

      // Where the page should scroll so the target (and, on desktop, the card under it) is in view
      const vh = window.innerHeight;
      const block = mobile ? now.h : now.h + GAP + ch;
      const wantTop = mobile ? MOBILE_TOP : block <= vh - EDGE * 2 ? (vh - block) / 2 : EDGE;
      const maxScroll = document.documentElement.scrollHeight - vh;
      const fromY = window.scrollY;
      const toY = clamp(fromY + now.y - wantTop, 0, maxScroll);
      const endSpot = { ...now, y: now.y - (toY - fromY) };
      const side = mobile ? undefined : pickSide(endSpot, ch, shown.current?.side);

      // First step grows out of the screen centre
      const fromSpot = shown.current?.spot ?? {
        x: endSpot.x + endSpot.w / 2,
        y: endSpot.y + endSpot.h / 2,
        w: 0,
        h: 0,
      };
      const fromCard = shown.current?.card ?? (side ? cardAt(endSpot, side, cw, ch) : null);
      const dist = Math.abs(toY - fromY) + Math.hypot(endSpot.x - fromSpot.x, endSpot.y - fromSpot.y);
      const duration = reduce ? 0 : clamp(320 + dist * 0.25, 360, 620);
      const t0 = performance.now();

      const tick = (ts: number) => {
        const p = duration ? Math.min((ts - t0) / duration, 1) : 1;
        const e = easeInOutCubic(p);
        if (fromY !== toY) window.scrollTo(0, lerp(fromY, toY, e));
        for (const s of inner) s.node.scrollLeft = lerp(s.from, s.to, e);
        // Morph towards where the target will sit once the scroll ends (its live position projected to
        // the final scroll). The path stays monotonic, and layout shifts mid-way are still absorbed.
        const live = spotOf(el);
        const dest = { ...live, y: live.y + window.scrollY - toY };
        const spot = p < 1 ? lerpBox(fromSpot, dest, e) : live;
        let card: { x: number; y: number } | null = null;
        let s = side;
        if (s) {
          if (p === 1) s = pickSide(live, cardEl.offsetHeight, s);
          const to = cardAt(p < 1 ? dest : live, s, cw, cardEl.offsetHeight);
          card = p < 1 && fromCard ? { x: lerp(fromCard.x, to.x, e), y: lerp(fromCard.y, to.y, e) } : to;
        }
        paint(spot, card);
        shown.current = { spot, card, side: s };
        if (p < 1) frame = requestAnimationFrame(tick);
        else frame = requestAnimationFrame(follow);
      };

      // After arriving: stick to the target (user scrolls, maps resizing) without re-animating
      const follow = () => {
        if (!el.isConnected) return;
        const spot = spotOf(el);
        const prev = shown.current;
        let card = prev?.card ?? null;
        let s = prev?.side;
        if (s) {
          s = pickSide(spot, cardEl.offsetHeight, s);
          card = cardAt(spot, s, cardEl.offsetWidth, cardEl.offsetHeight);
        }
        const p = prev?.spot;
        if (!p || p.x !== spot.x || p.y !== spot.y || p.w !== spot.w || p.h !== spot.h || prev?.side !== s) {
          paint(spot, card);
          shown.current = { spot, card, side: s };
        }
        frame = requestAnimationFrame(follow);
      };

      tick(performance.now()); // first frame now, not one frame late
    };

    // The target may still be mounting (tab content, maps); give it ~1s, then skip the step
    const find = () => {
      const el = findTarget(step.target);
      if (el) return start(el);
      if (++tries > 60) return index < last ? goto(index + 1) : close();
      frame = requestAnimationFrame(find);
    };
    find();
    return () => cancelAnimationFrame(frame);
  }, [step, index]);

  // Focus moves to Next on every step so Enter keeps going
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run per step
  useEffect(() => {
    cardRef.current?.querySelector<HTMLElement>("[data-tour-next]")?.focus({ preventScroll: true });
  }, [index]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
    else if (e.key === "ArrowRight" && index < last) goto(index + 1);
    else if (e.key === "ArrowLeft" && index > 0) goto(index - 1);
    else if (e.key === "Tab") {
      // Keep focus inside the card
      const focusable = cardRef.current?.querySelectorAll<HTMLElement>("button");
      if (!focusable?.length) return;
      const first = focusable[0];
      const lastEl = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        first.focus();
      }
    } else return;
    if (e.key !== "Tab") e.preventDefault();
  };

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[1500] animate-fade data-[closing]:animate-[fade_180ms_ease-in_reverse_both]"
    >
      {/* Blocks the page while touring; the spotlight's shadow does the dimming */}
      <div className="absolute inset-0" aria-hidden />
      <div
        ref={spotRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 size-0 rounded-2xl ring-2 ring-brand will-change-transform"
        style={{ boxShadow: "0 0 0 200vmax rgb(2 6 23 / 0.6)" }}
      />

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-text"
        onKeyDown={onKeyDown}
        // Desktop: positioned by transform from the motion loop. Phones: a sheet pinned to the bottom.
        className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] rounded-2xl border border-line bg-surface p-4 text-ink opacity-0 shadow-pop transition-opacity duration-200 will-change-transform data-[ready]:opacity-100 sm:inset-auto sm:left-0 sm:top-0 sm:w-[360px]"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="num text-xs font-semibold uppercase tracking-[0.12em] text-brand-ink">
            {index + 1} of {tour.steps.length}
          </p>
          <button
            type="button"
            onClick={close}
            aria-label="End tour"
            className="-mr-2 -mt-2 grid size-9 place-items-center rounded-lg text-muted transition-colors duration-200 hover:bg-surface-2 hover:text-ink"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <div key={index} className="animate-fade" aria-live="polite">
          <h2 id="tour-title" className="mt-1 text-lg font-semibold tracking-tight text-balance">
            {step.title}
          </h2>
          <p id="tour-text" className="mt-1 text-pretty text-sm leading-6 text-muted">
            {step.text}
          </p>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <ol className="flex flex-1 items-center gap-1" aria-hidden>
            {tour.steps.map((s, i) => (
              <li
                key={s.target}
                className={`h-1.5 rounded-full transition-[width,background-color] duration-300 ${
                  i === index ? "w-5 bg-brand" : i < index ? "w-1.5 bg-brand/50" : "w-1.5 bg-line-strong"
                }`}
              />
            ))}
          </ol>
          {index === 0 ? (
            <Button size="sm" variant="ghost" onClick={close}>
              Skip
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => goto(index - 1)}>
              <ArrowLeft className="size-4" aria-hidden />
              Back
            </Button>
          )}
          <Button data-tour-next size="sm" variant="primary" onClick={() => (index < last ? goto(index + 1) : close())}>
            {index < last ? "Next" : "Done"}
            {index < last && <ArrowRight className="size-4" aria-hidden />}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- "?" button ---------- */

/** Replays the current screen's tour; hidden on screens without one */
export function HelpButton({ className = "", label = false }: { className?: string; label?: boolean }) {
  const { registered } = useTourState();
  if (!registered) return null;
  if (label) {
    return (
      <button
        type="button"
        onClick={startTour}
        className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-brand-ink transition-colors duration-200 hover:bg-brand-soft ${className}`}
      >
        <HelpCircle className="size-[18px]" aria-hidden />
        Show me around
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={startTour}
      data-tour="help"
      aria-label="Show a quick tour of this screen"
      title="Quick tour"
      className={`grid size-11 place-items-center rounded-xl text-muted transition-colors duration-200 hover:bg-surface-2 hover:text-ink ${className}`}
    >
      <HelpCircle className="size-5" aria-hidden />
    </button>
  );
}
