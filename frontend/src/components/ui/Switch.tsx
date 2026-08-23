"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}

export function Switch({ checked, onChange, label, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer",
        checked ? "bg-primary" : "bg-accent-strong border border-border",
        className
      )}
    >
      <span
        className={cn(
          "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm",
          checked ? "translate-x-[18px]" : "translate-x-[3px]"
        )}
      />
    </button>
  );
}
