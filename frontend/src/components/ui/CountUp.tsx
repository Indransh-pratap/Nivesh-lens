"use client";

import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  format?: "indian" | "plain";
  className?: string;
}

/**
 * Animates a number from 0 (or its previous value) up to `value` on mount/change.
 * Uses an ease-out curve so it settles rather than ticking linearly — avoids the
 * "AI slot machine" feel of a raw linear counter.
 */
export function CountUp({
  value,
  duration = 900,
  decimals = 0,
  prefix = "",
  suffix = "",
  format = "indian",
  className,
}: CountUpProps) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
      const current = from + (to - from) * eased;
      setDisplay(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  const formatted =
    format === "indian"
      ? display.toLocaleString("en-IN", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      : display.toFixed(decimals);

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
