"use client";

import React, { useState } from "react";
import { 
  User, 
  Lock, 
  Bell, 
  CreditCard, 
  Smartphone, 
  ShieldCheck, 
  Globe,
  Sun,
  Moon,
  Sparkles,
  Link2,
  Trash2,
  CheckCircle2
} from "lucide-react";
import { useThemeStore } from "@/store/themeStore";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

type SettingsSection = "profile" | "security" | "notifications" | "connected" | "billing";

export default function SettingsPage() {
  const { theme, toggleTheme } = useThemeStore();
  const [activeSection, setActiveSection] = useState<SettingsSection>("profile");

  // Profile Form states
  const [name, setName] = useState("Anubhav Thakur");
  const [email, setEmail] = useState("anubhav@gmail.com");
  const [successMsg, setSuccessMsg] = useState("");

  // Notification toggles
  const [whatsappAlerts, setWhatsappAlerts] = useState(true);
  const [emailDigest, setEmailDigest] = useState(true);
  const [riskAlerts, setRiskAlerts] = useState(true);

  // Connected accounts list
  const [connections, setConnections] = useState([
    { id: "c1", provider: "NSDL Depository", details: "ID: 1083****29", status: "Connected" },
    { id: "c2", provider: "CDSL Depository", details: "ID: 2908****11", status: "Connected" },
    { id: "c3", provider: "MF Central API", details: "Linked Email: anubhav@gmail.com", status: "Connected" }
  ]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("Settings updated successfully.");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleDisconnect = (id: string) => {
    setConnections(connections.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Platform Settings</h1>
        <p className="text-sm text-muted-foreground">Manage depository linkages, customize notifications, and adjust profile settings.</p>
      </div>

      {/* Success banner */}
      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold rounded-lg dark:bg-green-950/20 dark:border-green-900/40 dark:text-green-400 animate-in fade-in duration-200">
          ✓ {successMsg}
        </div>
      )}

      {/* Settings Layout wrapper */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        {/* Left Sidebar Links */}
        <Card className="border-border/60 lg:col-span-1">
          <CardContent className="p-4 flex flex-col gap-1 text-xs font-semibold">
            {[
              { id: "profile", label: "My Profile", icon: <User className="h-4.5 w-4.5" /> },
              { id: "security", label: "Security & MFA", icon: <Lock className="h-4.5 w-4.5" /> },
              { id: "notifications", label: "Notifications", icon: <Bell className="h-4.5 w-4.5" /> },
              { id: "connected", label: "Connected Registries", icon: <Link2 className="h-4.5 w-4.5" /> },
              { id: "billing", label: "Billing & Plans", icon: <CreditCard className="h-4.5 w-4.5" /> }
            ].map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id as SettingsSection)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer text-left w-full",
                  activeSection === section.id
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted hover:text-foreground hover:bg-accent/60"
                )}
              >
                {section.icon}
                <span>{section.label}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Right Section details form */}
        <Card className="border-border/60 lg:col-span-3">
          <CardContent className="p-8">
            
            {/* PROFILE SECTION */}
            {activeSection === "profile" && (
              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-foreground">User Profile Details</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Edit email handles and avatar options</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-10 w-full rounded-lg border border-border bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 px-3 transition-all font-bold"
                    />
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-semibold text-muted-foreground">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-10 w-full rounded-lg border border-border bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 px-3 transition-all font-bold"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button type="submit" className="text-xs font-bold h-10 px-4">
                    Save Profile Changes
                  </Button>
                </div>
              </form>
            )}

            {/* SECURITY SECTION */}
            {activeSection === "security" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-foreground">Depository Security Settings</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Enforce secure linkages policies</p>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 rounded-xl border border-border bg-accent/15 text-xs font-semibold">
                    <div className="space-y-0.5">
                      <h5 className="font-bold text-foreground flex items-center gap-1">
                        <Smartphone className="h-4.5 w-4.5 text-primary" /> Two-Factor OTP Sync Verification
                      </h5>
                      <p className="text-[10px] text-muted-foreground font-normal">Require depository-registered OTP confirmation on registry audits fetches.</p>
                    </div>
                    <Badge variant="success">Active</Badge>
                  </div>

                  <div className="flex justify-between items-center p-4 rounded-xl border border-border bg-accent/15 text-xs font-semibold">
                    <div className="space-y-0.5">
                      <h5 className="font-bold text-foreground flex items-center gap-1">
                        <ShieldCheck className="h-4.5 w-4.5 text-primary" /> Encrypted CAS Signatures
                      </h5>
                      <p className="text-[10px] text-muted-foreground font-normal">Always decrypt statements client-side. We do not store CAS passwords on servers.</p>
                    </div>
                    <Badge variant="success">Enforced</Badge>
                  </div>
                </div>
              </div>
            )}

            {/* NOTIFICATIONS SECTION */}
            {activeSection === "notifications" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-foreground">Notification Channels</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Toggle weekly digests and risk alert warnings alerts</p>
                </div>

                <div className="space-y-4 text-xs font-semibold">
                  <div className="flex justify-between items-center py-2.5">
                    <div>
                      <h5 className="text-foreground">WhatsApp Portfolio Reports</h5>
                      <p className="text-[10px] text-muted-foreground font-normal mt-0.5">Receive monthly overlap reports directly on WhatsApp.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={whatsappAlerts}
                      onChange={() => setWhatsappAlerts(!whatsappAlerts)}
                      className="h-5 w-10 accent-primary rounded-full cursor-pointer focus:ring-primary/20"
                    />
                  </div>

                  <div className="h-px bg-border/40" />

                  <div className="flex justify-between items-center py-2.5">
                    <div>
                      <h5 className="text-foreground">Risk Overlap Alerts</h5>
                      <p className="text-[10px] text-muted-foreground font-normal mt-0.5">Trigger immediate flags if underlying duplicates pass 25% weights.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={riskAlerts}
                      onChange={() => setRiskAlerts(!riskAlerts)}
                      className="h-5 w-10 accent-primary rounded-full cursor-pointer focus:ring-primary/20"
                    />
                  </div>

                  <div className="h-px bg-border/40" />

                  <div className="flex justify-between items-center py-2.5">
                    <div>
                      <h5 className="text-foreground">Depository Digest Emails</h5>
                      <p className="text-[10px] text-muted-foreground font-normal mt-0.5">Compile weekly activity details for depository accounts.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={emailDigest}
                      onChange={() => setEmailDigest(!emailDigest)}
                      className="h-5 w-10 accent-primary rounded-full cursor-pointer focus:ring-primary/20"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* CONNECTED ACCOUNTS SECTION */}
            {activeSection === "connected" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-foreground">Connected Depository Registries</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">De-link depository connections or manage credentials</p>
                </div>

                <div className="divide-y divide-border/60">
                  {connections.map((c) => (
                    <div key={c.id} className="py-4 flex justify-between items-center text-xs font-semibold">
                      <div>
                        <h5 className="text-sm font-bold text-foreground">{c.provider}</h5>
                        <p className="text-[10px] text-muted-foreground font-normal mt-0.5">{c.details}</p>
                      </div>

                      <div className="flex items-center gap-4">
                        <Badge variant="primary" className="text-[9px] uppercase font-black tracking-wide">{c.status}</Badge>
                        <button
                          onClick={() => handleDisconnect(c.id)}
                          className="p-2 text-muted hover:text-red-500 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {connections.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-xs text-muted-foreground">All depository accounts de-linked.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* BILLING SECTION */}
            {activeSection === "billing" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-foreground">Billing details</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Review active membership plans and subscription details</p>
                </div>

                <div className="p-6 rounded-2xl border border-primary bg-primary/5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-xs font-semibold">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">Premium Pro Plan Membership</span>
                      <Badge variant="primary" className="px-1.5 font-bold uppercase scale-90">Active Plan</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-normal mt-1">Next invoice scheduled for ₹4,788 on Aug 2027 (Annual subscription)</p>
                  </div>
                  
                  <Button variant="outline" size="sm" className="h-9 border-red-500 text-red-500 hover:bg-red-500/10 hover:border-red-500 font-bold shrink-0">
                    Cancel Subscription
                  </Button>
                </div>

                <div className="divide-y divide-border/60">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest pb-2">Invoice Records</h4>
                  <div className="flex justify-between items-center py-3 text-xs font-semibold text-muted-foreground">
                    <span>Invoice #NL-98302 (Annual Pro)</span>
                    <span className="text-foreground font-bold">₹4,788 (Paid)</span>
                  </div>
                </div>
              </div>
            )}

          </CardContent>
        </Card>

      </div>
    </div>
  );
}
