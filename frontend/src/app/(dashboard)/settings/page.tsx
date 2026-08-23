"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { 
  User, 
  Smartphone, 
  Check,
  RefreshCw,
  Bell
} from "lucide-react";
import { usePortfolioStore } from "@/store/portfolioStore";
import { useThemeStore } from "@/store/themeStore";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";

export default function SettingsPage() {
  const { openSyncModal, notificationPrefs, updateNotificationPref } = usePortfolioStore();
  const { theme, toggleTheme } = useThemeStore();
  const [saved, setSaved] = useState(false);

  const NOTIF_CATEGORIES: { key: string; label: string; hint: string }[] = [
    { key: "Concentration", label: "Concentration risk", hint: "A single stock or group crosses a safe exposure threshold" },
    { key: "Fee", label: "Fee bleed", hint: "Regular-plan commissions or duplicate expense ratios detected" },
    { key: "Overlap", label: "Fund overlap", hint: "Two funds you hold start behaving like one" },
    { key: "Nominee", label: "Nominee & compliance", hint: "A folio or account is missing nominee details" },
    { key: "StyleDrift", label: "Manager style drift", hint: "A fund manager shifts away from its stated mandate" },
    { key: "PanicGuard", label: "Market behavior nudges", hint: "Reassurance context during sharp market drops" },
  ];

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-8 pb-12 max-w-4xl">
      <PageHeader
        eyebrow="PREFERENCES & CONNECTIONS"
        title="Workspace Settings"
        description="Manage Account Aggregator sync status, API keys, notifications & theme"
      />

      <div className="space-y-6">
        
        {/* Account Profile Card */}
        <div className="p-6 rounded-2xl border border-border/80 bg-card shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            <span>Investor Profile</span>
          </h3>

          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-muted-foreground mb-1 font-semibold">Full Legal Name</label>
              <input 
                type="text" 
                defaultValue="Anubhav Thakur" 
                className="w-full h-9 px-3 bg-background border border-border rounded-lg text-foreground font-semibold"
              />
            </div>
            <div>
              <label className="block text-muted-foreground mb-1 font-semibold">Email Address</label>
              <input 
                type="email" 
                defaultValue="anubhav.thakur@gmail.com" 
                className="w-full h-9 px-3 bg-background border border-border rounded-lg text-foreground"
              />
            </div>
            <div>
              <label className="block text-muted-foreground mb-1 font-semibold">Linked PAN Number</label>
              <input 
                type="text" 
                defaultValue="ABCDE1234F" 
                disabled 
                className="w-full h-9 px-3 bg-accent/40 border border-border rounded-lg font-mono text-muted-foreground"
              />
            </div>
            <div>
              <label className="block text-muted-foreground mb-1 font-semibold">Verified Phone</label>
              <input 
                type="text" 
                defaultValue="+91 98765 43210" 
                className="w-full h-9 px-3 bg-background border border-border rounded-lg text-foreground font-mono"
              />
            </div>
          </div>
        </div>

        {/* Sync Connections Card */}
        <div className="p-6 rounded-2xl border border-border/80 bg-card shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[var(--positive)]" />
              <span>Active Data Sync Channels</span>
            </h3>
            <Button size="sm" onClick={() => openSyncModal("OTP")} className="text-xs font-bold gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-Sync Data</span>
            </Button>
          </div>

          <div className="space-y-2.5 text-xs">
            {[
              { name: "Setu / Finvu Account Aggregator", status: "Live Active (RBI Regulated)", date: "Synced Today" },
              { name: "MF Central (CAMS + KFintech RTAs)", status: "Active (Aadhaar OTP Verified)", date: "Synced Today" },
              { name: "NSDL / CDSL Depository Gateway", status: "Active", date: "Synced Today" },
              { name: "Smart CAS PDF Decryptor", status: "Ready", date: "Auto Decrypt Enabled" },
            ].map((channel) => (
              <div key={channel.name} className="p-3 rounded-xl bg-accent/30 border border-border/40 flex items-center justify-between">
                <div>
                  <p className="font-bold text-foreground">{channel.name}</p>
                  <p className="text-[11px] text-[var(--positive)] font-mono mt-0.5">{channel.status}</p>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">{channel.date}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Notification Preferences Card */}
        <div className="p-6 rounded-[var(--radius-lg)] border border-border bg-card space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" strokeWidth={1.75} />
            <span>Notification preferences</span>
          </h3>
          <p className="text-xs text-muted-foreground -mt-2">
            Choose which diagnostic categories reach you, and where. Dismissed alerts still appear in your feed regardless of these settings.
          </p>

          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 gap-y-1 text-xs">
            <span className="text-muted-foreground font-medium pb-2 border-b border-border/70">Category</span>
            <span className="text-muted-foreground font-medium pb-2 border-b border-border/70 text-center">Push</span>
            <span className="text-muted-foreground font-medium pb-2 border-b border-border/70 text-center">Email</span>

            {NOTIF_CATEGORIES.map((cat) => {
              const pref = notificationPrefs[cat.key] ?? { push: false, email: false };
              return (
                <React.Fragment key={cat.key}>
                  <div className="py-2.5 border-b border-border/50">
                    <p className="text-foreground font-medium">{cat.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{cat.hint}</p>
                  </div>
                  <div className="py-2.5 border-b border-border/50 flex justify-center">
                    <Switch checked={pref.push} onChange={(v) => updateNotificationPref(cat.key, "push", v)} label={`${cat.label} push`} />
                  </div>
                  <div className="py-2.5 border-b border-border/50 flex justify-center">
                    <Switch checked={pref.email} onChange={(v) => updateNotificationPref(cat.key, "email", v)} label={`${cat.label} email`} />
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Appearance & Save */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="sm" onClick={toggleTheme} className="text-xs">
            Toggle Theme ({theme === "dark" ? "Dark Theme Active" : "Light Theme Active"})
          </Button>

          <Button size="sm" onClick={handleSave} className="text-xs font-bold gap-1.5">
            {saved ? <Check className="w-3.5 h-3.5 text-[var(--positive)]" /> : null}
            <span>{saved ? "Preferences Saved!" : "Save Changes"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
