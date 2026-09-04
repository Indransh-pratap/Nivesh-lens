"use client";

import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
} from "react";

import {
  TrendingUp,
  Coins,
  Layers,
  RefreshCw,
  Activity,
  FileText,
  SlidersHorizontal,
  Flame,
  CheckCircle2,
  Inbox,
  ShieldCheck,
  Bot,
  ChevronDown,
  MoreHorizontal,
} from "lucide-react";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import { usePortfolioStore } from "@/store/portfolioStore";
import { CasPdfUploader } from "@/components/dashboard/CasPdfUploader";
import { ChartSkeleton } from "@/components/ui/Skeleton";

import { Button } from "@/components/ui/Button";
import { CountUp } from "@/components/ui/CountUp";
import { EmptyState } from "@/components/ui/EmptyState";
import { OnboardingTour } from "@/components/dashboard/OnboardingTour";
import { cn } from "@/lib/utils";

import type { Holding } from "@/types";

/*
 * These tabs are loaded only when opened.
 */
const VirtualizedTransactionTable = dynamic(
  () =>
    import(
      "@/components/dashboard/VirtualizedTransactionTable"
    ).then(
      (m) => m.VirtualizedTransactionTable
    ),
  {
    loading: () => (
      <ChartSkeleton />
    ),
    ssr: false,
  }
);

