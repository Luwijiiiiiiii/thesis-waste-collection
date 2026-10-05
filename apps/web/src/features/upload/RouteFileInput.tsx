"use client";
// Upload Route Definition File (notebook CELLS 7–8)
import { useRef, useState } from "react";
import { Download, FileJson, FlaskConical, FolderOpen, Loader2, RefreshCw, UploadCloud } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui";

export const SAMPLE_URL = "/samples/baguio-sample-route.json";
export const SAMPLE_NAME = "baguio-sample-route.json";

type OnLoad = (fileName: string, text: string) => void;

/** Shared file-reading logic: picked file, dropped file, or the bundled sample */
function useRouteFileSource(onLoad: OnLoad) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loadingSample, setLoadingSample] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readFile = async (file: File) => {
    setError(null);
    try {
      onLoad(file.name, await file.text());
    } catch {
      setError("That file couldn't be read. Try another one.");
    }
  };

  const loadSample = async () => {
    setLoadingSample(true);
    setError(null);
    try {
      const res = await fetch(SAMPLE_URL);
      if (!res.ok) throw new Error(String(res.status));
      onLoad(SAMPLE_NAME, await res.text());
    } catch {
      setError("The sample route couldn't be loaded. Check your connection and try again.");
    } finally {
      setLoadingSample(false);
    }
  };

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="application/json,.json"
      className="hidden"
      aria-label="Choose a route JSON file"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) void readFile(file);
        e.target.value = "";
      }}
    />
  );

  return { inputRef, input, readFile, loadSample, loadingSample, error };
}

/** Large drag-and-drop target shown before any file is loaded */
export function DropZone({ onLoad }: { onLoad: OnLoad }) {
  const { inputRef, input, readFile, loadSample, loadingSample, error } = useRouteFileSource(onLoad);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) void readFile(file);
      }}
      className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors duration-200 sm:p-8 ${
        dragging ? "border-brand bg-brand-soft" : "border-line-strong bg-surface"
      }`}
    >
      <span
        className={`mx-auto grid size-14 place-items-center rounded-2xl transition-transform duration-200 ${
          dragging ? "scale-110 bg-brand text-white" : "bg-brand-soft text-brand-ink"
        }`}
        aria-hidden
      >
        <UploadCloud className="size-7" />
      </span>
      <h2 className="mt-4 text-lg font-semibold tracking-tight">{dragging ? "Drop to load" : "Drop your route file here"}</h2>
      <p className="mx-auto mt-1 max-w-xs text-sm leading-6 text-muted">
        A <span className="num">.json</span> file (schema 1.0) with the garage and collection points.
      </p>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button variant="primary" size="lg" onClick={loadSample} disabled={loadingSample}>
          {loadingSample ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <FlaskConical className="size-4" aria-hidden />}
          {loadingSample ? "Loading sample…" : "Try the Baguio sample"}
        </Button>
        <Button size="lg" onClick={() => inputRef.current?.click()}>
          <FolderOpen className="size-4" aria-hidden />
          Browse files
        </Button>
      </div>
      {input}

      {error && (
        <p role="alert" className="mx-auto mt-4 max-w-sm rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <a href={SAMPLE_URL} download className={buttonClasses("ghost", "sm", "mt-4")}>
        <Download className="size-4" aria-hidden />
        Download the JSON template
      </a>
    </div>
  );
}

/** Compact "current file" row with a replace action, used once a file is loaded */
export function LoadedFile({
  fileName,
  pointCount,
  onLoad,
}: {
  fileName: string;
  pointCount?: number;
  onLoad: OnLoad;
}) {
  const { inputRef, input, error } = useRouteFileSource(onLoad);
  return (
    <div>
      <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/60 p-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-ink" aria-hidden>
          <FileJson className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="num line-clamp-2 break-all text-sm font-medium leading-5" title={fileName}>
            {fileName}
          </p>
          {pointCount !== undefined && <p className="text-xs text-muted">{pointCount} collection points</p>}
        </div>
        <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()}>
          <RefreshCw className="size-3.5" aria-hidden />
          Replace
        </Button>
      </div>
      {input}
      {error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
