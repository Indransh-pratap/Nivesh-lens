"use client";

import React, { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * Shows a persistent banner when the browser goes offline, and hides it
 * automatically once connectivity is restored. Without this, losing signal
 * mid-session just makes every action silently fail with no explanation.
 */
export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed top-0 inset-x-0 z-[150] flex items-center justify-center gap-2 py-2 bg-[var(--negative)] text-white text-xs font-semibold motion-reduce:animate-none animate-fade-in-up"
    >
      <WifiOff className="w-3.5 h-3.5" strokeWidth={2} />
      <span>You&apos;re offline — some data may be out of date until your connection is back.</span>
    </div>
  );
}
