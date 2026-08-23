"use client";

import React, { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ShieldAlert, AlertTriangle, Info, ShieldCheck, Bell } from "lucide-react";
import Link from "next/link";
import { usePortfolioStore } from "@/store/portfolioStore";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ExposureAlert } from "@/types";

const SEVERITY_ORDER: Record<ExposureAlert["type"], number> = {
  Danger: 0,
  Warning: 1,
  Info: 2,
  Success: 3,
};

const CATEGORIES: { key: ExposureAlert["category"] | "All"; label: string }[] = [
  { key: "All", label: "All" },
  { key: "Concentration", label: "Concentration" },
  { key: "Fee", label: "Fee" },
  { key: "Overlap", label: "Overlap" },
  { key: "Nominee", label: "Nominee" },
  { key: "StyleDrift", label: "Style Drift" },
  { key: "PanicGuard", label: "Behavioral" },
];

function isRecent(date: string) {
  return /min|hour/i.test(date);
}

export default function AlertsPage() {
  const { alerts, dismissAlert, openPanicGuard } = usePortfolioStore();
  const [activeCategory, setActiveCategory] = useState<ExposureAlert["category"] | "All">("All");

  const getAlertBadge = (type: string) => {
    if (type === "Danger") return "bg-[var(--negative)]/15 text-[var(--negative)] border-[var(--negative)]/30";
    if (type === "Warning") return "bg-[var(--warning)]/15 text-[var(--warning)] border-[var(--warning)]/30";
    if (type === "Success") return "bg-[var(--positive)]/15 text-[var(--positive)] border-[var(--positive)]/30";
    return "bg-[var(--info)]/15 text-[var(--info)] border-[var(--info)]/30";
  };

  const filteredAlerts = useMemo(() => {
    const list = activeCategory === "All" ? alerts : alerts.filter((a) => a.category === activeCategory);
    return [...list].sort((a, b) => SEVERITY_ORDER[a.type] - SEVERITY_ORDER[b.type]);
  }, [alerts, activeCategory]);

  const dangerCount = alerts.filter((a) => a.type === "Danger").length;
  const warningCount = alerts.filter((a) => a.type === "Warning").length;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          eyebrow="Real-time monitoring"
          title="Diagnostic alerts & drift warnings"
          description="Prioritised red flags, manager style drift warnings and behavioral risk nudges — sorted by severity, not just recency."
        />

        <button
          onClick={openPanicGuard}
          className="px-3.5 py-2 rounded-[var(--radius-md)] bg-[var(--positive-soft)] border border-[var(--positive)]/30 text-[var(--positive)] text-xs font-semibold flex items-center gap-2 hover:bg-[var(--positive)]/20 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <ShieldCheck className="w-4 h-4" strokeWidth={1.75} />
          <span>Launch behavioral panic guard</span>
        </button>
      </div>

      {/* Summary strip */}
      {alerts.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>
            <span className="text-[var(--negative)] font-semibold">{dangerCount}</span> critical
          </span>
          <span className="text-border">·</span>
          <span>
            <span className="text-[var(--warning)] font-semibold">{warningCount}</span> need attention
          </span>
          <span className="text-border">·</span>
          <span>
            <span className="text-foreground font-semibold">{alerts.length}</span> total
          </span>
        </div>
      )}

      {/* Category filter chips */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {CATEGORIES.map((c) => {
          const count = c.key === "All" ? alerts.length : alerts.filter((a) => a.category === c.key).length;
          const isActive = activeCategory === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setActiveCategory(c.key)}
              className={`px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-medium whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                isActive ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              <span>{c.label}</span>
              <span className={isActive ? "opacity-80" : "text-muted-foreground/70"}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Alerts Feed */}
      {filteredAlerts.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={alerts.length === 0 ? "You're all caught up" : "No alerts in this category"}
          description={
            alerts.length === 0
              ? "No active diagnostic flags right now. We'll notify you the moment something needs attention."
              : "Try a different category, or select \"All\" to see every active alert."
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-5 rounded-[var(--radius-lg)] border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                alert.type === "Danger" ? "border-[var(--negative)]/25 bg-[var(--negative-soft)]" :
                alert.type === "Warning" ? "border-[var(--warning)]/25 bg-[var(--warning-soft)]" :
                "border-border"
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className={`p-2 rounded-[var(--radius-md)] border shrink-0 mt-0.5 ${getAlertBadge(alert.type)}`}>
                  {alert.type === "Danger" ? <ShieldAlert className="w-5 h-5" strokeWidth={1.75} /> :
                   alert.type === "Warning" ? <AlertTriangle className="w-5 h-5" strokeWidth={1.75} /> :
                   <Info className="w-5 h-5" strokeWidth={1.75} />}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-semibold text-foreground">{alert.title}</h4>
                    {isRecent(alert.date) && (
                      <span className="px-1.5 py-0.5 rounded-[var(--radius-sm)] text-[9px] font-semibold bg-primary text-primary-foreground uppercase tracking-wide">
                        New
                      </span>
                    )}
                    {alert.impactScore && (
                      <span className="text-[10px] px-2 py-0.5 rounded-[var(--radius-sm)] bg-accent text-primary font-medium tabular-nums">
                        {alert.impactScore}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{alert.description}</p>
                  <span className="text-[10px] text-muted-foreground/80 mt-1 block">{alert.date}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => dismissAlert(alert.id)}
                  className="text-xs h-8 text-muted-foreground hover:text-foreground"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground text-center pt-2">
        Manage which categories notify you by push or email in{" "}
        <Link href="/settings" className="text-primary hover:underline">
          Settings → Notification preferences
        </Link>
        .
      </p>
    </div>
  );
}
