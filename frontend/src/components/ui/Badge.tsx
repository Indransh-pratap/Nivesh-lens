import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "secondary" | "success" | "warning" | "danger" | "neutral" | "info" | "brand" | "gold";
}

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-[var(--radius-sm)] text-[10.5px] font-medium border tracking-wide",
        {
          "bg-[var(--primary-soft)] text-primary border-primary/25": variant === "primary" || variant === "brand",
          "bg-accent text-muted-foreground border-border": variant === "secondary" || variant === "neutral",
          "bg-[var(--positive-soft)] text-[var(--positive)] border-[var(--positive)]/25": variant === "success",
          "bg-[var(--warning-soft)] text-[var(--warning)] border-[var(--warning)]/25": variant === "warning",
          "bg-[var(--negative-soft)] text-[var(--negative)] border-[var(--negative)]/25": variant === "danger",
          "bg-[var(--info-soft)] text-[var(--info)] border-[var(--info)]/25": variant === "info",
          // Antique-gold accent — reserved for premium/marketing moments
          // (landing page badges, trust markers), not everyday app UI.
          "bg-[var(--nse-gold-soft)] text-[var(--nse-gold)] border-[var(--nse-gold)]/30": variant === "gold",
        },
        className
      )}
      {...props}
    />
  );
}
