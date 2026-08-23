import * as React from "react";
import { cn } from "@/lib/utils";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required for icon-only buttons — describes the action for screen readers. */
  "aria-label": string;
  variant?: "default" | "danger";
  size?: "sm" | "md";
}

/**
 * A small icon-only button (close, expand/collapse, remove, play/pause, etc).
 * Centralizes the hover/focus/disabled styling that was previously copy-pasted
 * as a long Tailwind class string on every icon button across the app.
 */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          // relative + the ::after pseudo-element below invisibly expands the
          // tappable hit area to ~44x44px (the standard minimum touch target)
          // without changing how big the icon visually looks.
          "relative inline-flex items-center justify-center rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none after:content-[''] after:absolute after:-inset-2.5",
          {
            "text-muted-foreground hover:text-foreground hover:bg-accent": variant === "default",
            "text-muted-foreground hover:text-[var(--negative)] hover:bg-[var(--negative)]/10": variant === "danger",
            "p-1": size === "sm",
            "p-1.5": size === "md",
          },
          className
        )}
        {...props}
      />
    );
  }
);

IconButton.displayName = "IconButton";
