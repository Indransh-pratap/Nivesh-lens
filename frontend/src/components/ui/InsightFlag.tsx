import * as React from "react";
import { AlertTriangle, ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface InsightFlagProps {
  severity: "danger" | "warning";
  icon?: LucideIcon;
  headline: React.ReactNode;
  why: string;
  fixLabel: string;
  onFix: () => void;
  className?: string;
}

/**
 * A flagged issue always answers three questions in order:
 * what is wrong, why it matters, and what to do about it.
 * Never just a colored banner with a number.
 */
export function InsightFlag({
  severity,
  icon: Icon = AlertTriangle,
  headline,
  why,
  fixLabel,
  onFix,
  className,
}: InsightFlagProps) {
  const tone = severity === "danger" ? "var(--negative)" : "var(--warning)";
  const softBg = severity === "danger" ? "bg-[var(--negative-soft)] border-[var(--negative)]/20" : "bg-[var(--warning-soft)] border-[var(--warning)]/20";

  return (
    <div className={cn("p-4 rounded-[var(--radius-lg)] border", softBg, className)}>
      <div className="flex items-start gap-2.5">
        <Icon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: tone }} strokeWidth={1.75} />
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="text-[13px] font-semibold" style={{ color: tone }}>
            {headline}
          </div>
          <p className="text-[13px] text-foreground/85 leading-relaxed">
            <span className="text-muted-foreground font-medium">Why it matters — </span>
            {why}
          </p>
          <button
            onClick={onFix}
            className="inline-flex items-center gap-1 text-[13px] font-medium hover:underline cursor-pointer mt-1"
            style={{ color: tone }}
          >
            <span>{fixLabel}</span>
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
