import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-[var(--radius-md)] font-medium transition-all duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none disabled:hover:translate-y-0 cursor-pointer select-none",
          {
            // Variants
            "bg-primary text-primary-foreground shadow-[0_1px_2px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_14px_rgba(200,162,75,0.25)] hover:brightness-110": variant === "primary",
            "bg-accent text-foreground hover:bg-accent-strong border border-border": variant === "secondary",
            "border border-border bg-transparent text-foreground hover:bg-accent hover:border-border-strong": variant === "outline",
            "text-muted-foreground hover:text-foreground hover:bg-accent": variant === "ghost",
            "bg-[var(--negative)] text-white hover:brightness-110": variant === "danger",
            "bg-[var(--positive)] text-white hover:brightness-110": variant === "success",

            // Sizes
            "h-8 px-3 text-xs": size === "sm",
            "h-10 px-4 py-2 text-[13px] sm:text-sm": size === "md",
            "h-12 px-6 text-sm font-semibold": size === "lg",
          },
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