const LookThroughTable = dynamic(
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

const FeeBleedCalculator = dynamic(
  () =>
    import(
      "@/components/dashboard/FeeBleedCalculator"
    ).then(
      (m) => m.FeeBleedCalculator
    ),
  {
    loading: () => (
      <ChartSkeleton />
    ),
    ssr: false,
  }
);

const CrashSimulator = dynamic(
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

const PreBuyOverlapGuard = dynamic(
  () =>
    import(
      "@/components/dashboard/PreBuyOverlapGuard"
    ).then(
      (m) => m.PreBuyOverlapGuard
    ),
  {
    loading: () => (
      <ChartSkeleton />
    ),
    ssr: false,
  }
);

const InteractiveWhatsAppAgent = dynamic(
  () =>
    import(
      "@/components/dashboard/InteractiveWhatsAppAgent"
    ).then(
      (m) => m.InteractiveWhatsAppAgent
    ),
  {
    loading: () => (
      <ChartSkeleton />
    ),
    ssr: false,
  }
);

const InteractivePortfolioChart = dynamic(
  () =>
    import(
      "@/components/dashboard/InteractivePortfolioChart"
    ).then(
      (m) => m.InteractivePortfolioChart
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

const InteractiveCrashBar = dynamic(
  () =>
    import(
      "@/components/dashboard/InteractiveCrashBar"
    ).then(
      (m) => m.InteractiveCrashBar
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
    const parsed = Number(
      value.replace(/,/g, "")
    );

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  }

  return 0;
}

function normalizeHolding(
  item: ApiHolding,
  index: number
): Holding {
  const currentValue =
    toNumber(
      item.current_value ??
        item.currentValue
    );

  const currentPrice =
    toNumber(
      item.current_price ??
        item.currentPrice
    );

  const quantity =
    toNumber(
      item.quantity ??
        item.units
    );

  const averagePrice =
    toNumber(
      item.average_price ??
        item.averageCost
    );

  const investedValue =
    toNumber(
      item.invested_value ??
        item.investedValue
    );

  const returnsValue =
    toNumber(
      item.returns_value ??
        item.returnsValue
    );

  const assetType =
    item.asset_type ??
    item.assetType ??
    "UNKNOWN";

  const planType =
    item.plan_type ??
    item.planType ??
    "Direct";

  const expenseRatio =
    toNumber(
      item.expense_ratio ??
        item.expenseRatio
    );

  const riskGrade =
    item.risk_grade ??
    item.riskGrade ??
    "Low";

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

    units: quantity,

    averageCost:
      averagePrice,

    currentValue,

    currentPrice,

    returns:
      toNumber(item.returns),

    returnsValue,

    planType:
      planType === "Regular"
        ? "Regular"
        : "Direct",

    expenseRatio,

    riskGrade:
      riskGrade === "High"
        ? "High"
        : riskGrade === "Medium"
          ? "Medium"
          : "Low",

    assetClass,

    underlyingHoldings:
      undefined,
  } as unknown as Holding;
}

export default function DashboardPage() {
  const router = useRouter();

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
  ] = useState(true);

  const [
    loadError,
    setLoadError,
  ] = useState("");

  const [
    isMoreOpen,
    setIsMoreOpen,
  ] = useState(false);

  const moreMenuRef =
    React.useRef<HTMLDivElement>(
      null
    );

  /*
   * =========================================================
   * LOAD REAL PORTFOLIO FROM BACKEND
   * =========================================================
   *
   * This is the missing piece.
   *
   * Previously dashboard only read Zustand memory.
   * After refresh, it had no reason to fetch PostgreSQL.
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
                credentials: "include",
                cache: "no-store",
              }
            );

          if (
            response.status === 401
          ) {
            router.push(
              `/login?next=${encodeURIComponent(
                window.location.pathname
              )}`
            );
            return;
          }

          if (!response.ok) {
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
           * Prefer the CAS Portfolio when it exists.
           * Otherwise use the newest portfolio.
           */
          const portfolio =
            data.find(
              (item) =>
                item.name ===
                "CAS Portfolio"
            ) ?? data[0];

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

          /*
           * Database is the source of truth.
           */
          setHoldings(
            remoteHoldings
          );
        } catch (error) {
          console.error(
            "Portfolio load failed:",
            error
          );

          setLoadError(
            error instanceof
              Error
              ? error.message
              : "Unable to load your portfolio."
          );

          /*
           * Do not inject mock holdings when
           * API fails.
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
   * Load the authenticated user's portfolio
   * every time dashboard mounts.
   */
  useEffect(() => {
    void loadPortfolio();
  }, [loadPortfolio]);

  /*
   * Refresh after returning to dashboard/tab.
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

    return () =>
      window.removeEventListener(
        "focus",
        handleFocus
      );
  }, [loadPortfolio]);

  /*
   * Close More menu on outside click.
   */
  useEffect(() => {
    if (!isMoreOpen) {
      return;
    }

    const handleClickOutside =
      (event: MouseEvent) => {
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
      handleClickOutside
    );

    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
  }, [isMoreOpen]);

  /*
   * =========================================================
   * REAL KPI CALCULATIONS
   * =========================================================
   */

  const portfolioStats =
    useMemo(() => {
      const totalValue =
        getTotalPortfolioValue();

      const totalGain =
        getTotalGainValue();

      const gainPercent =
        getTotalGainPercent();

      const annualBleed =
        getWastedFeeAnnually();

      const equityHoldings =
        holdings.filter(
          (holding) => {
            const type =
              String(
                (holding as unknown as any).assetClass ??
                  ""
              ).toUpperCase();

            const assetType =
              String(
                (holding as any)
                  .assetType ??
                  (holding as any)
                    .asset_type ??
                  ""
              ).toUpperCase();

            return (
              type.includes(
                "EQUITY"
              ) ||
              type.includes(
                "STOCK"
              ) ||
              assetType.includes(
                "EQUITY"
              ) ||
              assetType.includes(
                "STOCK"
              )
            );
          }
        );

      const mutualFundHoldings =
        holdings.filter(
          (holding) => {
            const type =
              String(
                (holding as any)
                  .assetType ??
                  (holding as any)
                    .asset_type ??
                  ""
              ).toUpperCase();

            return type.includes(
              "MUTUAL"
            );
          }
        );

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
        sorted[0] ?? null;

      const topWeight =
        topHolding &&
        totalValue > 0
          ? (Number(
              topHolding.currentValue
            ) /
              totalValue) *
            100
          : 0;

      /*
       * A simple real-data score.
       * It depends on actual imported holdings,
       * never on demo data.
       */
      const diversificationScore =
        holdings.length === 0
          ? 0
          : Math.min(
              300 +
                holdings.length *
                  55,
              900
            );

      const grade =
        diversificationScore >=
        700
          ? "Healthy"
          : diversificationScore >=
              500
            ? "Moderate"
            : "Needs Attention";

      return {
        totalValue,

        totalGain,

        gainPercent,

        annualBleed,

        equityCount:
          equityHoldings.length,

        mutualFundCount:
          mutualFundHoldings.length,

        topHolding,

        topWeight,

        diversificationScore,

        grade,
      };
    }, [
      holdings,
      getTotalPortfolioValue,
      getTotalGainValue,
      getTotalGainPercent,
      getWastedFeeAnnually,
    ]);

  const {
    totalValue,
    totalGain,
    gainPercent,
    annualBleed,
    equityCount,
    mutualFundCount,
    topHolding,
    topWeight,
    diversificationScore,
    grade,
  } = portfolioStats;

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
      label: "Executive Terminal",
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

  const PRIMARY_TAB_COUNT = 4;

  const primaryTabs =
    tabs.slice(
      0,
      PRIMARY_TAB_COUNT
    );

  const moreTabs =
    tabs.slice(
      PRIMARY_TAB_COUNT
    );

  /*
   * =========================================================
   * RENDER
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
              ? `Live portfolio · ${mutualFundCount} Mutual Funds · ${equityCount} Equities`
              : "Connect your portfolio to start diagnostics"}
          </p>

          {hasHoldings && (
            <p className="text-[10px] text-[var(--positive)] mt-1 font-medium">
              ● Live data loaded from your portfolio
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() =>
              openSyncModal(
                "OTP"
              )
            }
            size="sm"
            className="text-xs font-semibold gap-1.5 h-8.5 px-3.5"
          >
            <RefreshCw
              className="w-3.5 h-3.5"
              strokeWidth={2}
            />

            <span>
              Sync Live
            </span>
          </Button>
        </div>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({
            length: 4,
          }).map(
            (_, index) => (
              <ChartSkeleton
                key={index}
              />
            )
          )}
        </div>
      ) : loadError ? (
        <div className="p-6 rounded-2xl border border-[var(--negative)]/30 bg-[var(--negative)]/10 text-sm text-[var(--negative)]">
          {loadError}
        </div>
      ) : !hasHoldings ? (
        <EmptyState
          icon={Inbox}
          title="No portfolio connected yet"
          description="Upload your CAS statement or connect through Account Aggregator."
          actionLabel="Connect portfolio"
          onAction={() =>
            openSyncModal(
              "OTP"
            )
          }
        />
      ) : (
        <>
          {/* ================================================= */}
          {/* KPI CARDS                                         */}
          {/* ================================================= */}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Net Worth */}
            <div className="p-5 rounded-2xl border border-border bg-card space-y-2 shadow-sm">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                <span>
                  Net Portfolio Value
                </span>

                <div className="flex items-center gap-1 bg-accent/80 p-0.5 rounded-lg border border-border">
                  <button
                    onClick={() =>
                      setPnlMode(
                        "total"
                      )
                    }
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-mono cursor-pointer",
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
                      "px-2 py-0.5 rounded-md text-[10px] font-mono cursor-pointer",
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
                    totalValue
                  }
                  prefix="₹"
                />
              </p>

              {pnlMode ===
              "total" ? (
                <div className="flex items-center gap-1.5 text-xs text-[var(--positive)] font-semibold tabular-nums">
                  <TrendingUp className="w-3.5 h-3.5" />

                  <span>
                    ₹
                    {totalGain.toLocaleString(
                      "en-IN"
                    )}{" "}
                    (
                    {gainPercent >=
                    0
                      ? "+"
                      : ""}
                    {gainPercent.toFixed(
                      2
                    )}
                    %)
                  </span>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  Daily P&L requires live market-price feed.
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
                      diversificationScore
                    }
                  />

                  <span className="text-xs font-normal text-muted-foreground">
                    {" "}
                    / 900
                  </span>
                </p>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>
                    Grade:{" "}
                    <strong className="text-[var(--positive)]">
                      {grade}
                    </strong>
                  </span>

                  <span className="text-primary font-semibold">
                    View X-Ray →
                  </span>
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
                    topWeight
                  }
                  decimals={1}
                  suffix="%"
                />
              </p>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="truncate">
                  {topHolding?.name ??
                    "N/A"}
                </span>

                <span className="text-primary font-semibold">
                  View →
                </span>
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
                    annualBleed
                  }
                  prefix="₹"
                />
              </p>

              <div className="text-[11px] text-muted-foreground">
                Calculated from current holdings.
              </div>
            </div>
          </div>
        </>
      )}

      {/* ===================================================== */}
      {/* TAB BAR                                               */}
      {/* ===================================================== */}

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
                      : "bg-card border-border text-muted-foreground hover:text-foreground"
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

          {moreTabs.length >
            0 && (
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

                <span>
                  More
                </span>

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
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-left",
                            activeTab ===
                              tab.id
                              ? "text-primary bg-primary/10"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent"
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
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ===================================================== */}
      {/* TAB CONTENTS                                          */}
      {/* ===================================================== */}

      <div>
        {/* Overview */}
        {activeTab ===
          "overview" && (
          <div className="space-y-8">
            {hasHoldings ? (
              <>
                <InteractivePortfolioChart />

                <InteractiveAllocationBreakdown />

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Real top holdings */}
                  <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-border">
                      <div>
                        <h3 className="text-sm font-bold">
                          Top Holdings
                        </h3>

                        <p className="text-xs text-muted-foreground">
                          From your imported portfolio
                        </p>
                      </div>

                      <button
                        onClick={() =>
                          setActiveTab(
                            "lookthrough"
                          )
                        }
                        className="text-xs text-primary font-bold"
                      >
                        View All
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {[
                        ...holdings,
                      ]
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
                          3
                        )
                        .map(
                          (
                            holding
                          ) => {
                            const weight =
                              totalValue >
                              0
                                ? ((Number(
                                    holding.currentValue
                                  ) ||
                                    0) /
                                    totalValue) *
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

                                  <p className="text-[11px] text-muted-foreground mt-0.5">
                                    ₹
                                    {Number(
                                      holding.currentValue
                                    ).toLocaleString(
                                      "en-IN"
                                    )}
                                  </p>
                                </div>

                                <div className="text-right ml-3">
                                  <p className="font-bold text-sm">
                                    {weight.toFixed(
                                      1
                                    )}
                                    %
                                  </p>
                                </div>
                              </div>
                            );
                          }
                        )}
                    </div>
                  </div>

                  {/* Real fee summary */}
                  <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-border">
                      <div>
                        <h3 className="text-sm font-bold">
                          Annual Fee Summary
                        </h3>

                        <p className="text-xs text-muted-foreground">
                          Calculated from imported holdings
                        </p>
                      </div>

                      <button
                        onClick={() =>
                          setActiveTab(
                            "feebleed"
                          )
                        }
                        className="text-xs text-primary font-bold"
                      >
                        Details
                      </button>
                    </div>

                    <div className="p-4 rounded-xl bg-accent/40 border border-border">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Estimated annual fee drag
                        </span>

                        <span className="font-bold">
                          ₹
                          {annualBleed.toLocaleString(
                            "en-IN"
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[var(--positive-soft)] border border-[var(--positive)]/20 text-xs flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[var(--positive)] shrink-0" />

                      <span className="text-muted-foreground">
                        This number is calculated from the holdings currently stored for your account.
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <EmptyState
                icon={Inbox}
                title="No portfolio data"
                description="Upload a CAS statement to populate your dashboard."
                actionLabel="Connect portfolio"
                onAction={() =>
                  openSyncModal(
                    "OTP"
                  )
                }
              />
            )}
          </div>
        )}

        {/* Pre-buy */}
        {activeTab ===
          "prebuy" && (
          <div className="space-y-8">
            <PreBuyOverlapGuard />
          </div>
        )}

        {/* Simulator */}
        {activeTab ===
          "simulator" && (
          <div className="space-y-8">
            <InteractiveCrashBar />
            <CrashSimulator />
          </div>
        )}

        {/* AI */}
        {activeTab ===
          "ai_advisor" && (
          <div className="space-y-8">
            <InteractiveWhatsAppAgent />
          </div>
        )}

        {/* Look through */}
        {activeTab ===
          "lookthrough" && (
          <div className="space-y-8">
            <LookThroughTable />
          </div>
        )}

        {/* Fees */}
        {activeTab ===
          "feebleed" && (
          <div className="space-y-8">
            <FeeBleedCalculator />
          </div>
        )}

        {/* Statement */}
        {activeTab ===
          "statement" && (
          <div className="space-y-8">
            <CasPdfUploader
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
                    Transaction history will appear here when available from the imported statement.
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
    </div>
  );
}