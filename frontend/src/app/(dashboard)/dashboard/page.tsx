"use client";

import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
} from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import {
  TrendingUp,
  Coins,
  Layers,
  ArrowRight,
  RefreshCw,
  Activity,
  FileText,
  SlidersHorizontal,
  Flame,
  Inbox,
  ShieldCheck,
  Bot,
  ChevronDown,
  MoreHorizontal,
} from "lucide-react";

import { usePortfolioStore } from "@/store/portfolioStore";
import { CasPdfUploader } from "@/components/dashboard/CasPdfUploader";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { CountUp } from "@/components/ui/CountUp";
import { EmptyState } from "@/components/ui/EmptyState";
import { OnboardingTour } from "@/components/dashboard/OnboardingTour";
import { cn } from "@/lib/utils";
import { AMFIPortfolioUploader } from "@/components/dashboard/AMFIPortfolioUploader";
import type { Holding } from "@/types";

const VirtualizedTransactionTable =
  dynamic(
    () =>
      import(
        "@/components/dashboard/VirtualizedTransactionTable"
      ).then(
        (m) =>
          m.VirtualizedTransactionTable
      ),
    {
      loading: () => (
        <ChartSkeleton />
      ),
      ssr: false,
    }
  );

const LookThroughTable =
  dynamic(
    () =>
      import(
        "@/components/dashboard/LookThroughTable"
      ).then(
        (m) => m.LookThroughTable
      ),
    {
      loading: () => (
        <ChartSkeleton />
      ),
      ssr: false,
    }
  );

const FeeBleedCalculator =
  dynamic(
    () =>
      import(
        "@/components/dashboard/FeeBleedCalculator"
      ).then(
        (m) =>
          m.FeeBleedCalculator
      ),
    {
      loading: () => (
        <ChartSkeleton />
      ),
      ssr: false,
    }
  );

const CrashSimulator =
  dynamic(
    () =>
      import(
        "@/components/dashboard/CrashSimulator"
      ).then(
        (m) => m.CrashSimulator
      ),
    {
      loading: () => (
        <ChartSkeleton />
      ),
      ssr: false,
    }
  );

const PreBuyOverlapGuard =
  dynamic(
    () =>
      import(
        "@/components/dashboard/PreBuyOverlapGuard"
      ).then(
        (m) =>
          m.PreBuyOverlapGuard
      ),
    {
      loading: () => (
        <ChartSkeleton />
      ),
      ssr: false,
    }
  );

const InteractiveWhatsAppAgent =
  dynamic(
    () =>
      import(
        "@/components/dashboard/InteractiveWhatsAppAgent"
      ).then(
        (m) =>
          m.InteractiveWhatsAppAgent
      ),
    {
      loading: () => (
        <ChartSkeleton />
      ),
      ssr: false,
    }
  );

const InteractivePortfolioChart =
  dynamic(
    () =>
      import(
        "@/components/dashboard/InteractivePortfolioChart"
      ).then(
        (m) =>
          m.InteractivePortfolioChart
      ),
    {
      loading: () => (
        <ChartSkeleton />
      ),
      ssr: false,
    }
  );

const InteractiveAllocationBreakdown =
  dynamic(
    () =>
      import(
        "@/components/dashboard/InteractiveAllocationBreakdown"
      ).then(
        (m) =>
          m.InteractiveAllocationBreakdown
      ),
    {
      loading: () => (
        <ChartSkeleton />
      ),
      ssr: false,
    }
  );

const InteractiveCrashBar =
  dynamic(
    () =>
      import(
        "@/components/dashboard/InteractiveCrashBar"
      ).then(
        (m) =>
          m.InteractiveCrashBar
      ),
    {
      loading: () => (
        <ChartSkeleton />
      ),
      ssr: false,
    }
  );

type DashboardTab =
  | "overview"
  | "prebuy"
  | "simulator"
  | "ai_advisor"
  | "lookthrough"
  | "feebleed"
  | "statement";

