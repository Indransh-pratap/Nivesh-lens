"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  ShieldAlert,
  LineChart,
  TrendingDown,
  FileText,
  Bell,
  Settings,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  Code2,
  Users,
  LogOut,
  Sun,
  Moon,
  MessageSquare,
  Sparkles,
  Landmark,
  Activity,
  Wallet,
  RefreshCw,
  Award,
  ShieldCheck,
  Layers,
  type LucideIcon,
} from "lucide-react";
import { useThemeStore } from "@/store/themeStore";
import { usePortfolioStore } from "@/store/portfolioStore";
import { cn } from "@/lib/utils";
import { SyncModal } from "@/components/dashboard/SyncModal";
import { PanicGuardModal } from "@/components/dashboard/PanicGuardModal";
import { TrustBar } from "@/components/ui/TrustBar";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { GlobalSearch } from "@/components/dashboard/GlobalSearch";
import { MarketTickerBar } from "@/components/dashboard/MarketTickerBar";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  count?: number;
}

const useMounted = () => {
  return React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useThemeStore();
  const { alerts, openSyncModal } = usePortfolioStore();

  const mounted = useMounted();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeAlertsCount = useMemo(() => {
    return alerts.filter((a) => a.type === "Danger" || a.type === "Warning").length;
  }, [alerts]);

  const navigationGroups: { groupTitle: string; items: NavItem[] }[] = useMemo(
    () => [
      {
        groupTitle: "Portfolio Intelligence",
        items: [
          { name: "Executive Terminal", href: "/dashboard", icon: LayoutDashboard },
          { name: "Portfolio X-Ray", href: "/portfolio-xray", icon: ShieldAlert },
          { name: "Direct Holdings", href: "/holdings", icon: Briefcase },
          { name: "Mutual Fund Health", href: "/mutual-funds", icon: Landmark },
          { name: "True Exposure Map", href: "/exposure", icon: LineChart },
        ],
      },
      {
        groupTitle: "Risk & Diagnostics",
        items: [
          { name: "Risk & Correlation", href: "/risk", icon: Activity },
          { name: "Crash Stress-Tester", href: "/stress-tester", icon: TrendingDown },
          { name: "SIP Alpha & Switch", href: "/sip-health", icon: RefreshCw },
          { name: "Tax Rebalancer", href: "/tax", icon: FileText },
        ],
      },
      {
        groupTitle: "Wealth & Compliance",
        items: [
          { name: "Family Aggregator", href: "/family", icon: Users },
          { name: "Nominee Audit", href: "/audit", icon: ShieldCheck },
          { name: "Dividend Calendar", href: "/dividends", icon: Wallet },
          { name: "System Alerts", href: "/alerts", icon: Bell, count: activeAlertsCount },
        ],
      },
      {
        groupTitle: "Professional Tools",
        items: [
          { name: "Advisor Reports", href: "/advisor", icon: Award },
          { name: "API & Developers", href: "/api-sdk", icon: Code2 },
          { name: "Settings", href: "/settings", icon: Settings },
        ],
      },
    ],
    [activeAlertsCount]
  );

  // Which group contains the currently active page — that group starts expanded,
  // the rest start collapsed so the sidebar doesn't show all 16 links at once.
  const activeGroupTitle = useMemo(
    () => navigationGroups.find((g) => g.items.some((i) => i.href === pathname))?.groupTitle ?? navigationGroups[0]?.groupTitle,
    [navigationGroups, pathname]
  );
  const [expandedGroup, setExpandedGroup] = useState<string | undefined>(activeGroupTitle);

  // Keep the expanded group in sync as navigation happens (e.g. clicking a
  // link in a collapsed group should open that group, not leave it hidden).
  React.useEffect(() => {
    setExpandedGroup(activeGroupTitle);
  }, [activeGroupTitle]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-primary focus:text-white focus:text-xs focus:font-semibold focus:shadow-lg"
      >
        Skip to main content
      </a>
      <SyncModal />
      <PanicGuardModal />
      <ToastContainer />
      <OfflineBanner />

      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 h-14 border-b border-border bg-card/90 backdrop-blur-md sticky top-0 z-40">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-semibold text-xs">
            NL
          </div>
          <span className="font-display font-semibold text-sm tracking-tight">Nivesh Lens</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openSyncModal("OTP")}
            className="p-1.5 px-2.5 rounded-[var(--radius-sm)] bg-primary text-primary-foreground text-[11px] font-medium flex items-center gap-1 cursor-pointer active:scale-95"
          >
            <RefreshCw className="h-3 w-3" strokeWidth={1.75} />
            <span>Sync</span>
          </button>
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-[var(--radius-sm)] text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer transition-colors"
          >
            {mounted && theme === "dark" ? <Sun className="h-4 w-4" strokeWidth={1.75} /> : <Moon className="h-4 w-4" strokeWidth={1.75} />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-[var(--radius-sm)] text-foreground hover:bg-accent cursor-pointer"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" strokeWidth={1.75} /> : <Menu className="h-5 w-5" strokeWidth={1.75} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-background/98 backdrop-blur-lg px-6 py-6 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                  NL
                </div>
                <span className="font-display font-semibold text-base tracking-tight">Nivesh Lens</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-[var(--radius-sm)] hover:bg-accent cursor-pointer">
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>

            <div className="space-y-5">
              {navigationGroups.map((group) => (
                <div key={group.groupTitle} className="space-y-1">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium px-3">{group.groupTitle}</p>
                  {group.items.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center justify-between px-3.5 py-2.5 rounded-[var(--radius-md)] text-[13px] font-medium transition-colors",
                          isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4" strokeWidth={1.75} />
                          <span>{item.name}</span>
                        </div>
                        {item.count !== undefined && item.count > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--negative)] text-white font-medium">{item.count}</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex h-screen sticky top-0 overflow-y-auto flex-col justify-between bg-card border-r border-border transition-all duration-200 relative z-30 select-none",
          sidebarCollapsed ? "w-[76px]" : "w-64"
        )}
      >
        <div className="p-4 space-y-4">
          <div className={cn("flex items-center gap-3 justify-between pb-1", sidebarCollapsed && "justify-center")}>
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm shrink-0">
                NL
              </div>
              {!sidebarCollapsed && (
                <div>
                  <span className="font-display font-semibold text-sm tracking-tight text-foreground block leading-tight">Nivesh Lens</span>
                  <span className="text-[10px] text-muted-foreground block -mt-0.5">Portfolio diagnostics</span>
                </div>
              )}
            </Link>

            {!sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="p-1 rounded-[var(--radius-sm)] hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Collapse sidebar"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
              </button>
            )}
          </div>

          {sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="mx-auto block p-1.5 rounded-[var(--radius-sm)] hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Expand sidebar"
            >
              <Menu className="h-4 w-4" strokeWidth={1.75} />
            </button>
          )}

          {!sidebarCollapsed ? (
            <button
              onClick={() => openSyncModal("OTP")}
              className="w-full py-2 px-3 rounded-[var(--radius-md)] bg-[var(--primary-soft)] hover:bg-primary/25 border border-primary/25 text-primary text-[12.5px] font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Connect portfolio</span>
            </button>
          ) : (
            <button
              onClick={() => openSyncModal("OTP")}
              title="Connect portfolio"
              className="mx-auto p-2 rounded-[var(--radius-md)] bg-primary text-primary-foreground flex items-center justify-center cursor-pointer active:scale-95"
            >
              <RefreshCw className="w-4 h-4" strokeWidth={1.75} />
            </button>
          )}

          <nav className="space-y-1 pt-1">
            {navigationGroups.map((group) => {
              const isGroupOpen = sidebarCollapsed || expandedGroup === group.groupTitle;
              return (
              <div key={group.groupTitle} className="space-y-0.5">
                {!sidebarCollapsed && (
                  <button
                    onClick={() => setExpandedGroup(isGroupOpen ? undefined : group.groupTitle)}
                    aria-expanded={isGroupOpen}
                    className="w-full flex items-center justify-between px-3 py-1 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group/header"
                  >
                    <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-medium">{group.groupTitle}</p>
                    <ChevronRight className={cn("w-3 h-3 text-muted-foreground transition-transform", isGroupOpen && "rotate-90")} strokeWidth={2} />
                  </button>
                )}
                {isGroupOpen && group.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all relative group",
                        isActive 
                          ? "bg-primary/10 text-primary border border-primary/20 shadow-sm" 
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      )}
                      title={sidebarCollapsed ? item.name : undefined}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                        {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
                      </div>

                      {!sidebarCollapsed && item.count !== undefined && item.count > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--negative)] text-white font-bold">{item.count}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-border space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-accent text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-border">
              AT
            </div>
            {!sidebarCollapsed && (
              <div className="overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <h5 className="text-xs font-bold text-foreground truncate">Anubhav Thakur</h5>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-primary/10 text-primary font-mono font-bold">KYC</span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate font-mono">PAN: ABCDE****F</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent text-xs flex items-center gap-2 cursor-pointer transition-colors"
            >
              {mounted && theme === "dark" ? <Sun className="h-4 w-4" strokeWidth={1.75} /> : <Moon className="h-4 w-4" strokeWidth={1.75} />}
              {!sidebarCollapsed && <span className="text-[11.5px]">{mounted && theme === "dark" ? "Light" : "Dark"}</span>}
            </button>

            {!sidebarCollapsed && (
              <Link href="/" className="text-[11.5px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                <LogOut className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>Exit</span>
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* Main workspace */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <MarketTickerBar />
        <header className="hidden md:flex items-center justify-between gap-6 px-8 h-16 border-b border-border bg-card/70 backdrop-blur-md sticky top-0 z-20">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Nivesh Lens</span>
              <span>/</span>
              <span className="capitalize text-primary font-semibold">
                {pathname.replace("/", "").replace("-", " ") || "Overview"}
              </span>
            </div>
            <TrustBar compact />
          </div>

          <div className="max-w-md flex-1">
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => openSyncModal("OTP")}
              className="px-3 py-1.5 rounded-xl border border-primary/25 bg-primary/10 text-primary text-xs font-semibold flex items-center gap-1.5 hover:bg-primary/20 transition-colors cursor-pointer active:scale-95"
            >
              <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span>1-OTP Sync</span>
            </button>

            <div className="h-4 w-px bg-border" />

            <Link href="/alerts" className="relative p-2 rounded-lg hover:bg-accent transition-colors">
              <Bell className="h-4 w-4 text-muted-foreground hover:text-foreground" strokeWidth={1.75} />
              {activeAlertsCount > 0 && (
                <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[var(--negative)] text-white text-[9px] font-bold flex items-center justify-center">
                  {activeAlertsCount}
                </span>
              )}
            </Link>

            <div className="flex items-center gap-1.5 text-xs text-[var(--positive)] font-semibold bg-[var(--positive-soft)] px-2.5 py-1 rounded-xl border border-[var(--positive)]/20 tabular-nums font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--positive)] animate-pulse" />
              <span>NSE 24,852 (+0.45%)</span>
            </div>
          </div>
        </header>

        <main id="main-content" key={pathname} className="flex-1 p-5 pb-24 md:p-10 md:pb-10 max-w-[1440px] w-full mx-auto animate-fade-in-up motion-reduce:animate-none">
          <ErrorBoundary label="This page">{children}</ErrorBoundary>
        </main>
      </div>

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-border bg-card/95 backdrop-blur-md px-2 py-2 md:hidden">
        {navigationGroups[0].items.slice(0, 5).map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition-colors",
                pathname === item.href ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="w-4 h-4" strokeWidth={1.75} />
              <span className="truncate max-w-[60px]">{item.name.split(" ")[0]}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
