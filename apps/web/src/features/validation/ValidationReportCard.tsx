// JSON Validation Report (notebook CELL 9) – compact, expandable summary
import type { ValidationReport } from "@wcro/core";
import { CheckCircle2, ChevronDown, XCircle } from "lucide-react";

export function ValidationReportCard({ report }: { report: ValidationReport }) {
  const failed = report.total - report.score;
  return (
    <details
      // Failures open themselves so the user sees what to fix without hunting
      key={report.passed ? "ok" : "fail"}
      open={!report.passed}
      className={`group rounded-xl border ${report.passed ? "border-line" : "border-danger/40"}`}
    >
      <summary
        className={`flex min-h-12 list-none items-center gap-3 rounded-xl px-3 py-2.5 [&::-webkit-details-marker]:hidden ${
          report.passed ? "" : "bg-danger-soft"
        }`}
      >
        {report.passed ? (
          <CheckCircle2 className="size-5 shrink-0 text-optimized" aria-hidden />
        ) : (
          <XCircle className="size-5 shrink-0 text-danger" aria-hidden />
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium leading-5">
            {report.passed ? "Route file is valid" : `${failed} validation ${failed === 1 ? "check" : "checks"} failed`}
          </span>
          <span className="block text-xs text-muted">
            <span className="num">
              {report.score}/{report.total}
            </span>{" "}
            checks passed
          </span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180" aria-hidden />
        <span className="sr-only">Toggle validation details</span>
      </summary>

      <ul className="space-y-0.5 border-t border-line px-3 py-2">
        {report.checks.map((check) => (
          <li key={check.key} className="py-1.5">
            <div className="flex items-start gap-2.5 text-sm">
              {check.passed ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-optimized" aria-label="Passed" />
              ) : (
                <XCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-label="Failed" />
              )}
              <span className={check.passed ? "text-muted" : "font-medium"}>{check.label}</span>
            </div>
            {check.errors.length > 0 && (
              <ul className="ml-[26px] mt-1.5 space-y-1">
                {check.errors.map((err, i) => (
                  <li key={i} className="rounded-md bg-danger-soft px-2.5 py-1.5 text-xs leading-5 text-danger">
                    {err}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
