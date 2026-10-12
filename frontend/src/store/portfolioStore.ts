
import { create } from "zustand";

import type {
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

import { DEFAULT_ADVISOR_SETTINGS } from "@/data/mock/portfolioData";
import { useToastStore } from "@/store/toastStore";
import { trackEvent } from "@/lib/analytics";

type SyncMethod = "OTP" | "CAS";
type SyncSource = "Account Aggregator" | "CAS Statement";

interface ApiHolding {
  id?: string | number;
  name?: string;
  ticker?: string;
  isin?: string | null;
  type?: string;
  asset_type?: string;
  assetType?: string;
  quantity?: number | string;
  units?: number | string;
  average_price?: number | string;
  averagePrice?: number | string;
  averageCost?: number | string;
  avgPrice?: number | string;
  current_price?: number | string;
  currentPrice?: number | string;
  current_value?: number | string;
  currentValue?: number | string;
  invested_value?: number | string;
  investedValue?: number | string;
  returns_value?: number | string;
  returnsValue?: number | string;
  returns?: number | string;
  allocation?: number | string;
  plan_type?: string;
  planType?: string;
  expense_ratio?: number | string;
  expenseRatio?: number | string;
  risk_grade?: string;
  riskGrade?: string;
  [key: string]: unknown;
}

interface ApiPortfolio {
  id: string;
  name?: string;
  holdings?: ApiHolding[] | null;
  [key: string]: unknown;
}

interface PortfolioState {
  holdings: Holding[];
  companyExposures: CompanyExposureItem[];
  conglomerates: ConglomerateGroupData[];
  alerts: ExposureAlert[];

  notificationPrefs: Record<
    string,
    { push: boolean; email: boolean }
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
  syncMethod: SyncMethod | null;
  syncProgress: number;
  syncStep: string;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  syncSource: SyncSource | null;

  whatIfHoldings: Holding[];
  isWhatIfActive: boolean;
  swappedFundsCount: number;
  macroConfig: MacroStressConfig;

  isPdfModalOpen: boolean;
  isPanicGuardOpen: boolean;
  activePortfolioId: string | null;

  setActivePortfolioId: (id: string | null) => void;
  setCompanyExposures: (items: CompanyExposureItem[]) => void;
  loadActivePortfolio: (force?: boolean) => Promise<string | null>;
  setHoldings: (
    holdings: Holding[],
    source?: SyncSource | null
  ) => void;
  clearPortfolioData: () => void;

  openSyncModal: (method?: SyncMethod) => void;
  closeSyncModal: () => void;
  startSync: (method: SyncMethod) => Promise<void>;

  dismissAlert: (id: string) => void;
  updateNotificationPref: (
    category: string,
    channel: "push" | "email",
    value: boolean
  ) => void;
  updateNominee: (
    id: string,
    updates: Partial<NomineeRecord>
  ) => void;
  addNominee: (nominee: Omit<NomineeRecord, "id">) => void;

  swapFund: (
    targetHoldingId: string,
    replacementName: string,
    replacementTicker: string,
    replacementExpenseRatio: number
  ) => void;

  resetWhatIf: () => void;
  updateMacroConfig: (updates: Partial<MacroStressConfig>) => void;
  resetMacroConfig: () => void;

  setActiveFamilyMember: (id: string) => void;
  setSelectedClient: (id: string) => void;
  updateAdvisorSettings: (settings: Partial<AdvisorSettings>) => void;

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

const ACTIVE_PORTFOLIO_KEY = "nivesh_active_portfolio_id";

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
}

function getStoredPortfolioId(): string | null {
  if (typeof window === "undefined") return null;

  try {
    return localStorage.getItem(ACTIVE_PORTFOLIO_KEY);
  } catch {
    return null;
  }
}

function savePortfolioId(id: string | null): void {
  if (typeof window === "undefined") return;

  try {
    if (id) {
      localStorage.setItem(ACTIVE_PORTFOLIO_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_PORTFOLIO_KEY);
    }
  } catch {
    // Storage may be unavailable.
  }
}

function normalizeHolding(
  item: ApiHolding,
  index: number,
  totalValue: number
): Holding {
  const rawType = String(
    item.asset_type ?? item.assetType ?? item.type ?? ""
  ).toUpperCase();

  const isMF =
    rawType.includes("MUTUAL") ||
    rawType === "MF" ||
    rawType === "MUTUAL_FUND";

  const quantity = toNumber(item.quantity ?? item.units);
  const currentValue = toNumber(
    item.current_value ?? item.currentValue
  );
  const investedValue = toNumber(
    item.invested_value ?? item.investedValue,
    currentValue
  );

  const averagePrice = toNumber(
    item.average_price ??
      item.averagePrice ??
      item.averageCost ??
      item.avgPrice
  );

  const currentPrice = toNumber(
    item.current_price ?? item.currentPrice
  );

  const returnsValue = toNumber(
    item.returns_value ?? item.returnsValue,
    currentValue - investedValue
  );

  const returnsPercent =
    item.returns !== undefined
      ? toNumber(item.returns)
      : investedValue > 0
        ? (returnsValue / investedValue) * 100
        : 0;

  const allocation =
    item.allocation !== undefined
      ? toNumber(item.allocation)
      : totalValue > 0
        ? (currentValue / totalValue) * 100
        : 0;

  return {
    ...item,
    id: String(item.id ?? `holding_${index}`),
    name: String(item.name ?? "Unnamed Holding"),
    type: isMF ? "Mutual Fund" : "Stock",
    ticker: String(item.ticker ?? item.isin ?? `H${index + 1}`),
    isin: item.isin ?? undefined,
    quantity,
    units: quantity,
    avgPrice: averagePrice,
    averageCost: averagePrice,
    currentValue,
    currentPrice,
    returns: returnsPercent,
    returnsValue,
    allocation,
    planType:
      String(item.plan_type ?? item.planType ?? "").toLowerCase() ===
      "regular"
        ? "Regular"
        : "Direct",
    expenseRatio: toNumber(
      item.expense_ratio ?? item.expenseRatio
    ),
    riskGrade: item.risk_grade ?? item.riskGrade ?? "Low",
    sector: isMF ? "Diversified MF" : "Equity",
    nomineeStatus: "Verified",
    assetClass: isMF ? "Mutual Fund" : "Equity",
  } as unknown as Holding;
}

export const usePortfolioStore = create<PortfolioState>(
  (set, get) => ({
    holdings: [],
    companyExposures: [],
    conglomerates: [],
    alerts: [],

    notificationPrefs: {
      Concentration: { push: true, email: true },
      Fee: { push: true, email: true },
      Overlap: { push: true, email: false },
      Nominee: { push: true, email: true },
      StyleDrift: { push: false, email: false },
      PanicGuard: { push: true, email: false },
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
    advisorSettings: DEFAULT_ADVISOR_SETTINGS,

    isSyncModalOpen: false,
    syncMethod: null,
    syncProgress: 0,
    syncStep: "",
    isSyncing: false,
    lastSyncedAt: null,
    syncSource: null,

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
    activePortfolioId: getStoredPortfolioId(),

    setActivePortfolioId: (id) => {
      savePortfolioId(id);
      set({ activePortfolioId: id });
    },

    setCompanyExposures: (companyExposures) =>
      set({ companyExposures }),

    /*
     * FIX: force=true bypasses the cache.
     * The holdings array is always replaced with the server snapshot,
     * even when the server returns an empty array.
     */
    loadActivePortfolio: async (force = false) => {
      const currentId =
        get().activePortfolioId ?? getStoredPortfolioId();

      if (!force && currentId && get().holdings.length > 0) {
        return currentId;
      }

      try {
        const response = await fetch("/api/portfolio/portfolios", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error(
            `Failed to load portfolios (${response.status})`
          );
        }

        const data: unknown = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Unexpected portfolios API response");
        }

        const portfolios = data as ApiPortfolio[];

        if (portfolios.length === 0) {
          savePortfolioId(null);

          set({
            activePortfolioId: null,
            holdings: [],
            whatIfHoldings: [],
            isWhatIfActive: false,
            swappedFundsCount: 0,
            lastSyncedAt: null,
            syncSource: null,
          });

          return null;
        }

        const active =
          (currentId
            ? portfolios.find(
                (portfolio) =>
                  String(portfolio.id) === String(currentId)
              )
            : undefined) ??
          portfolios.find(
            (portfolio) => portfolio.name === "CAS Portfolio"
          ) ??
          portfolios.find(
            (portfolio) => portfolio.name === "Synced Portfolio"
          ) ??
          portfolios[0];

        if (!active?.id) {
          throw new Error("No valid portfolio returned");
        }

        const apiHoldings = Array.isArray(active.holdings)
          ? active.holdings
          : [];

        const totalValue = apiHoldings.reduce(
          (sum, holding) =>
            sum +
            toNumber(
              holding.current_value ?? holding.currentValue
            ),
          0
        );

        const normalized = apiHoldings.map((holding, index) =>
          normalizeHolding(holding, index, totalValue)
        );

        savePortfolioId(String(active.id));

        // Replace old data, never append to it.
        set({
          activePortfolioId: String(active.id),
          holdings: normalized,
          whatIfHoldings: normalized,
          isWhatIfActive: false,
          swappedFundsCount: 0,
        });

        return String(active.id);
      } catch (error) {
        console.error("Portfolio refresh failed:", error);

        // Keep current data if the request itself failed.
        return null;
      }
    },

    setHoldings: (holdings, source = "CAS Statement") => {
      set({
        holdings,
        whatIfHoldings: holdings,
        isWhatIfActive: false,
        swappedFundsCount: 0,
        lastSyncedAt: new Date().toISOString(),
        syncSource: source,
      });
    },

    clearPortfolioData: () => {
      savePortfolioId(null);

      set({
        activePortfolioId: null,
        holdings: [],
        whatIfHoldings: [],
        isWhatIfActive: false,
        swappedFundsCount: 0,
        lastSyncedAt: null,
        syncSource: null,
      });
    },

    openSyncModal: (method) =>
      set({
        isSyncModalOpen: true,
        syncMethod: method ?? "OTP",
        syncProgress: 0,
        syncStep: "",
        isSyncing: false,
      }),

    closeSyncModal: () =>
      set({
        isSyncModalOpen: false,
        isSyncing: false,
      }),

    /*
     * Do not simulate a successful sync here.
     * The real CAS upload or OTP verification handler must run first.
     */
    startSync: async (method) => {
      const message =
        method === "CAS"
          ? "Upload a CAS PDF to import your holdings."
          : "Complete OTP verification to sync your account.";

      set({
        isSyncing: false,
        syncMethod: method,
        syncProgress: 0,
        syncStep: message,
      });

      useToastStore.getState().addToast({
        variant: "error",
        title: "Sync not started",
        description: message,
      });
    },

    dismissAlert: (id) => {
      const dismissed = get().alerts.find(
        (alert) => alert.id === id
      );

      set((state) => ({
        alerts: state.alerts.filter((alert) => alert.id !== id),
      }));

      useToastStore.getState().addToast({
        variant: "info",
        title: "Alert dismissed",
        action: dismissed
          ? {
              label: "Undo",
              onClick: () =>
                set((state) => ({
                  alerts: [dismissed, ...state.alerts],
                })),
            }
          : undefined,
      });
    },

    updateNotificationPref: (category, channel, value) =>
      set((state) => ({
        notificationPrefs: {
          ...state.notificationPrefs,
          [category]: {
            ...state.notificationPrefs[category],
            [channel]: value,
          },
        },
      })),

    updateNominee: (id, updates) => {
      set((state) => ({
        nominees: state.nominees.map((nominee) =>
          nominee.id === id
            ? { ...nominee, ...updates }
            : nominee
        ),
      }));

      useToastStore.getState().addToast({
        variant: "success",
        title: "Nominee details updated",
      });

      trackEvent("nominee_updated", { nomineeId: id });
    },

    addNominee: (nominee) => {
      set((state) => ({
        nominees: [
          ...state.nominees,
          { ...nominee, id: `n_new_${Date.now()}` },
        ],
      }));

      useToastStore.getState().addToast({
        variant: "success",
        title: "Nominee added",
      });
    },

    swapFund: (
      targetHoldingId,
      replacementName,
      replacementTicker,
      replacementExpenseRatio
    ) => {
      set((state) => ({
        whatIfHoldings: state.whatIfHoldings.map((holding) => {
          if (holding.id !== targetHoldingId) return holding;

          return {
            ...holding,
            name: replacementName,
            ticker: replacementTicker,
            expenseRatio: replacementExpenseRatio,
            planType: "Direct" as const,
          };
        }),
        isWhatIfActive: true,
        swappedFundsCount: state.swappedFundsCount + 1,
      }));

      useToastStore.getState().addToast({
        variant: "success",
        title: "Fund swapped in simulation",
        description: `${replacementName} applied to what-if scenario.`,
      });

      trackEvent("fund_swapped_whatif", {
        targetId: targetHoldingId,
        replacementTicker,
      });
    },

    resetWhatIf: () =>
      set((state) => ({
        whatIfHoldings: state.holdings,
        isWhatIfActive: false,
        swappedFundsCount: 0,
      })),

    updateMacroConfig: (updates) =>
      set((state) => ({
        macroConfig: {
          ...state.macroConfig,
          ...updates,
        },
      })),

    resetMacroConfig: () =>
      set({
        macroConfig: {
          crudePrice: 82,
          repoRate: 6.5,
          usdInr: 84.2,
          itSectorShock: 0,
          bankingSectorShock: 0,
        },
      }),

    setActiveFamilyMember: (id) =>
      set({ activeFamilyMemberId: id }),

    setSelectedClient: (id) =>
      set({ selectedClientId: id }),

    updateAdvisorSettings: (settings) =>
      set((state) => ({
        advisorSettings: {
          ...state.advisorSettings,
          ...settings,
        },
      })),

    openPdfModal: () => set({ isPdfModalOpen: true }),
    closePdfModal: () => set({ isPdfModalOpen: false }),
    openPanicGuard: () => set({ isPanicGuardOpen: true }),
    closePanicGuard: () => set({ isPanicGuardOpen: false }),

    getTotalPortfolioValue: () =>
      get().holdings.reduce(
        (sum, holding) =>
          sum + toNumber(holding.currentValue),
        0
      ),

    getTotalGainValue: () =>
      get().holdings.reduce(
        (sum, holding) =>
          sum + toNumber(holding.returnsValue),
        0
      ),

    getTotalGainPercent: () => {
      const totalValue = get().getTotalPortfolioValue();
      const totalGain = get().getTotalGainValue();
      const invested = totalValue - totalGain;

      return invested > 0
        ? (totalGain / invested) * 100
        : 0;
    },

    getHHIConcentrationScore: () => {
      const holdings = get().holdings;
      const total = get().getTotalPortfolioValue();

      if (total <= 0) return 0;

      return Math.min(
        Math.round(
          holdings.reduce((sum, holding) => {
            const weight =
              (toNumber(holding.currentValue) / total) * 100;
            return sum + weight * weight;
          }, 0)
        ),
        10000
      );
    },

    getDiversificationScore: () => {
      const holdings = get().holdings;
      if (holdings.length === 0) return 0;

      const assetTypes = new Set(
        holdings.map(
          (holding) => holding.type || holding.assetClass
        )
      );

      return Math.min(
        900,
        500 +
          Math.min(assetTypes.size * 50, 150) +
          Math.min(holdings.length * 15, 200)
      );
    },

    getWastedFeeAnnually: () =>
      Math.round(
        get().holdings.reduce((sum, holding) => {
          if (
            holding.type !== "Mutual Fund" ||
            holding.planType !== "Regular"
          ) {
            return sum;
          }

          const expense = holding.expenseRatio || 0.015;
          const directEquivalent = Math.max(0.003, expense * 0.5);

          return (
            sum +
            Math.max(0, expense - directEquivalent) *
              (holding.currentValue || 0)
          );
        }, 0)
      ),

    getTenYearCompoundedBleed: () =>
      Math.round(get().getWastedFeeAnnually() * 17.5487),

    getWhatIfDiversificationScore: () =>
      get().isWhatIfActive
        ? Math.min(get().getDiversificationScore() + 65, 900)
        : get().getDiversificationScore(),

    getWhatIfFeeSavings: () =>
      get().isWhatIfActive
        ? 18600 * get().swappedFundsCount
        : 0,

    getMacroStressedValue: () => {
      const baseValue = get().getTotalPortfolioValue();

      const {
        crudePrice,
        repoRate,
        usdInr,
        itSectorShock,
        bankingSectorShock,
      } = get().macroConfig;

      const crudeImpact = ((crudePrice - 82) / 10) * -0.014;
      const repoImpact = ((repoRate - 6.5) / 0.25) * -0.009;
      const fxImpact = ((usdInr - 84.2) / 2) * 0.008;
      const itImpact = (itSectorShock / 100) * 0.165;
      const bankImpact = (bankingSectorShock / 100) * 0.34;

      const totalShockRatio = Math.max(
        crudeImpact + repoImpact + fxImpact + itImpact + bankImpact,
        -0.6
      );

      const dropRupees = Math.round(baseValue * totalShockRatio);

      return {
        stressedValue: Math.round(baseValue + dropRupees),
        dropPercent: Number((totalShockRatio * 100).toFixed(2)),
        dropRupees,
      };
    },
  })
);
