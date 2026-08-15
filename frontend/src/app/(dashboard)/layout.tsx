"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Briefcase, 
  ShieldAlert, 
  LineChart, 
  TrendingDown, 
  FileText, 
  Bell, 
  Settings, 
  HelpCircle, 
  ChevronLeft, 
  Menu, 
  X, 
  Search,
  Code,
  Users,
  LogOut,
  Sun,
  Moon,
  MessageSquare,
  Sparkles
  ,Landmark
  ,Activity
  ,Wallet
} from "lucide-react";
import { useThemeStore } from "@/store/themeStore";
import { usePortfolioStore } from "@/store/portfolioStore";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useThemeStore();
  const { alerts } = usePortfolioStore();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeAlertsCount = alerts.filter(a => a.type === "Danger" || a.type === "Warning").length;

  const menuItems: { name: string; href: string; icon: React.ReactNode; badge?: React.ReactNode }[] = [
    { name: "Overview", href: "/dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
    { name: "Portfolio X-Ray", href: "/portfolio-xray", icon: <ShieldAlert className="h-5 w-5" /> },
    { name: "Holdings", href: "/holdings", icon: <Briefcase className="h-5 w-5" /> },
    { name: "Mutual Funds", href: "/mutual-funds", icon: <Landmark className="h-5 w-5" /> },
    { name: "Exposure", href: "/exposure", icon: <LineChart className="h-5 w-5" /> },
    { name: "Risk Analysis", href: "/risk", icon: <ShieldAlert className="h-5 w-5" /> },
    { name: "Stress Tester", href: "/stress-tester", icon: <TrendingDown className="h-5 w-5" /> },
    { name: "What-If Simulator", href: "/simulator", icon: <Sparkles className="h-5 w-5" /> },
    { name: "Tax Optimizer", href: "/tax", icon: <FileText className="h-5 w-5" /> },
    { name: "Alerts", href: "/alerts", icon: <Bell className="h-5 w-5" /> },
    { name: "Family Portfolio", href: "/family", icon: <Users className="h-5 w-5" /> },
    { name: "News Impact", href: "/news", icon: <MessageSquare className="h-5 w-5" /> },
    { name: "SIP Health", href: "/sip-health", icon: <Activity className="h-5 w-5" /> },
    { name: "Dividend Calendar", href: "/dividends", icon: <Wallet className="h-5 w-5" /> },
    { name: "Nominee Audit", href: "/audit", icon: <HelpCircle className="h-5 w-5" /> },
    { name: "Macro Simulator", href: "/macro", icon: <TrendingDown className="h-5 w-5" /> },
    { name: "Reports", href: "/reports", icon: <FileText className="h-5 w-5" /> },
    { name: "Advisor Tools", href: "/advisor", icon: <Users className="h-5 w-5" /> },
    { name: "API / SDK", href: "/api-sdk", icon: <Code className="h-5 w-5" /> },
    { name: "Settings", href: "/settings", icon: <Settings className="h-5 w-5" /> }
  ];

  const handleLogout = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground transition-colors duration-300">
      
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between px-6 h-16 border-b border-border/60 bg-card/85 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-base">
            N
          </div>
          <span className="font-semibold text-base tracking-tight">Nivesh Lens</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-accent text-muted hover:text-foreground cursor-pointer"
          >
            {theme === "dark" ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-accent text-foreground cursor-pointer"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-background/95 backdrop-blur-md px-6 py-6 flex flex-col justify-between animate-in fade-in slide-in-from-left duration-200">
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-base">
                  N
                </div>
                <span className="font-semibold text-base tracking-tight">Nivesh Lens</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg bg-accent text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex flex-col gap-2">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link 
                    key={item.name} 
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                      isActive 
                        ? "bg-primary text-primary-foreground" 
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <span>{item.name}</span>
                    </div>
                    {item.badge}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="border-t border-border/40 pt-6 space-y-4">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <LogOut className="h-5 w-5" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          "hidden md:flex h-screen sticky top-0 overflow-y-auto flex-col justify-between bg-card border-r border-border/60 transition-all duration-300 relative z-30",
          sidebarCollapsed ? "w-20" : "w-64"
        )}
      >
        <div className="p-6">
          {/* Logo container */}
          <div className={cn("flex items-center gap-3 mb-8 justify-between", sidebarCollapsed && "justify-center")}>
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-extrabold text-base shadow-sm shrink-0">
                N
              </div>
              {!sidebarCollapsed && <span className="font-bold text-base tracking-tight">Nivesh Lens</span>}
            </Link>
            
            {/* Collapse toggle */}
            {!sidebarCollapsed && (
              <button 
                onClick={() => setSidebarCollapsed(true)}
                className="p-1 rounded bg-accent hover:bg-accent/80 text-muted hover:text-foreground transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </div>

          {sidebarCollapsed && (
            <button 
              onClick={() => setSidebarCollapsed(false)}
              className="mx-auto block mb-8 p-1.5 rounded bg-accent hover:bg-accent/80 text-muted hover:text-foreground transition-colors cursor-pointer"
            >
              <Menu className="h-4 w-4" />
            </button>
          )}

          {/* Navigation links */}
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link 
                  key={item.name} 
                  href={item.href}
                  className={cn(
                    "flex items-center rounded-lg px-3 py-2.5 text-xs font-semibold transition-all duration-150 relative group",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted hover:text-foreground hover:bg-accent/60"
                  )}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    {!sidebarCollapsed && <span>{item.name}</span>}
                  </div>
                  {!sidebarCollapsed && item.badge && (
                    <span className="ml-auto">{item.badge}</span>
                  )}
                  {sidebarCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-foreground text-background text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity font-bold whitespace-nowrap z-50 shadow-sm">
                      {item.name}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer info */}
        <div className="p-6 border-t border-border/40 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
              AT
            </div>
            {!sidebarCollapsed && (
              <div className="overflow-hidden">
                <h5 className="text-xs font-semibold text-foreground truncate">Anubhav Thakur</h5>
                <p className="text-[10px] text-muted truncate">Premium Pro Client</p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <button 
              onClick={toggleTheme}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-muted hover:text-foreground hover:bg-accent/60 w-full transition-colors cursor-pointer",
                sidebarCollapsed && "justify-center"
              )}
            >
              {theme === "dark" ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
              {!sidebarCollapsed && <span>{theme === "dark" ? "Light Theme" : "Dark Theme"}</span>}
            </button>

            <button 
              onClick={handleLogout}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-red-500 hover:bg-red-500/10 w-full transition-colors cursor-pointer",
                sidebarCollapsed && "justify-center"
              )}
            >
              <LogOut className="h-4.5 w-4.5" />
              {!sidebarCollapsed && <span>Log out</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace content */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Top Header */}
        <header className="hidden md:flex items-center justify-between gap-6 px-8 h-16 border-b border-border/40 bg-card/95 sticky top-0 z-20">
          {/* Breadcrumb status */}
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <span>Client Workspace</span>
            <span>/</span>
            <span className="text-foreground capitalize">{pathname.replace("/", "")}</span>
          </div>

          <div className="max-w-md flex-1"><label className="relative block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input aria-label="Search portfolio" placeholder="Search holdings, funds, companies" className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-xs outline-none focus:border-primary" /></label></div>
          {/* Right Header items */}
          <div className="flex items-center gap-4">
            {/* Live alert badge */}
            <Link href="/diagnostics?tab=alerts" className="relative p-2 rounded-lg hover:bg-accent transition-colors">
              <Bell className="h-4.5 w-4.5 text-muted hover:text-foreground" />
              {activeAlertsCount > 0 && (
                <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-danger text-white text-[9px] font-black flex items-center justify-center border border-card shadow-sm animate-pulse">
                  {activeAlertsCount}
                </span>
              )}
            </Link>

            <div className="h-5 w-px bg-border/80" />

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Market</span>
              <span className="flex items-center gap-1.5 text-xs text-green-500 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Open
              </span>
            </div>
          </div>
        </header>

        {/* Main nested layout view content */}
        <main className="flex-1 p-4 pb-20 md:p-8 md:pb-8 max-w-[1440px] w-full mx-auto animate-in fade-in duration-300">
          {children}
        </main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-border bg-card px-2 py-2 md:hidden">
        {menuItems.slice(0, 5).map((item) => <Link key={item.href} href={item.href} className={cn("flex min-w-12 flex-col items-center gap-1 rounded px-2 py-1 text-[9px]", pathname === item.href ? "text-primary" : "text-muted")}><span className="scale-75">{item.icon}</span><span className="max-w-14 truncate">{item.name}</span></Link>)}
      </nav>
    </div>
  );
}
