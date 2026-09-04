"use client";

import React, {
  useMemo,
  useState,
} from "react";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Calendar,
  Layers,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { usePortfolioStore } from "@/store/portfolioStore";

type Timeframe =
  | "1D"
  | "1W"
  | "1M"
  | "1Y"
  | "3Y"
  | "5Y"
  | "ALL";

type ChartDataPoint = {
  date: string;
  portfolio: number;
  invested: number;
  returns: number;
  percent: number;
};

function currentValue(
  holding: any
): number {
  return (
    Number(
      holding.currentValue ??
        holding.current_value ??
        0
    ) || 0
  );
}

function investedValue(
  holding: any
): number {
  return (
    Number(
      holding.investedValue ??
        holding.invested_value ??
        0
    ) || 0
  );
}

export function InteractivePortfolioChart() {
  const holdings =
    usePortfolioStore(
      (state) => state.holdings
    );

  const [
    timeframe,
    setTimeframe,
  ] =
    useState<Timeframe>("1Y");

  const [
    showInvested,
    setShowInvested,
  ] = useState(true);

  const [
    hoveredPoint,
    setHoveredPoint,
  ] =
    useState<ChartDataPoint | null>(
      null
    );

  const data =
    useMemo(() => {
      const portfolio =
        holdings.reduce(
          (sum, holding) =>
            sum +
            currentValue(
              holding
            ),
          0
        );

      const invested =
        holdings.reduce(
          (sum, holding) =>
            sum +
            investedValue(
              holding
            ),
          0
        );

      const returns =
        portfolio -
        invested;

      const percent =
        invested > 0
          ? (returns /
              invested) *
            100
          : 0;

      /*
       * No historical backend data exists in the current
       * portfolio API. Therefore we expose the actual current
       * snapshot rather than fabricate historical numbers.
       */
      return [
        {
          date: "Current",
          portfolio,
          invested,
          returns,
          percent,
        },
      ];
    }, [holdings]);

  const activePoint =
    hoveredPoint ??
    data[0] ?? {
      date: "Current",
      portfolio: 0,
      invested: 0,
      returns: 0,
      percent: 0,
    };

  const isPositive =
    activePoint.returns >=
    0;

  const timeframeLabels: Timeframe[] =
    [
      "1D",
      "1W",
      "1M",
      "1Y",
      "3Y",
      "5Y",
      "ALL",
    ];

  if (
    holdings.length === 0
  ) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-muted-foreground" />

          <div>
            <h3 className="text-base font-bold">
              Portfolio Growth
            </h3>

            <p className="text-xs text-muted-foreground">
              Import your portfolio to view actual portfolio value.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-6 text-foreground">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-bold">
              LIVE PORTFOLIO VALUE
            </span>

            <span className="text-xs text-muted-foreground font-mono">
              {hoveredPoint
                ? hoveredPoint.date
                : "Current portfolio snapshot"}
            </span>
          </div>

          <div className="flex flex-wrap items-baseline gap-3 mt-2">
            <h3 className="text-3xl sm:text-4xl font-bold tracking-tight tabular-nums">
              ₹
              {activePoint.portfolio.toLocaleString(
                "en-IN"
              )}
            </h3>

            <div
              className={cn(
                "flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border",
                isPositive
                  ? "text-[var(--positive)] bg-[var(--positive-soft)] border-[var(--positive)]/30"
                  : "text-[var(--negative)] bg-[var(--negative-soft)] border-[var(--negative)]/30"
              )}
            >
              {isPositive ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}

              <span>
                {isPositive
                  ? "+"
                  : ""}
                ₹
                {Math.abs(
                  activePoint.returns
                ).toLocaleString(
                  "en-IN"
                )}{" "}
                (
                {isPositive
                  ? "+"
                  : ""}
                {activePoint.percent.toFixed(
                  2
                )}
                %)
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3.5 py-2 rounded-xl bg-accent border border-border">
            <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
              Invested
            </span>

            <span className="font-bold text-sm tabular-nums">
              ₹
              {activePoint.invested.toLocaleString(
                "en-IN"
              )}
            </span>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-accent border border-border">
            <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
              Holdings
            </span>

            <span className="font-bold text-sm tabular-nums">
              {holdings.length}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-border">
        <div className="flex items-center gap-1.5 bg-accent/70 p-1 rounded-xl border border-border">
          {timeframeLabels.map(
            (item) => (
              <button
                key={item}
                onClick={() =>
                  setTimeframe(
                    item
                  )
                }
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-mono font-bold",
                  timeframe ===
                    item
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                )}
              >
                {item}
              </button>
            )
          )}
        </div>

        <button
          onClick={() =>
            setShowInvested(
              (value) =>
                !value
            )
          }
          className={cn(
            "px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5",
            showInvested
              ? "bg-accent border-border text-foreground"
              : "border-border bg-card text-muted-foreground"
          )}
        >
          <Layers className="w-3.5 h-3.5" />
          Invested Capital
        </button>
      </div>

      <div className="h-[290px] w-full pt-2">
        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <AreaChart
            data={data}
            margin={{
              top: 10,
              right: 10,
              left: 0,
              bottom: 0,
            }}
            onMouseMove={(
              state: any
            ) => {
              if (
                state?.activePayload
                  ?.length
              ) {
                setHoveredPoint(
                  state
                    .activePayload[0]
                    .payload as ChartDataPoint
                );
              }
            }}
            onMouseLeave={() =>
              setHoveredPoint(
                null
              )
            }
          >
            <defs>
              <linearGradient
                id="realPortfolioGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="#3b82f6"
                  stopOpacity={0.15}
                />

                <stop
                  offset="95%"
                  stopColor="#3b82f6"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />

            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) =>
                `₹${(
                  value / 100000
                ).toFixed(1)}L`
              }
              domain={[
                "dataMin - 50000",
                "dataMax + 50000",
              ]}
            />

            <Tooltip
              content={({
                active,
                payload,
                label,
              }) => {
                if (
                  !active ||
                  !payload?.length
                ) {
                  return null;
                }

                const point =
                  payload[0]
                    .payload as ChartDataPoint;

                return (
                  <div className="bg-[#12131a] border border-[#1f2330] p-3.5 rounded-xl shadow-2xl space-y-2 text-xs min-w-[220px]">
                    <div className="flex items-center justify-between border-b border-border pb-1.5">
                      <span className="flex items-center gap-1 font-semibold">
                        <Calendar className="w-3 h-3 text-primary" />
                        {label}
                      </span>
                    </div>

                    <div className="space-y-1 font-mono">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Portfolio:
                        </span>

                        <span className="font-bold">
                          ₹
                          {point.portfolio.toLocaleString(
                            "en-IN"
                          )}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Invested:
                        </span>

                        <span>
                          ₹
                          {point.invested.toLocaleString(
                            "en-IN"
                          )}
                        </span>
                      </div>

                      <div className="flex justify-between border-t border-border pt-1">
                        <span className="text-muted-foreground">
                          Gain:
                        </span>

                        <span className="font-bold text-[var(--positive)]">
                          ₹
                          {point.returns.toLocaleString(
                            "en-IN"
                          )}{" "}
                          (
                          {point.percent.toFixed(
                            2
                          )}
                          %)
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />

            <Area
              type="monotone"
              dataKey="portfolio"
              name="Portfolio Value"
              stroke="#3b82f6"
              strokeWidth={2.5}
              fill="url(#realPortfolioGradient)"
              activeDot={{
                r: 6,
              }}
            />

            {showInvested && (
              <Area
                type="monotone"
                dataKey="invested"
                name="Invested Capital"
                stroke="#f59e0b"
                strokeWidth={1.75}
                strokeDasharray="4 4"
                fill="none"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border text-xs">
        <div className="p-3 rounded-xl bg-accent/40 border border-border">
          <span className="text-muted-foreground block text-[10.5px]">
            Current Value
          </span>

          <span className="font-bold text-sm">
            ₹
            {activePoint.portfolio.toLocaleString(
              "en-IN"
            )}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-accent/40 border border-border">
          <span className="text-muted-foreground block text-[10.5px]">
            Invested Capital
          </span>

          <span className="font-bold text-sm">
            ₹
            {activePoint.invested.toLocaleString(
              "en-IN"
            )}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-accent/40 border border-border">
          <span className="text-muted-foreground block text-[10.5px]">
            Unrealized Gain
          </span>

          <span className="font-bold text-[var(--positive)] text-sm">
            ₹
            {activePoint.returns.toLocaleString(
              "en-IN"
            )}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-accent/40 border border-border">
          <span className="text-muted-foreground block text-[10.5px]">
            Return
          </span>

          <span className="font-bold text-primary text-sm">
            {activePoint.percent.toFixed(
              2
            )}
            %
          </span>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground border-t border-border pt-3">
        {timeframe ===
          "1D" ||
        timeframe ===
          "1W" ||
        timeframe ===
          "1M" ||
        timeframe ===
          "1Y" ||
        timeframe ===
          "3Y" ||
        timeframe ===
          "5Y" ||
        timeframe ===
          "ALL"
          ? "Historical portfolio data is not currently stored by the backend, so this chart intentionally shows the real current portfolio snapshot instead of fabricated history."
          : ""}
      </p>
    </div>
  );
}