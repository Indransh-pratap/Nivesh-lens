"use client";

import React from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { useToastStore, type ToastVariant } from "@/store/toastStore";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils";

const VARIANT_STYLES: Record<ToastVariant, { icon: React.ElementType; className: string }> = {
  success: { icon: CheckCircle2, className: "border-[var(--positive)]/25 bg-[var(--positive-soft)] text-[var(--positive)]" },
  error: { icon: XCircle, className: "border-[var(--negative)]/25 bg-[var(--negative-soft)] text-[var(--negative)]" },
  info: { icon: Info, className: "border-primary/25 bg-primary/10 text-primary" },
};

export function ToastContainer() {
  const { toasts, dismissToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm motion-reduce:transition-none"
    >
      {toasts.map((toast) => {
        const { icon: Icon, className } = VARIANT_STYLES[toast.variant];
        return (
          <div
            key={toast.id}
            role="status"
            className={cn(
              "flex items-start gap-2.5 rounded-xl border p-3.5 shadow-lg shadow-black/20 bg-card text-foreground animate-fade-in-up motion-reduce:animate-none",
              className
            )}
          >
            <Icon className="w-4.5 h-4.5 shrink-0 mt-0.5" strokeWidth={1.75} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground">{toast.title}</p>
              {toast.description && (
                <p className="text-[11px] text-muted-foreground mt-0.5">{toast.description}</p>
              )}
              {toast.action && (
                <button
                  onClick={() => { toast.action?.onClick(); dismissToast(toast.id); }}
                  className="mt-1.5 text-[11px] font-bold text-primary hover:underline cursor-pointer"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            <IconButton size="sm" aria-label="Dismiss notification" onClick={() => dismissToast(toast.id)}>
              <X className="w-3.5 h-3.5" />
            </IconButton>
          </div>
        );
      })}
    </div>
  );
}
