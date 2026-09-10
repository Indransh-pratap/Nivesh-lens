import { create } from "zustand";

import {
  Holding,
  CompanyExposureItem,
  ExposureAlert,
  NomineeRecord,
  CapitalGainsItem,
  SIPHealthItem,
  ConglomerateGroupData,
  FamilyMember,
  IPONFOCheckItem,
  DividendEvent,
  NewsImpactItem,
  ClientProfile,
  AdvisorSettings,
  MacroStressConfig,
} from "@/types";

import {
  DEFAULT_ADVISOR_SETTINGS,
} from "@/data/mock/portfolioData";

import { useToastStore } from "@/store/toastStore";
import { trackEvent } from "@/lib/analytics";

interface PortfolioState {
  holdings: Holding[];

  companyExposures: CompanyExposureItem[];

  conglomerates: ConglomerateGroupData[];

  alerts: ExposureAlert[];

  notificationPrefs: Record<
    string,
    {
      push: boolean;
      email: boolean;
    }
  >;

  nominees: NomineeRecord[];

  taxGains: CapitalGainsItem[];

  sipAudits: SIPHealthItem[];

  familyMembers: FamilyMember[];

  activeFamilyMemberId: string;

  ipoGuardList: IPONFOCheckItem[];

  dividends: DividendEvent[];

  newsImpacts: NewsImpactItem[];

  advisorClients: ClientProfile[];

  selectedClientId: string;

  advisorSettings: AdvisorSettings;

  isSyncModalOpen: boolean;

  syncMethod:
    | "OTP"
    | "CAS"
    | null;

  syncProgress: number;

  syncStep: string;

  isSyncing: boolean;

  lastSyncedAt: string | null;

  syncSource:
    | "Account Aggregator"
    | "CAS Statement"
    | null;

  whatIfHoldings: Holding[];

  isWhatIfActive: boolean;

  swappedFundsCount: number;

  macroConfig: MacroStressConfig;

  isPdfModalOpen: boolean;

  isPanicGuardOpen: boolean;

  activePortfolioId: string | null;

  setActivePortfolioId: (
    id: string | null
  ) => void;

  setCompanyExposures: (
    exposures: CompanyExposureItem[]
  ) => void;

  loadActivePortfolio: (
    force?: boolean
  ) => Promise<string | null>;

  setHoldings: (
    holdings: Holding[]
  ) => void;

  clearPortfolioData: () => void;

  openSyncModal: (
    method?: "OTP" | "CAS"
  ) => void;

  closeSyncModal: () => void;

  startSync: (
    method: "OTP" | "CAS"
  ) => Promise<void>;

  dismissAlert: (
    id: string
  ) => void;

  updateNotificationPref: (
    category: string,
    channel: "push" | "email",
    value: boolean
  ) => void;

  updateNominee: (
    id: string,
    updates: Partial<NomineeRecord>
  ) => void;

  addNominee: (
    nominee: Omit<
      NomineeRecord,
      "id"
    >
  ) => void;

  swapFund: (
    targetHoldingId: string,
    replacementName: string,
    replacementTicker: string,
    replacementExpenseRatio: number
  ) => void;

  resetWhatIf: () => void;

  updateMacroConfig: (
    updates: Partial<MacroStressConfig>
  ) => void;

  resetMacroConfig: () => void;

  setActiveFamilyMember: (
    id: string
  ) => void;

  setSelectedClient: (
    id: string
  ) => void;

  updateAdvisorSettings: (
    settings: Partial<AdvisorSettings>
  ) => void;

  openPdfModal: () => void;

  closePdfModal: () => void;

  openPanicGuard: () => void;

  closePanicGuard: () => void;

  getTotalPortfolioValue: () => number;

  getTotalGainValue: () => number;

  getTotalGainPercent: () => number;

  getHHIConcentrationScore: () => number;

  getDiversificationScore: () => number;

  getWastedFeeAnnually: () => number;

  getTenYearCompoundedBleed: () => number;

  getWhatIfDiversificationScore: () => number;

  getWhatIfFeeSavings: () => number;

  getMacroStressedValue: () => {
    stressedValue: number;
    dropPercent: number;
    dropRupees: number;
  };
}

