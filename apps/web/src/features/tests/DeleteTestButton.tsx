"use client";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import { deleteTestRun } from "@/lib/api";

/** Two-step delete for a test run in the History table: press once to arm, press again to confirm. */
export function DeleteTestButton({ id }: { id: string }) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteTestRun(id);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
      setArmed(false);
    }
  };

  if (!armed) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button size="sm" variant="ghost" onClick={() => setArmed(true)} aria-label={`Delete test run ${id}`}>
          <Trash2 className="size-4" aria-hidden />
          Delete
        </Button>
        {error && <p className="max-w-48 text-right text-xs text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button size="sm" onClick={remove} disabled={busy} className="!border-danger !text-danger">
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
        Confirm
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setArmed(false)} disabled={busy}>
        Cancel
      </Button>
    </div>
  );
}
