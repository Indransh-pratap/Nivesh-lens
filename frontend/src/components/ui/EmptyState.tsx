import * as React from "react";
import { type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-14 rounded-[var(--radius-lg)] border border-dashed border-border bg-[var(--background-elevated)]/40",
        className
      )}
    >
      <div className="w-11 h-11 rounded-full bg-accent border border-border flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <h3 className="text-[14px] font-semibold text-foreground mb-1.5">{title}</h3>
      <p className="text-[13px] text-muted-foreground leading-relaxed max-w-xs">{description}</p>
      {actionLabel && onAction && (
        <Button size="sm" variant="outline" onClick={onAction} className="mt-5">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