type ApiHolding = {
  id: string;
  portfolio_id?: string;

  asset_type?: string;
  assetType?: string;

  name: string;
  isin?: string | null;

  quantity?: number | string;
  units?: number | string;

  average_price?: number | string;
  averageCost?: number | string;

  current_price?: number | string;
  currentPrice?: number | string;

  invested_value?: number | string;
  investedValue?: number | string;

  current_value?: number | string;
  currentValue?: number | string;

  returns?: number | string;
  returns_value?: number | string;
  returnsValue?: number | string;

  plan_type?: string;
  planType?: string;

  expense_ratio?: number | string;
  expenseRatio?: number | string;

  risk_grade?: string;
  riskGrade?: string;

  asset_class?: string;
  assetClass?: string;

  ticker?: string | null;
};

type ApiPortfolio = {
  id: string;
  name: string;
  total_value: number;
  holdings?: ApiHolding[];
};

function toNumber(
  value: unknown
): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === "string"
  ) {
    const number =
      Number(
        value.replace(
          /,/g,
          ""
        )
      );

    return Number.isFinite(
      number
    )
      ? number
      : 0;
  }

  return 0;
}

function normalizeHolding(
  item: ApiHolding,
  index: number
): Holding {
  const assetType =
    item.asset_type ??
    item.assetType ??
    "UNKNOWN";

  const assetClass =
    item.asset_class ??
    item.assetClass ??
    "Equity";

  return {
    id:
      item.id ??
      `api_holding_${index}`,

    name:
      item.name ??
      "Unnamed Holding",

    ticker:
      item.ticker ??
      item.isin?.slice(0, 6) ??
      `H${index + 1}`,

    isin:
      item.isin ??
      undefined,

    units: toNumber(
      item.quantity ??
        item.units
    ),

    averageCost:
      toNumber(
        item.average_price ??
          item.averageCost
      ),

    currentValue:
      toNumber(
        item.current_value ??
          item.currentValue
      ),

    currentPrice:
      toNumber(
        item.current_price ??
          item.currentPrice
      ),

    returns:
      toNumber(
        item.returns
      ),

    returnsValue:
      toNumber(
        item.returns_value ??
          item.returnsValue
      ),

    planType:
      item.plan_type ??
      item.planType ??
      "Direct",

    expenseRatio:
      toNumber(
        item.expense_ratio ??
          item.expenseRatio
      ),

    riskGrade:
      item.risk_grade ??
      item.riskGrade ??
      "Low",

    assetClass,

    underlyingHoldings:
      undefined,
  } as unknown as Holding;
}

