/**
 * Thin wrapper around analytics + error tracking so the rest of the app
 * never calls a specific vendor SDK directly. To go live, install the
 * vendor SDK (e.g. `@sentry/nextjs`, `posthog-js`) and fill in the two
 * functions below — nothing else in the codebase needs to change.
 *
 * Usage:
 *   import { trackEvent, reportError } from "@/lib/analytics";
 *   trackEvent("fund_swapped", { fundId, expenseRatio });
 *   reportError(error, { context: "CasPdfUploader" });
 */

export function trackEvent(name: string, properties?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.info(`[analytics] ${name}`, properties ?? {});
    return;
  }
  // TODO: wire to PostHog/Mixpanel/GA, e.g.:
  // posthog.capture(name, properties);
}

export function reportError(error: unknown, context?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.error("[error]", error, context ?? {});
    return;
  }
  // TODO: wire to Sentry, e.g.:
  // Sentry.captureException(error, { extra: context });
}
