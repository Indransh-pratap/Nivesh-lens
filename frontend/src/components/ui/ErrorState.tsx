import * as React from "react";
import { AlertOctagon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  title = "Something didn't sync",
  description,
  onRetry,
  retryLabel = "Retry",
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-14 rounded-[var(--radius-lg)] border border-[var(--negative)]/20 bg-[var(--negative-soft)]",
        className
      )}
    >
      <div className="w-11 h-11 rounded-full bg-[var(--card)] border border-[var(--negative)]/25 flex items-center justify-center mb-4">
        <AlertOctagon className="w-5 h-5 text-[var(--negative)]" strokeWidth={1.5} />
      </div>
      <h3 className="text-[14px] font-semibold text-foreground mb-1.5">{title}</h3>
      <p className="text-[13px] text-muted-foreground leading-relaxed max-w-xs">{description}</p>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry} className="mt-5 gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.75} />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
