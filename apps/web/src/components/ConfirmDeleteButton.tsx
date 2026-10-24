"use client";
import { Loader2, Trash2 } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui";

/** Two-step delete: press once to arm, press Confirm to run `onConfirm`. Errors are shown under the button. */
export function ConfirmDeleteButton({
  children,
  confirmLabel = "Confirm",
  warning,
  onConfirm,
  disabled,
}: {
  children: ReactNode;
  confirmLabel?: string;
  /** Shown next to Confirm, e.g. "Deletes 12 runs" */
  warning?: string;
  onConfirm: () => Promise<void>;
  disabled?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      setArmed(false);
    }
  };

  if (!armed) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button
          onClick={() => {
            setError(null);
            setArmed(true);
          }}
          disabled={disabled}
        >
          <Trash2 className="size-4" aria-hidden />
          {children}
        </Button>
        {error && (
          <p role="alert" className="max-w-64 text-right text-xs text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {warning && <p className="text-sm text-danger">{warning}</p>}
      <Button onClick={confirm} disabled={busy} className="!border-danger !text-danger">
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
        {confirmLabel}
      </Button>
      <Button variant="ghost" onClick={() => setArmed(false)} disabled={busy}>
        Cancel
      </Button>
    </div>
  );
}
