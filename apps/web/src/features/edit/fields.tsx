"use client";
// Inputs for editing route details. Each keeps what the user is typing locally and only
// reports values that pass its own check, so a half-typed entry never reaches validation.
import { useEffect, useId, useState } from "react";

const inputBase =
  "w-full rounded-lg border bg-surface px-3 text-sm text-ink placeholder:text-muted/70 focus-visible:outline-2 focus-visible:outline-brand";

const inputClass = (invalid: boolean, compact: boolean) =>
  `${inputBase} ${compact ? "min-h-9" : "min-h-11"} ${invalid ? "border-danger" : "border-line-strong"}`;

interface FieldShell {
  label: string;
  /** Table cells hide the label visually but keep it for screen readers */
  compact?: boolean;
  hint?: string;
}

function Shell({
  id,
  label,
  compact,
  hint,
  error,
  children,
}: FieldShell & { id: string; error: string | null; children: React.ReactNode }) {
  return (
    <div className={compact ? "min-w-0" : "min-w-0 space-y-1.5"}>
      <label htmlFor={id} className={compact ? "sr-only" : "block text-sm font-medium"}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-msg`} className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-msg`} className="text-xs text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export function TextField({
  value,
  onChange,
  required = false,
  placeholder,
  list,
  maxLength = 80,
  className = "",
  ...shell
}: FieldShell & {
  value: string;
  /** Receives undefined when an optional field is emptied */
  onChange: (v: string | undefined) => void;
  required?: boolean;
  placeholder?: string;
  list?: string;
  maxLength?: number;
  className?: string;
}) {
  const id = useId();
  const [text, setText] = useState(value);
  // Follow outside changes (undo, revert, a new file)
  useEffect(() => setText(value), [value]);

  const error = required && text.trim() === "" ? "Required" : null;

  return (
    <Shell id={id} error={error} {...shell}>
      <input
        id={id}
        type="text"
        value={text}
        maxLength={maxLength}
        placeholder={placeholder}
        list={list}
        aria-invalid={Boolean(error)}
        aria-describedby={error || shell.hint ? `${id}-msg` : undefined}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          if (next.trim() !== "") onChange(next);
          else if (!required) onChange(undefined);
        }}
        onBlur={() => {
          if (error) setText(value);
        }}
        className={`${inputClass(Boolean(error), Boolean(shell.compact))} ${className}`}
      />
    </Shell>
  );
}

const parseNumber = (t: string) => (t.trim() === "" ? undefined : Number(t));

export function NumberField({
  value,
  onChange,
  min,
  unit,
  placeholder,
  ...shell
}: FieldShell & {
  value: number | undefined;
  /** Receives undefined when emptied, meaning "use the default" */
  onChange: (v: number | undefined) => void;
  /** "positive" = greater than 0, "nonnegative" = 0 or more */
  min: "positive" | "nonnegative";
  unit?: string;
  placeholder?: string;
}) {
  const id = useId();
  const [text, setText] = useState(value === undefined ? "" : String(value));
  // Follow outside changes, but keep in-progress text like "56." that already parses to the value
  useEffect(() => {
    setText((t) => (parseNumber(t) === value ? t : value === undefined ? "" : String(value)));
  }, [value]);

  const parsed = parseNumber(text);
  let error: string | null = null;
  if (parsed !== undefined) {
    if (!Number.isFinite(parsed)) error = "Enter a number";
    else if (min === "positive" && parsed <= 0) error = "Must be greater than 0";
    else if (min === "nonnegative" && parsed < 0) error = "Can't be negative";
  }

  return (
    <Shell id={id} error={error} {...shell}>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={text}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error || shell.hint ? `${id}-msg` : undefined}
          onChange={(e) => {
            const next = e.target.value;
            setText(next);
            const n = parseNumber(next);
            const ok = n === undefined || (Number.isFinite(n) && (min === "positive" ? n > 0 : n >= 0));
            if (ok) onChange(n);
          }}
          onBlur={() => {
            if (error) setText(value === undefined ? "" : String(value));
          }}
          className={`${inputClass(Boolean(error), Boolean(shell.compact))} num ${unit ? "pr-14" : ""}`}
        />
        {unit && (
          <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-xs text-muted">
            {unit}
          </span>
        )}
      </div>
    </Shell>
  );
}
