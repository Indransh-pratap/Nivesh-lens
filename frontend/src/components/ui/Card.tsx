import * as React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, glass = false, interactive = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-[var(--radius-lg)] border border-border bg-card text-card-foreground shadow-[0_1px_2px_rgba(0,0,0,0.4)] transition-colors duration-150",
          glass && "backdrop-blur-md bg-card/85",
          interactive && "hover:border-border-strong hover:bg-[var(--card-hover)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.35)] cursor-pointer",
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-1 p-5 sm:p-6", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-[15px] sm:text-base font-semibold leading-tight tracking-tight text-foreground", className)} {...props} />
  )
);
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-xs sm:text-[13px] text-muted-foreground leading-relaxed", className)} {...props} />
  )
);
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-5 sm:p-6 pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-5 sm:p-6 pt-4 border-t border-border/70 mt-4", className)} {...props} />
  )
);
CardFooter.displayName = "CardFooter";
