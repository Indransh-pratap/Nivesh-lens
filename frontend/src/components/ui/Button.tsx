import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
          {
            // Variants
            "bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm hover:shadow-md hover:-translate-y-0.5": variant === "primary",
            "bg-accent text-foreground hover:bg-accent/80": variant === "secondary",
            "border border-border bg-transparent text-foreground hover:bg-accent hover:border-muted-foreground/30": variant === "outline",
            "text-muted hover:text-foreground hover:bg-accent/50": variant === "ghost",
            "bg-danger text-white hover:bg-danger/95 shadow-sm active:scale-[0.98]": variant === "danger",
            
            // Sizes
            "h-8 px-3 text-xs": size === "sm",
            "h-10 px-4 py-2 text-sm": size === "md",
            "h-12 px-6 text-base": size === "lg",
          },
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
