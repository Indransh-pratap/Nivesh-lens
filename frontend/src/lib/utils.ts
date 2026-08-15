/**
 * Merges multiple Tailwind classes together
 */
export function cn(...inputs: (string | undefined | null | boolean | Record<string, boolean>)[]) {
  const classes: string[] = [];
  for (const input of inputs) {
    if (!input) continue;
    if (typeof input === "string") {
      classes.push(input);
    } else if (typeof input === "object") {
      for (const [key, value] of Object.entries(input)) {
        if (value) {
          classes.push(key);
        }
      }
    }
  }
  return classes.join(" ");
}

/**
 * Formats a number to Indian Rupee (INR) currency format
 */
export function formatINR(value: number, decimalPlaces = 2): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: decimalPlaces,
    minimumFractionDigits: decimalPlaces
  }).format(value);
}

/**
 * Formats a number with compact Indian notation (Lakhs, Crores)
 */
export function formatINRCompact(value: number): string {
  if (Math.abs(value) >= 10000000) {
    return `₹${(value / 10000000).toFixed(2)} Cr`;
  }
  if (Math.abs(value) >= 100000) {
    return `₹${(value / 100000).toFixed(2)} L`;
  }
  return formatINR(value, 0);
}

/**
 * Formats a decimal number as percentage
 */
export function formatPercent(value: number, includeSign = false): string {
  const formatted = `${value >= 0 && includeSign ? "+" : ""}${value.toFixed(2)}%`;
  return formatted;
}

/**
 * Returns color classes based on score rating (300 - 900)
 */
export function getScoreColor(score: number): { text: string; bg: string; border: string; label: string } {
  if (score >= 800) {
    return {
      text: "text-green-600 dark:text-green-400",
      bg: "bg-green-50 dark:bg-green-950/30",
      border: "border-green-200 dark:border-green-900/50",
      label: "Excellent"
    };
  }
  if (score >= 700) {
    return {
      text: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "border-blue-200 dark:border-blue-900/50",
      label: "Good"
    };
  }
  if (score >= 550) {
    return {
      text: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-200 dark:border-amber-900/50",
      label: "Average"
    };
  }
  return {
    text: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-900/50",
    label: "Poor"
  };
}