export const usePortfolioStore =
  create<PortfolioState>(
    (set, get) => ({
      /*
       * IMPORTANT:
       * Real authenticated users must not start with fake holdings.
       * CAS / AA imports populate this array through setHoldings().
       */
      holdings: [],

      /*
       * These areas are still static/demo until their respective
       * backend APIs are wired. They do not control portfolio value.
       */
      companyExposures: [],
      conglomerates: [],
      alerts: [],

      notificationPrefs: {
        Concentration: {
          push: true,
          email: true,
        },

        Fee: {
          push: true,
          email: true,
        },

        Overlap: {
          push: true,
          email: false,
        },

        Nominee: {
          push: true,
          email: true,
        },

        StyleDrift: {
          push: false,
          email: false,
        },

        PanicGuard: {
          push: true,
          email: false,
        },
      },

      nominees: [],

      taxGains: [],

      sipAudits: [],

      familyMembers: [],

      activeFamilyMemberId: "",

      ipoGuardList: [],

      dividends: [],

      newsImpacts: [],

      advisorClients: [],

      selectedClientId: "",

      advisorSettings:
        DEFAULT_ADVISOR_SETTINGS,

      isSyncModalOpen: false,

      syncMethod: null,

      syncProgress: 0,

      syncStep: "",

      isSyncing: false,

      lastSyncedAt:
        null,

      syncSource:
        null,

      /*
       * What-if state starts empty until a real portfolio
       * is imported.
       */
      whatIfHoldings: [],

      isWhatIfActive: false,

      swappedFundsCount: 0,

      macroConfig: {
        crudePrice: 82,

        repoRate: 6.5,

        usdInr: 84.2,

        itSectorShock: 0,

        bankingSectorShock: 0,
      },

      isPdfModalOpen: false,

      isPanicGuardOpen: false,

      activePortfolioId:
        typeof window !== "undefined"
          ? localStorage.getItem("nivesh_active_portfolio_id")
          : null,

      setActivePortfolioId: (id) => {
        if (typeof window !== "undefined") {
          if (id) {
            localStorage.setItem("nivesh_active_portfolio_id", id);
          } else {
            localStorage.removeItem("nivesh_active_portfolio_id");
          }
        }
        set({ activePortfolioId: id });
      },

      setCompanyExposures: (companyExposures) =>
        set({ companyExposures }),

      loadActivePortfolio: async (force?: boolean) => {
        const currentId =
          get().activePortfolioId ||
          (typeof window !== "undefined"
            ? localStorage.getItem("nivesh_active_portfolio_id")
            : null);

        if (!force && currentId && get().holdings.length > 0) {
          return currentId;
        }

        try {
          const res = await fetch("/api/portfolio/portfolios", {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          });

          if (!res.ok) return null;
          const data = await res.json();
          if (!Array.isArray(data) || data.length === 0) return null;

          const active =
            (currentId ? data.find((item: any) => item.id === currentId) : null) ??
            data.find((item: any) => item.name === "CAS Portfolio") ??
            data[0];

          if (!active?.id) return null;

          if (typeof window !== "undefined") {
            localStorage.setItem("nivesh_active_portfolio_id", active.id);
          }

          set({ activePortfolioId: active.id });

          if (Array.isArray(active.holdings) && active.holdings.length > 0) {
            const totalVal = active.holdings.reduce(
              (sum: number, h: any) =>
                sum + (Number(h.current_value ?? h.currentValue) || 0),
              0
            );

            const normalized = active.holdings.map((item: any, idx: number) => {
              const curVal = Number(item.current_value ?? item.currentValue) || 0;
              const curPrice = Number(item.current_price ?? item.currentPrice) || 0;
              const avgCost = Number(item.average_price ?? item.averageCost) || 0;
              const qty = Number(item.quantity ?? item.units) || 0;
              const retVal = Number(item.returns_value ?? item.returnsValue) || 0;
              const retPct = Number(item.returns) || 0;
              const rawType = String(
                item.asset_type ?? item.assetType ?? item.type ?? ""
              ).toUpperCase();
              const isMF =
                rawType.includes("MUTUAL") ||
                rawType === "MUTUAL_FUND" ||
                item.type === "Mutual Fund";

              return {
                id: item.id ?? `holding_${idx}`,
                name: item.name ?? "Unnamed Holding",
                type: isMF ? "Mutual Fund" : "Stock",
                ticker: item.ticker ?? item.isin?.slice(0, 6) ?? `H${idx + 1}`,
                isin: item.isin ?? undefined,
                quantity: qty,
                units: qty,
                avgPrice: avgCost,
                averageCost: avgCost,
                currentValue: curVal,
                currentPrice: curPrice,
                returns: retPct,
                returnsValue: retVal,
                allocation: totalVal > 0 ? (curVal / totalVal) * 100 : 0,
                planType:
                  item.plan_type === "Regular" || item.planType === "Regular"
                    ? "Regular"
                    : "Direct",
                expenseRatio:
                  Number(item.expense_ratio ?? item.expenseRatio) || 0,
                riskGrade:
                  item.risk_grade === "High" || item.riskGrade === "High"
                    ? "High"
                    : item.risk_grade === "Medium" || item.riskGrade === "Medium"
                      ? "Medium"
                      : "Low",
                sector: isMF ? "Diversified MF" : "Equity",
                nomineeStatus: "Verified",
                assetClass: isMF ? "Mutual Fund" : "Equity",
              } as unknown as Holding;
            });

            get().setHoldings(normalized);
          }

          return active.id;
        } catch (e) {
          console.warn("Could not auto-load active portfolio:", e);
          return null;
        }
      },

      setHoldings: (
        holdings
      ) =>
        set({
          holdings,
          whatIfHoldings:
            holdings,
          isWhatIfActive: false,
          swappedFundsCount: 0,
          lastSyncedAt:
            new Date().toISOString(),
          syncSource:
            "CAS Statement",
        }),

      clearPortfolioData: () =>
        set({
          holdings: [],
          whatIfHoldings: [],
          isWhatIfActive: false,
          swappedFundsCount: 0,
          companyExposures: [],
          conglomerates: [],
          alerts: [],
          nominees: [],
          taxGains: [],
          sipAudits: [],
          familyMembers: [],
          activeFamilyMemberId: "",
          ipoGuardList: [],
          dividends: [],
          newsImpacts: [],
          advisorClients: [],
          selectedClientId: "",
        }),

      openSyncModal: (
        method
      ) =>
        set({
          isSyncModalOpen: true,
          syncMethod:
            method || "OTP",
          syncProgress: 0,
          syncStep: "",
          isSyncing: false,
        }),

      closeSyncModal: () =>
        set({
          isSyncModalOpen: false,
          isSyncing: false,
        }),

      startSync: async (
        method
      ) => {
        set({
          isSyncing: true,
          syncMethod: method,
          syncProgress: 10,
          syncStep:
            method === "OTP"
              ? "Connecting to Account Aggregator..."
              : "Decrypting CAS Statement...",
        });

        const steps =
          method === "OTP"
            ? [
                {
                  progress: 25,
                  step: "Verifying account connection...",
                },
                {
                  progress: 50,
                  step: "Fetching holdings...",
                },
                {
                  progress: 75,
                  step: "Refreshing portfolio data...",
                },
                {
                  progress: 100,
                  step: "Sync complete.",
                },
              ]
            : [
                {
                  progress: 30,
                  step: "Decrypting CAS statement...",
                },
                {
                  progress: 55,
                  step: "Parsing holdings...",
                },
                {
                  progress: 80,
                  step: "Updating portfolio...",
                },
                {
                  progress: 100,
                  step: "CAS import complete.",
                },
              ];

        for (const step of steps) {
          await new Promise(
            (resolve) =>
              setTimeout(
                resolve,
                500
              )
          );

          set({
            syncProgress:
              step.progress,
            syncStep:
              step.step,
          });
        }

        set({
          isSyncing: false,
          isSyncModalOpen: false,
          lastSyncedAt:
            new Date().toISOString(),
          syncSource:
            method === "OTP"
              ? "Account Aggregator"
              : "CAS Statement",
        });

        useToastStore
          .getState()
          .addToast({
            variant: "success",
            title:
              "Portfolio synced",
            description:
              method === "OTP"
                ? "Holdings refreshed via Account Aggregator."
                : "CAS statement imported successfully.",
          });

        trackEvent(
          "portfolio_synced",
          {
            method,
          }
        );
      },

      dismissAlert: (
        id
      ) => {
        const dismissed =
          get().alerts.find(
            (alert) =>
              alert.id === id
          );

        set((state) => ({
          alerts:
            state.alerts.filter(
              (alert) =>
                alert.id !== id
            ),
        }));

        useToastStore
          .getState()
          .addToast({
            variant: "info",

            title:
              "Alert dismissed",

            action: dismissed
              ? {
                  label: "Undo",

                  onClick: () =>
                    set(
                      (state) => ({
                        alerts: [
                          dismissed,
                          ...state.alerts,
                        ],
                      })
                    ),
                }
              : undefined,
          });
      },

      updateNotificationPref: (
        category,
        channel,
        value
      ) =>
        set((state) => ({
          notificationPrefs: {
            ...state.notificationPrefs,

            [category]: {
              ...state
                .notificationPrefs[
                category
              ],

              [channel]:
                value,
            },
          },
        })),

      updateNominee: (
        id,
        updates
      ) => {
        const previousNominees =
          get().nominees;

        set((state) => ({
          nominees:
            state.nominees.map(
              (nominee) =>
                nominee.id === id
                  ? {
                      ...nominee,
                      ...updates,
                    }
                  : nominee
            ),
        }));

        Promise.resolve()
          .then(() => {
            useToastStore
              .getState()
              .addToast({
                variant:
                  "success",
                title:
                  "Nominee details updated",
              });

            trackEvent(
              "nominee_updated",
              {
                nomineeId: id,
              }
            );
          })
          .catch(() => {
            set({
              nominees:
                previousNominees,
            });

            useToastStore
              .getState()
              .addToast({
                variant:
                  "error",
                title:
                  "Couldn't save nominee changes",
                description:
                  "Your update was reverted. Please try again.",
              });
          });
      },

      addNominee: (
        nominee
      ) => {
        set((state) => ({
          nominees: [
            ...state.nominees,
            {
              ...nominee,
              id: `n_new_${Date.now()}`,
            },
          ],
        }));

        useToastStore
          .getState()
          .addToast({
            variant:
              "success",
            title:
              "Nominee added",
          });
      },

      swapFund: (
        targetId,
        replacementName,
        replacementTicker,
        replacementExpenseRatio
      ) => {
        set((state) => {
          const updated =
            state.whatIfHoldings.map(
              (holding) => {
                if (
                  holding.id !==
                  targetId
                ) {
                  return holding;
                }

                return {
                  ...holding,

                  name:
                    replacementName,

                  ticker:
                    replacementTicker,

                  expenseRatio:
                    replacementExpenseRatio,

                  planType:
                    "Direct" as const,

                  returns:
                    holding.returns +
                    2.8,

                  returnsValue:
                    holding.returnsValue +
                    12400,

                  riskGrade:
                    "Low" as const,

                  underlyingHoldings:
                    holding
                      .underlyingHoldings
                      ? holding.underlyingHoldings.map(
                          (underlying) => ({
                            ...underlying,
                            allocation:
                              Math.max(
                                underlying.allocation *
                                  0.7,
                                1.5
                              ),
                          })
                        )
                      : undefined,
                };
              }
            );

          return {
            whatIfHoldings:
              updated,

            isWhatIfActive:
              true,

            swappedFundsCount:
              state.swappedFundsCount +
              1,
          };
        });

        useToastStore
          .getState()
          .addToast({
            variant:
              "success",
            title:
              "Fund swapped in simulation",
            description:
              `${replacementName} applied to what-if scenario.`,
          });

        trackEvent(
          "fund_swapped_whatif",
          {
            targetId,
            replacementTicker,
          }
        );
      },

      resetWhatIf: () =>
        set((state) => ({
          whatIfHoldings:
            state.holdings,

          isWhatIfActive:
            false,

          swappedFundsCount: 0,
        })),

      updateMacroConfig: (
        updates
      ) =>
        set((state) => ({
          macroConfig: {
            ...state.macroConfig,
            ...updates,
          },
        })),

      resetMacroConfig:
        () =>
          set({
            macroConfig: {
              crudePrice: 82,
              repoRate: 6.5,
              usdInr: 84.2,
              itSectorShock:
                0,
              bankingSectorShock:
                0,
            },
          }),

      setActiveFamilyMember:
        (id) =>
          set({
            activeFamilyMemberId:
              id,
          }),

      setSelectedClient: (
        id
      ) =>
        set({
          selectedClientId:
            id,
        }),

      updateAdvisorSettings:
        (updates) =>
          set((state) => ({
            advisorSettings: {
              ...state.advisorSettings,
              ...updates,
            },
          })),

      openPdfModal: () =>
        set({
          isPdfModalOpen: true,
        }),

      closePdfModal: () =>
        set({
          isPdfModalOpen: false,
        }),

      openPanicGuard: () =>
        set({
          isPanicGuardOpen:
            true,
        }),

      closePanicGuard: () =>
        set({
          isPanicGuardOpen:
            false,
        }),

      getTotalPortfolioValue:
        () =>
          get().holdings.reduce(
            (sum, holding) =>
              sum +
              (Number(
                holding.currentValue
              ) || 0),
            0
          ),

      getTotalGainValue:
        () =>
          get().holdings.reduce(
            (sum, holding) =>
              sum +
              (Number(
                holding.returnsValue
              ) || 0),
            0
          ),

      getTotalGainPercent:
        () => {
          const totalValue =
            get().getTotalPortfolioValue();

          const totalGain =
            get().getTotalGainValue();

          const invested =
            totalValue -
            totalGain;

          return invested > 0
            ? (totalGain /
                invested) *
                100
            : 0;
        },

      getHHIConcentrationScore: () => {
        const exposures = get().companyExposures;
        if (exposures && exposures.length > 0) {
          const squaredSum = exposures.reduce(
            (total, exposure) =>
              total +
              (Number(exposure.totalTruePercent) || 0) *
                (Number(exposure.totalTruePercent) || 0),
            0
          );
          return Math.min(Math.round(squaredSum), 10000);
        }

        const holdings = get().holdings;
        if (!holdings || holdings.length === 0) return 0;

        const totalValue = holdings.reduce(
          (sum, h) => sum + (Number(h.currentValue) || 0),
          0
        );

        if (totalValue <= 0) return 0;

        const squaredSum = holdings.reduce((total, h) => {
          const val = Number(h.currentValue) || 0;
          if (val <= 0) return total;
          const weightPct = (val / totalValue) * 100;
          return total + weightPct * weightPct;
        }, 0);

        return Math.min(Math.round(squaredSum), 10000);
      },

      getDiversificationScore: () => {
        const holdings = get().holdings;
        if (holdings.length === 0) {
          return 0;
        }
        const assetTypes = new Set(holdings.map((h) => h.type || h.assetClass));
        const assetBonus = Math.min(assetTypes.size * 50, 150);
        const holdingsBonus = Math.min(holdings.length * 15, 200);
        return Math.min(Math.max(500 + assetBonus + holdingsBonus, 300), 900);
      },

      getWastedFeeAnnually: () => {
        const regularFunds = get().holdings.filter(
          (holding) => holding.type === "Mutual Fund" && holding.planType === "Regular"
        );

        const regularBleed = regularFunds.reduce((total, fund) => {
          const expenseRatio = fund.expenseRatio || 0.015;
          const directEquivalent = Math.max(0.003, expenseRatio * 0.5);
          const extraTer = Math.max(0, expenseRatio - directEquivalent);
          return total + extraTer * (fund.currentValue || 0);
        }, 0);

        return Math.round(regularBleed);
      },

      getTenYearCompoundedBleed:
        () => {
          const annual =
            get().getWastedFeeAnnually();

          return Math.round(
            annual * 17.5487
          );
        },

      getWhatIfDiversificationScore:
        () => {
          if (
            !get()
              .isWhatIfActive
          ) {
            return get().getDiversificationScore();
          }

          return Math.min(
            get().getDiversificationScore() +
              65,
            900
          );
        },

      getWhatIfFeeSavings:
        () => {
          if (
            !get()
              .isWhatIfActive
          ) {
            return 0;
          }

          return (
            18600 *
            get().swappedFundsCount
          );
        },

      getMacroStressedValue:
        () => {
          const baseValue =
            get().getTotalPortfolioValue();

          const {
            crudePrice,
            repoRate,
            usdInr,
            itSectorShock,
            bankingSectorShock,
          } =
            get().macroConfig;

          const crudeDelta =
            (crudePrice - 82) /
            10;

          const crudeImpact =
            crudeDelta * -0.014;

          const repoDelta =
            (repoRate - 6.5) /
            0.25;

          const repoImpact =
            repoDelta * -0.009;

          const fxDelta =
            (usdInr - 84.2) /
            2;

          const fxImpact =
            fxDelta * 0.008;

          const itImpact =
            (itSectorShock /
              100) *
            0.165;

          const bankImpact =
            (bankingSectorShock /
              100) *
            0.34;

          const totalShockRatio =
            Math.max(
              crudeImpact +
                repoImpact +
                fxImpact +
                itImpact +
                bankImpact,
              -0.6
            );

          const dropRupees =
            Math.round(
              baseValue *
                totalShockRatio
            );

          const stressedValue =
            Math.round(
              baseValue +
                dropRupees
            );

          const dropPercent =
            Number(
              (
                totalShockRatio *
                100
              ).toFixed(2)
            );

          return {
            stressedValue,
            dropPercent,
            dropRupees,
          };
        },
    })
  );