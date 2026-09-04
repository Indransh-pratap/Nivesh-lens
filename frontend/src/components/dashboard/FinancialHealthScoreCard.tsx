"use client";

import React, { useMemo } from "react";
import {
  Activity,
  ArrowRight,
  Building2,
  Coins,
  Info,
  Layers,
  PieChart,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

import { usePortfolioStore } from "@/store/portfolioStore";

interface FinancialHealthScoreCardProps {
  className?: string;
}

type PillarStatus =
  | "Optimal"
  | "Moderate"
  | "Alert"
  | "Critical";

function getAssetType(
  holding: any
): string {
  return String(
    holding.assetType ??
      holding.asset_type ??
      ""
  ).toUpperCase();
}

function getAssetClass(
  holding: any
): string {
  return String(
    holding.assetClass ??
      holding.asset_class ??
      ""
  ).toUpperCase();
}

function getValue(
  holding: any
): number {
  return Number(
    holding.currentValue ??
      holding.current_value ??
      0
  ) || 0;
}

function getPillarIcon(
  name: string
) {
  if (name.includes("Asset")) {
    return PieChart;
  }

  if (name.includes("Company")) {
    return Layers;
  }

  if (
    name.includes("Overlap") ||
    name.includes("Fee") ||
    name.includes("TER")
  ) {
    return Coins;
  }

  if (name.includes("Group")) {
    return Building2;
  }

  return ShieldCheck;
}

function getStatusClass(
  status: PillarStatus
): string {
  switch (status) {
    case "Optimal":
      return "bg-[var(--positive)]";

    case "Moderate":
      return "bg-[var(--info)]";

    case "Alert":
      return "bg-[var(--warning)]";

    default:
      return "bg-[var(--negative)]";
  }
}

export const FinancialHealthScoreCard =
  React.memo(
    function FinancialHealthScoreCard({
      className = "",
    }: FinancialHealthScoreCardProps) {
      const holdings =
        usePortfolioStore(
          (state) => state.holdings
        );

      const metrics = useMemo(() => {
        const totalValue =
          holdings.reduce(
            (sum, holding) =>
              sum + getValue(holding),
            0
          );

        if (
          holdings.length === 0 ||
          totalValue <= 0
        ) {
          return {
            score: 0,
            percentile: 0,
            grade: "No Data",
            ratingText:
              "Connect your portfolio to calculate the health score.",
            pillars: [],
          };
        }

        const largestHolding =
          Math.max(
            ...holdings.map(getValue)
          );

        const concentration =
          largestHolding /
          totalValue;

        /*
         * More holdings generally means better
         * diversification, while excessive concentration
         * lowers the score.
         */
        const diversificationScore =
          Math.min(
            holdings.length * 70,
            250
          );

        const concentrationPenalty =
          Math.min(
            concentration * 350,
            300
          );

        const assetTypeCount =
          new Set(
            holdings.map((holding) =>
              getAssetType(holding)
            )
          ).size;

        const assetMixScore =
          Math.min(
            assetTypeCount * 100,
            200
          );

        const positiveValueCount =
          holdings.filter(
            (holding) =>
              getValue(holding) > 0
          ).length;

        const dataQualityScore =
          Math.min(
            positiveValueCount * 25,
            150
          );

        const rawScore =
          300 +
          diversificationScore +
          assetMixScore +
          dataQualityScore -
          concentrationPenalty;

        const score = Math.round(
          Math.max(
            300,
            Math.min(900, rawScore)
          )
        );

        const grade =
          score >= 780
            ? "Prime"
            : score >= 680
              ? "Healthy"
              : score >= 550
                ? "Moderate Risk"
                : "Vulnerable";

        const percentile =
          Math.max(
            1,
            Math.min(
              99,
              Math.round(
                ((score - 300) / 600) *
                  100
              )
            )
          );

        const assetStatus: PillarStatus =
          assetMixScore >= 180
            ? "Optimal"
            : assetMixScore >= 100
              ? "Moderate"
              : "Alert";

        const concentrationStatus: PillarStatus =
          concentration <= 0.15
            ? "Optimal"
            : concentration <= 0.25
              ? "Moderate"
              : concentration <= 0.4
                ? "Alert"
                : "Critical";

        const diversificationStatus: PillarStatus =
          holdings.length >= 8
            ? "Optimal"
            : holdings.length >= 4
              ? "Moderate"
              : "Alert";

        const dataStatus: PillarStatus =
          positiveValueCount ===
          holdings.length
            ? "Optimal"
            : "Alert";

        return {
          score,
          percentile,
          grade,
          ratingText:
            concentration > 0.4
              ? "Your portfolio has a high single-holding concentration."
              : concentration > 0.25
                ? "Your portfolio has moderate concentration risk."
                : "Your current portfolio has a reasonably diversified structure.",

          pillars: [
            {
              id: "asset",
              name: "Asset Mix",
              score: Math.round(
                assetMixScore
              ),
              maxScore: 200,
              status: assetStatus,
              insight: `${assetTypeCount} distinct asset categories detected.`,
            },

            {
              id: "company",
              name: "Company Concentration",
              score: Math.max(
                0,
                200 -
                  Math.round(
                    concentration * 200
                  )
              ),
              maxScore: 200,
              status:
                concentrationStatus,
              insight: `Largest holding represents ${(concentration * 100).toFixed(1)}% of portfolio value.`,
            },

            {
              id: "diversification",
              name: "Diversification",
              score: diversificationScore,
              maxScore: 250,
              status:
                diversificationStatus,
              insight: `${holdings.length} holdings currently stored for this portfolio.`,
            },

            {
              id: "data",
              name: "Portfolio Data Quality",
              score: dataQualityScore,
              maxScore: 150,
              status: dataStatus,
              insight: `${positiveValueCount} of ${holdings.length} holdings have a valid current value.`,
            },
          ],
        };
      }, [holdings]);

      const {
        score,
        percentile,
        grade,
        ratingText,
        pillars,
      } = metrics;

      const dashOffset =
        score <= 0
          ? 219.91
          : 219.91 -
            (((score - 300) /
              600) *
              219.91);

      const badge =
        grade === "Prime"
          ? "Prime Diversified"
          : grade === "Healthy"
            ? "Healthy Asset Mix"
            : grade ===
                "Moderate Risk"
              ? "Moderate Risk"
              : grade ===
                  "Vulnerable"
                ? "Needs Attention"
                : "No Portfolio";

      return (
        <div
          className={`rounded-2xl border border-border bg-[var(--card)] p-6 shadow-xl shadow-black/30 text-foreground relative overflow-hidden ${className}`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
                <Activity
                  className="w-5 h-5"
                  strokeWidth={1.75}
                />
              </div>

              <div>
                <h3 className="text-base font-bold">
                  Financial Health Score
                </h3>

                <p className="text-xs text-muted-foreground">
                  Calculated from your current portfolio holdings
                </p>
              </div>
            </div>

            <div className="px-3 py-1.5 rounded-xl border border-primary/20 bg-primary/10 text-xs font-semibold text-primary">
              {badge}
            </div>
          </div>

          {score === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No holdings available yet.
            </div>
          ) : (
            <div className="grid lg:grid-cols-[1.1fr_1.3fr] gap-8 mt-6 items-center">
              <div className="flex flex-col items-center justify-center p-6 bg-[var(--background-elevated)] rounded-2xl border border-border/70">
                <div className="relative w-64 h-36 flex items-end justify-center overflow-hidden">
                  <svg
                    viewBox="0 0 180 100"
                    className="w-full h-full"
                  >
                    <path
                      d="M 20 90 A 70 70 0 0 1 160 90"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="12"
                      strokeLinecap="round"
                      className="text-white/[0.08]"
                    />

                    <defs>
                      <linearGradient
                        id="healthSpeedometerGradDynamic"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                      >
                        <stop
                          offset="0%"
                          stopColor="#e2685f"
                        />
                        <stop
                          offset="50%"
                          stopColor="#c99a4a"
                        />
                        <stop
                          offset="100%"
                          stopColor="#3fae7a"
                        />
                      </linearGradient>
                    </defs>

                    <path
                      d="M 20 90 A 70 70 0 0 1 160 90"
                      fill="none"
                      stroke="url(#healthSpeedometerGradDynamic)"
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray="219.91"
                      strokeDashoffset={Math.max(
                        0,
                        Math.min(
                          219.91,
                          dashOffset
                        )
                      )}
                    />
                  </svg>

                  <div className="absolute bottom-1 flex flex-col items-center">
                    <span className="font-mono text-4xl font-semibold">
                      {score}
                    </span>

                    <span className="text-[10px] font-mono text-muted-foreground uppercase">
                      out of 900
                    </span>
                  </div>
                </div>

                <div className="w-full flex justify-between px-4 text-[10px] font-mono text-muted-foreground pt-3 border-t border-border/70 mt-2">
                  <span>300</span>
                  <span>600</span>
                  <span>900</span>
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-xs text-primary font-semibold">
                  <TrendingUp className="w-3.5 h-3.5" />

                  <span>
                    Portfolio score:
                    {" "}
                    {score}
                  </span>
                </div>

                <p className="text-[11px] text-center text-muted-foreground mt-2 px-2">
                  {ratingText}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground pb-1 border-b border-border/70">
                  <span>
                    Diagnostic Pillars
                  </span>

                  <span>
                    Performance
                  </span>
                </div>

                {pillars.map(
                  (pillar) => {
                    const Icon =
                      getPillarIcon(
                        pillar.name
                      );

                    const color =
                      getStatusClass(
                        pillar.status
                      );

                    return (
                      <div
                        key={
                          pillar.id
                        }
                        className="p-3.5 rounded-xl bg-[var(--background-elevated)] border border-border/70"
                      >
                        <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                          <div className="flex items-center gap-2">
                            <Icon className="w-3.5 h-3.5 text-primary" />

                            <span className="font-semibold">
                              {pillar.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-[10px] text-muted-foreground">
                              {pillar.status}
                            </span>

                            <span className="font-bold">
                              {
                                pillar.score
                              }
                              /
                              {
                                pillar.maxScore
                              }
                            </span>
                          </div>
                        </div>

                        <div className="w-full h-1.5 bg-[#131316] rounded-full overflow-hidden">
                          <div
                            className={`h-full ${color} rounded-full`}
                            style={{
                              width: `${Math.max(
                                0,
                                Math.min(
                                  100,
                                  (pillar.score /
                                    pillar.maxScore) *
                                    100
                                )
                              )}%`,
                            }}
                          />
                        </div>

                        <p className="text-[11px] text-muted-foreground mt-1">
                          {
                            pillar.insight
                          }
                        </p>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-primary" />

              {score > 0
                ? `Calculated from ${holdings.length} live holdings.`
                : "Import a CAS statement to calculate this score."}
            </span>

            <Link
              href="/portfolio-xray"
              className="text-primary hover:underline font-semibold flex items-center gap-1"
            >
              Inspect Look-Through
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      );
    }
  );