"use client";
// Accessible tabs (WAI-ARIA tabs pattern: arrow keys, Home/End, roving tabindex)
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: ReactNode;
  content: ReactNode;
}

export function Tabs({ items, initial, label }: { items: TabItem[]; initial?: string; label: string }) {
  const uid = useId();
  const [active, setActive] = useState(initial ?? items[0]?.id);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const move = (e: KeyboardEvent, index: number) => {
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % items.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else return;
    e.preventDefault();
    setActive(items[next].id);
    refs.current[items[next].id]?.focus();
  };

  return (
    <div>
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div role="tablist" aria-label={label} className="flex w-max min-w-full gap-1 border-b border-line sm:w-full">
          {items.map((t, i) => {
            const selected = t.id === active;
            return (
              <button
                type="button"
                key={t.id}
                ref={(el) => {
                  refs.current[t.id] = el;
                }}
                role="tab"
                data-tour={`tab-${t.id}`}
                id={`${uid}-tab-${t.id}`}
                aria-selected={selected}
                aria-controls={`${uid}-panel-${t.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(t.id)}
                onKeyDown={(e) => move(e, i)}
                className={`-mb-px inline-flex min-h-11 items-center gap-2 whitespace-nowrap border-b-2 px-3.5 text-sm font-medium transition-colors duration-200 ${
                  selected ? "border-brand text-brand-ink" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                <span aria-hidden className="grid place-items-center">
                  {t.icon}
                </span>
                {t.label}
                {t.badge}
              </button>
            );
          })}
        </div>
      </div>
      {items.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`${uid}-panel-${t.id}`}
          aria-labelledby={`${uid}-tab-${t.id}`}
          hidden={t.id !== active}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: WAI-ARIA tabs pattern makes the panel focusable
          tabIndex={0}
          className="pt-5 focus-visible:outline-offset-4"
        >
          {t.id === active && <div className="animate-fade">{t.content}</div>}
        </div>
      ))}
    </div>
  );
}