export default function DashboardPage() {
  const router =
    useRouter();

  const {
    openSyncModal,
    holdings,
    setHoldings,
    getTotalPortfolioValue,
    getTotalGainValue,
    getTotalGainPercent,
    getWastedFeeAnnually,
  } = usePortfolioStore();

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<DashboardTab>(
      "overview"
    );

  const [
    pnlMode,
    setPnlMode,
  ] =
    useState<"total" | "day">(
      "total"
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    loadError,
    setLoadError,
  ] =
    useState("");

  const [
    isMoreOpen,
    setIsMoreOpen,
  ] =
    useState(false);

  const moreMenuRef =
    React.useRef<HTMLDivElement>(
      null
    );

  /*
   * =========================================================
   * LOAD REAL PORTFOLIO
   * =========================================================
   */

  const loadPortfolio =
    useCallback(
      async () => {
        setIsLoading(true);
        setLoadError("");

        try {
          const response =
            await fetch(
              "/api/portfolio/portfolios",
              {
                method: "GET",
                credentials:
                  "include",
                cache: "no-store",
              }
            );

          if (
            response.status ===
            401
          ) {
            router.push(
              `/login?next=${encodeURIComponent(
                window.location.pathname
              )}`
            );

            return;
          }

          if (
            !response.ok
          ) {
            throw new Error(
              "Unable to load your portfolio."
            );
          }

          const data =
            (await response.json()) as ApiPortfolio[];

          if (
            !Array.isArray(data)
          ) {
            throw new Error(
              "Invalid portfolio response."
            );
          }

          /*
           * Use CAS Portfolio if it exists.
           * Otherwise use most recent portfolio.
           */
          const portfolio =
            data.find(
              (item) =>
                item.name ===
                "CAS Portfolio"
            ) ??
            data[0];

          if (
            !portfolio
          ) {
            setHoldings([]);
            return;
          }

          const remoteHoldings =
            Array.isArray(
              portfolio.holdings
            )
              ? portfolio.holdings.map(
                  (
                    item,
                    index
                  ) =>
                    normalizeHolding(
                      item,
                      index
                    )
                )
              : [];

          console.log(
            "Loaded portfolio:",
            portfolio
          );

          console.log(
            "Loaded holdings:",
            remoteHoldings
          );

          /*
           * PostgreSQL is source of truth.
           */
          setHoldings(
            remoteHoldings
          );
        } catch (error) {
          console.error(
            "Portfolio load error:",
            error
          );

          setLoadError(
            error instanceof
              Error
              ? error.message
              : "Unable to load portfolio."
          );

          /*
           * NEVER fall back to demo data.
           */
          setHoldings([]);
        } finally {
          setIsLoading(false);
        }
      },
      [
        router,
        setHoldings,
      ]
    );

  /*
   * Load when dashboard opens.
   */
  useEffect(() => {
    void loadPortfolio();
  }, [loadPortfolio]);

  /*
   * Reload when browser regains focus.
   */
  useEffect(() => {
    const handleFocus =
      () => {
        void loadPortfolio();
      };

    window.addEventListener(
      "focus",
      handleFocus
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleFocus
      );
    };
  }, [loadPortfolio]);

  /*
   * Close More menu.
   */
  useEffect(() => {
    if (!isMoreOpen) {
      return;
    }

    const handleOutside =
      (
        event: MouseEvent
      ) => {
        if (
          moreMenuRef.current &&
          !moreMenuRef.current.contains(
            event.target as Node
          )
        ) {
          setIsMoreOpen(
            false
          );
        }
      };

    document.addEventListener(
      "mousedown",
      handleOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutside
      );
    };
  }, [isMoreOpen]);

  /*
   * =========================================================
   * REAL CALCULATIONS
   * =========================================================
   */

  const stats =
    useMemo(() => {
      const totalValue =
        getTotalPortfolioValue();

      const totalGain =
        getTotalGainValue();

      const gainPercent =
        getTotalGainPercent();

      const annualBleed =
        getWastedFeeAnnually();

      const sorted =
        [...holdings].sort(
          (
            a,
            b
          ) =>
            (Number(
              b.currentValue
            ) || 0) -
            (Number(
              a.currentValue
            ) || 0)
        );

      const topHolding =
        sorted[0] ??
        null;

      const topWeight =
        topHolding &&
        totalValue > 0
          ? ((Number(
              topHolding.currentValue
            ) || 0) /
              totalValue) *
            100
          : 0;

      let equityCount = 0;
      let mutualFundCount = 0;

      for (const holding of holdings) {
        const assetType =
          String(
            (holding as any)
              .assetType ??
              (holding as any)
                .asset_type ??
              ""
          ).toUpperCase();

        const assetClass =
          String(
            (holding as any)
              .assetClass ??
              (holding as any)
                .asset_class ??
              ""
          ).toUpperCase();

        if (
          assetType.includes(
            "MUTUAL"
          )
        ) {
          mutualFundCount++;
        } else if (
          assetType.includes(
            "STOCK"
          ) ||
          assetType.includes(
            "EQUITY"
          ) ||
          assetClass.includes(
            "EQUITY"
          ) ||
          assetClass.includes(
            "STOCK"
          )
        ) {
          equityCount++;
        }
      }

      const healthScore =
        holdings.length === 0
          ? 0
          : Math.min(
              300 +
                holdings.length *
                  55,
              900
            );

      const grade =
        healthScore >= 700
          ? "Healthy"
          : healthScore >=
              500
            ? "Moderate"
            : "Needs Attention";

      return {
        totalValue,
        totalGain,
        gainPercent,
        annualBleed,
        topHolding,
        topWeight,
        equityCount,
        mutualFundCount,
        healthScore,
        grade,
      };
    }, [
      holdings,
      getTotalPortfolioValue,
      getTotalGainValue,
      getTotalGainPercent,
      getWastedFeeAnnually,
    ]);

  const hasHoldings =
    holdings.length > 0;

  /*
   * =========================================================
   * TABS
   * =========================================================
   */

  const tabs: {
    id: DashboardTab;
    label: string;
    icon: React.ComponentType<{
      className?: string;
      strokeWidth?: number;
    }>;
  }[] = [
    {
      id: "overview",
      label:
        "Executive Terminal",
      icon: Activity,
    },
    {
      id: "prebuy",
      label:
        "Pre-Buy Overlap Radar",
      icon: ShieldCheck,
    },
    {
      id: "simulator",
      label:
        "Crash Stress-Tester",
      icon: SlidersHorizontal,
    },
    {
      id: "ai_advisor",
      label:
        "AI Wealth Assistant",
      icon: Bot,
    },
    {
      id: "lookthrough",
      label:
        "Stock Look-Through",
      icon: Layers,
    },
    {
      id: "feebleed",
      label:
        "Fee Bleed & Direct",
      icon: Coins,
    },
    {
      id: "statement",
      label:
        "CAS & Live Trades",
      icon: FileText,
    },
  ];

  const primaryTabs =
    tabs.slice(0, 4);

  const moreTabs =
    tabs.slice(4);

  /*
   * =========================================================
   * UI
   * =========================================================
   */

  return (
    <div className="space-y-8 pb-16 max-w-[1440px] mx-auto">

      <OnboardingTour />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Portfolio Dashboard
          </h1>

          <p className="text-xs text-muted-foreground mt-0.5">
            {hasHoldings
              ? `Live portfolio · ${stats.mutualFundCount} Mutual Funds · ${stats.equityCount} Equities`
              : "No portfolio connected"}
          </p>

          {hasHoldings && (
            <p className="text-[10px] text-[var(--positive)] mt-1">
              ● Live data from your authenticated portfolio
            </p>
          )}
        </div>

        <Button
          onClick={() =>
            openSyncModal(
              "OTP"
            )
          }
          size="sm"
          className="text-xs font-semibold gap-1.5 h-9 px-3.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />

          Sync Live
        </Button>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({
            length: 4,
          }).map(
            (_, index) => (
              <ChartSkeleton
                key={
                  index
                }
              />
            )
          )}
        </div>
      ) : loadError ? (
        <div className="p-5 rounded-2xl border border-[var(--negative)]/30 bg-[var(--negative)]/10 text-sm text-[var(--negative)]">
          {loadError}
        </div>
      ) : !hasHoldings ? (
        <EmptyState
          icon={Inbox}
          title="No portfolio connected yet"
          description="Upload your CAS statement to populate your real portfolio data."
          actionLabel="Connect portfolio"
          onAction={() =>
            openSyncModal(
              "CAS"
            )
          }
        />
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">

            {/* Total Value */}
            <div className="p-5 rounded-2xl border border-border bg-card space-y-2 shadow-sm">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                <span>
                  Net Portfolio Value
                </span>

                <div className="flex items-center gap-1 bg-accent p-0.5 rounded-lg border border-border">
                  <button
                    onClick={() =>
                      setPnlMode(
                        "total"
                      )
                    }
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-mono",
                      pnlMode ===
                        "total"
                        ? "bg-primary text-primary-foreground font-bold"
                        : "text-muted-foreground"
                    )}
                  >
                    Total
                  </button>

                  <button
                    onClick={() =>
                      setPnlMode(
                        "day"
                      )
                    }
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-mono",
                      pnlMode ===
                        "day"
                        ? "bg-primary text-primary-foreground font-bold"
                        : "text-muted-foreground"
                    )}
                  >
                    1D
                  </button>
                </div>
              </div>

              <p className="font-finance text-2xl sm:text-[30px] font-bold text-foreground tabular-nums">
                <CountUp
                  value={
                    stats.totalValue
                  }
                  prefix="₹"
                />
              </p>

              {pnlMode ===
              "total" ? (
                <div className="flex items-center gap-1.5 text-xs text-[var(--positive)] font-semibold">
                  <TrendingUp className="w-3.5 h-3.5" />

                  <span>
                    ₹
                    {stats.totalGain.toLocaleString(
                      "en-IN"
                    )}{" "}
                    (
                    {stats.gainPercent.toFixed(
                      2
                    )}
                    %)
                  </span>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  Live daily P&L is not available yet.
                </div>
              )}
            </div>

            {/* Health */}
            <Link
              href="/portfolio-xray"
              className="block"
            >
              <div className="p-5 rounded-2xl border border-border bg-card space-y-2 shadow-sm h-full">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                  <span>
                    Portfolio Health
                  </span>

                  <Activity className="w-4 h-4" />
                </div>

                <p className="text-2xl sm:text-[30px] font-bold tabular-nums">
                  <CountUp
                    value={
                      stats.healthScore
                    }
                  />

                  <span className="text-xs font-normal text-muted-foreground">
                    {" "}
                    / 900
                  </span>
                </p>

                <div className="text-[11px] text-muted-foreground">
                  Grade:{" "}
                  <strong className="text-[var(--positive)]">
                    {stats.grade}
                  </strong>
                </div>
              </div>
            </Link>

            {/* Top Holding */}
            <div
              onClick={() =>
                setActiveTab(
                  "lookthrough"
                )
              }
              className="p-5 rounded-2xl border border-border bg-card space-y-2 shadow-sm cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                <span>
                  Top Holding Weight
                </span>

                <Flame className="w-4 h-4" />
              </div>

              <p className="text-2xl sm:text-[30px] font-bold text-[var(--negative)] tabular-nums">
                <CountUp
                  value={
                    stats.topWeight
                  }
                  decimals={1}
                  suffix="%"
                />
              </p>

              <div className="text-[11px] text-muted-foreground truncate">
                {stats.topHolding?.name ??
                  "N/A"}
              </div>
            </div>

            {/* Fee */}
            <div
              onClick={() =>
                setActiveTab(
                  "feebleed"
                )
              }
              className="p-5 rounded-2xl border border-border bg-card space-y-2 shadow-sm cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                <span>
                  Annual Fee Bleed
                </span>

                <Coins className="w-4 h-4" />
              </div>

              <p className="text-2xl sm:text-[30px] font-bold text-[var(--warning)] tabular-nums">
                <CountUp
                  value={
                    stats.annualBleed
                  }
                  prefix="₹"
                />
              </p>

              <div className="text-[11px] text-muted-foreground">
                Based on current holdings.
              </div>
            </div>
          </div>
        </>
      )}

      {/* Tabs */}
      <div className="border-b border-border pb-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">

          {primaryTabs.map(
            (tab) => {
              const Icon =
                tab.icon;

              const active =
                activeTab ===
                tab.id;

              return (
                <button
                  key={
                    tab.id
                  }
                  onClick={() =>
                    setActiveTab(
                      tab.id
                    )
                  }
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border whitespace-nowrap",
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <Icon className="w-4 h-4" />

                  <span>
                    {tab.label}
                  </span>
                </button>
              );
            }
          )}

          <div
            className="relative"
            ref={
              moreMenuRef
            }
          >
            <button
              onClick={() =>
                setIsMoreOpen(
                  (value) =>
                    !value
                )
              }
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border whitespace-nowrap",
                moreTabs.some(
                  (tab) =>
                    tab.id ===
                    activeTab
                )
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground"
              )}
            >
              <MoreHorizontal className="w-4 h-4" />

              More

              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5",
                  isMoreOpen &&
                    "rotate-180"
                )}
              />
            </button>

            {isMoreOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-56 rounded-xl border border-border bg-card shadow-xl py-1.5 z-20">
                {moreTabs.map(
                  (tab) => {
                    const Icon =
                      tab.icon;

                    return (
                      <button
                        key={
                          tab.id
                        }
                        onClick={() => {
                          setActiveTab(
                            tab.id
                          );

                          setIsMoreOpen(
                            false
                          );
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-left text-muted-foreground hover:text-foreground hover:bg-accent"
                      >
                        <Icon className="w-4 h-4" />

                        {tab.label}
                      </button>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab content */}

      {activeTab ===
        "overview" && (
        <div className="space-y-8">
          {hasHoldings ? (
            <>
              <InteractivePortfolioChart />

              <InteractiveAllocationBreakdown />

              <div className="grid md:grid-cols-2 gap-6">

                {/* Real holdings */}
                <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
                  <div className="pb-3 border-b border-border">
                    <h3 className="text-sm font-bold">
                      Top Holdings
                    </h3>

                    <p className="text-xs text-muted-foreground">
                      Actual imported portfolio holdings
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {[...holdings]
                      .sort(
                        (
                          a,
                          b
                        ) =>
                          (Number(
                            b.currentValue
                          ) || 0) -
                          (Number(
                            a.currentValue
                          ) || 0)
                      )
                      .slice(
                        0,
                        5
                      )
                      .map(
                        (
                          holding
                        ) => {
                          const value =
                            Number(
                              holding.currentValue
                            ) || 0;

                          const weight =
                            stats.totalValue >
                            0
                              ? (value /
                                  stats.totalValue) *
                                100
                              : 0;

                          return (
                            <div
                              key={
                                holding.id
                              }
                              className="p-3.5 rounded-xl bg-accent/40 border border-border flex items-center justify-between"
                            >
                              <div className="min-w-0">
                                <p className="font-bold text-sm truncate">
                                  {
                                    holding.name
                                  }
                                </p>

                                <p className="text-[11px] text-muted-foreground">
                                  ₹
                                  {value.toLocaleString(
                                    "en-IN"
                                  )}
                                </p>
                              </div>

                              <div className="font-bold text-sm ml-3">
                                {weight.toFixed(
                                  1
                                )}
                                %
                              </div>
                            </div>
                          );
                        }
                      )}
                  </div>
                </div>

                {/* Real fees */}
                <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
                  <div className="pb-3 border-b border-border">
                    <h3 className="text-sm font-bold">
                      Annual Fee Summary
                    </h3>

                    <p className="text-xs text-muted-foreground">
                      Calculated from current holdings
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-accent/40 border border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        Estimated annual fee drag
                      </span>

                      <span className="font-bold">
                        ₹
                        {stats.annualBleed.toLocaleString(
                          "en-IN"
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              icon={Inbox}
              title="No portfolio data"
              description="Upload a CAS statement to populate your dashboard."
              actionLabel="Upload CAS"
              onAction={() =>
                setActiveTab(
                  "statement"
                )
              }
            />
          )}
        </div>
      )}

      {activeTab ===
        "prebuy" && (
        <PreBuyOverlapGuard />
      )}

      {activeTab ===
        "simulator" && (
        <div className="space-y-8">
          <InteractiveCrashBar />
          <CrashSimulator />
        </div>
      )}

      {activeTab ===
        "ai_advisor" && (
        <InteractiveWhatsAppAgent />
      )}

      {activeTab ===
        "lookthrough" && (
        <LookThroughTable />
      )}

      {activeTab ===
        "feebleed" && (
        <FeeBleedCalculator />
      )}

      {activeTab ===
        "statement" && (
        <div className="space-y-8">
          <CasPdfUploader
            onSuccess={() =>
              void loadPortfolio()
          }
        />

<AMFIPortfolioUploader
  onSuccess={() =>
    void loadPortfolio()
  }
          />

          <div className="p-6 rounded-2xl border border-border bg-card">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-primary" />

              <div>
                <h3 className="text-sm font-bold">
                  Transactions
                </h3>

                <p className="text-xs text-muted-foreground">
                  Imported transactions will appear here when available.
                </p>
              </div>
            </div>

            <div className="mt-4">
              <VirtualizedTransactionTable
                transactions={[]}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}