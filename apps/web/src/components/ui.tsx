import type { ReactNode } from "react";

/* ---------- Surfaces ---------- */

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <section className={`rounded-2xl border border-line bg-surface shadow-card ${className}`}>{children}</section>;
}

export function CardHeader({
  title,
  description,
  icon,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span
            className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-ink"
            aria-hidden
          >
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-6 tracking-tight">{title}</h2>
          {description && <p className="mt-0.5 text-sm leading-5 text-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function CardBody({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-ink">{eyebrow}</p>}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{title}</h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-pretty text-sm leading-6 text-muted sm:text-base">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ---------- Badges ---------- */

type Tone = "neutral" | "ok" | "danger" | "warn" | "traditional" | "brand";
const toneClasses: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted",
  ok: "bg-optimized-soft text-optimized",
  danger: "bg-danger-soft text-danger",
  warn: "bg-warn-soft text-warn",
  traditional: "bg-traditional-soft text-traditional",
  brand: "bg-brand-soft text-brand-ink",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

/* ---------- Buttons ---------- */

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

export function buttonClasses(variant: ButtonVariant = "secondary", size: ButtonSize = "md", className = "") {
  const base =
    "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";
  const sizes: Record<ButtonSize, string> = {
    sm: "min-h-9 px-3 text-sm",
    md: "min-h-11 px-4 text-sm",
    lg: "min-h-12 px-5 text-base",
  };
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-brand text-white shadow-sm hover:bg-[color-mix(in_srgb,var(--brand)_88%,black)]",
    secondary: "border border-line-strong bg-surface text-ink hover:bg-surface-2",
    ghost: "text-muted hover:bg-surface-2 hover:text-ink",
  };
  return `${base} ${sizes[size]} ${variants[variant]} ${className}`;
}

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type="button" className={buttonClasses(variant, size, className)} {...props} />;
}

/* ---------- Data display ---------- */

export function KeyValue({ items, columns = 2 }: { items: [string, ReactNode][]; columns?: 1 | 2 | 3 }) {
  const cols = columns === 3 ? "sm:grid-cols-2 xl:grid-cols-3" : columns === 2 ? "sm:grid-cols-2" : "";
  return (
    <dl className={`grid grid-cols-1 gap-x-8 gap-y-1 text-sm ${cols}`}>
      {items.map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between gap-4 border-b border-line py-2.5">
          <dt className="text-muted">{k}</dt>
          <dd className="min-w-0 text-right font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Scrollable data table with a sticky header and consistent cell styling */
export function Table({ children, maxHeight }: { children: ReactNode; maxHeight?: string }) {
  return (
    <div className="overflow-auto rounded-xl border border-line" style={maxHeight ? { maxHeight } : undefined}>
      <table
        className={[
          "w-full min-w-[560px] border-collapse text-sm",
          "[&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-10 [&_thead_th]:bg-surface-2",
          "[&_th]:whitespace-nowrap [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-muted",
          "[&_td]:border-t [&_td]:border-line [&_td]:px-4 [&_td]:py-3 [&_td.num]:whitespace-nowrap",
          "[&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-surface-2/70",
        ].join(" ")}
      >
        {children}
      </table>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand-ink" aria-hidden>
        {icon}
      </span>
      <h2 className="mt-4 text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 max-w-sm text-sm leading-6 text-muted">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
