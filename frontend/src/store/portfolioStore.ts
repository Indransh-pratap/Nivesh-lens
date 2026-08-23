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
  MacroStressConfig
} from "@/types";
import { 
  MOCK_HOLDINGS, 
  MOCK_COMPANY_EXPOSURES,
  MOCK_ALERTS, 
  MOCK_NOMINEES,
  MOCK_TAX_ITEMS,
  MOCK_SIP_AUDIT,
  MOCK_CONGLOMERATES,
  MOCK_FAMILY_MEMBERS,
  MOCK_IPO_GUARD,
  MOCK_DIVIDENDS,
  MOCK_NEWS_IMPACTS,
  MOCK_ADVISOR_CLIENTS,
  DEFAULT_ADVISOR_SETTINGS
} from "@/data/mock/portfolioData";
import { useToastStore } from "@/store/toastStore";
import { trackEvent } from "@/lib/analytics";

interface PortfolioState {
  holdings: Holding[];
  companyExposures: CompanyExposureItem[];
  conglomerates: ConglomerateGroupData[];
  alerts: ExposureAlert[];
  notificationPrefs: Record<string, { push: boolean; email: boolean }>;
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
  
  // Sync state (Phase 1)
  isSyncModalOpen: boolean;
  syncMethod: "OTP" | "CAS" | null;
  syncProgress: number;
  syncStep: string;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  syncSource: "Account Aggregator" | "CAS Statement" | null;
  
  // What-If Simulator state (Phase 2)
  whatIfHoldings: Holding[];
  isWhatIfActive: boolean;
  swappedFundsCount: number;
  
  // Macro Risk Simulator state (Phase 3)
  macroConfig: MacroStressConfig;
  
  // White-label PDF modal state (Phase 4)
  isPdfModalOpen: boolean;
  isPanicGuardOpen: boolean;
  
  // Actions
  setHoldings: (holdings: Holding[]) => void;
  openSyncModal: (method?: "OTP" | "CAS") => void;
  closeSyncModal: () => void;
  startSync: (method: "OTP" | "CAS") => Promise<void>;
  
  dismissAlert: (id: string) => void;
  updateNotificationPref: (category: string, channel: "push" | "email", value: boolean) => void;
  updateNominee: (id: string, updates: Partial<NomineeRecord>) => void;
  addNominee: (nominee: Omit<NomineeRecord, "id">) => void;
  
  // What-If Simulator actions
  swapFund: (targetHoldingId: string, replacementName: string, replacementTicker: string, replacementExpenseRatio: number) => void;
  resetWhatIf: () => void;
  
  // Macro actions
  updateMacroConfig: (updates: Partial<MacroStressConfig>) => void;
  resetMacroConfig: () => void;
  
  // Family actions
  setActiveFamilyMember: (id: string) => void;
  
  // Advisor actions
  setSelectedClient: (id: string) => void;
  updateAdvisorSettings: (settings: Partial<AdvisorSettings>) => void;
  openPdfModal: () => void;
  closePdfModal: () => void;
  
  // Panic guard
  openPanicGuard: () => void;
  closePanicGuard: () => void;
  
  // Calculations
  getTotalPortfolioValue: () => number;
  getTotalGainValue: () => number;
  getTotalGainPercent: () => number;
  getHHIConcentrationScore: () => number;
  getDiversificationScore: () => number;
  getWastedFeeAnnually: () => number;
  getTenYearCompoundedBleed: () => number;
  getWhatIfDiversificationScore: () => number;
  getWhatIfFeeSavings: () => number;
  getMacroStressedValue: () => { stressedValue: number; dropPercent: number; dropRupees: number };
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  holdings: MOCK_HOLDINGS,
  companyExposures: MOCK_COMPANY_EXPOSURES,
  conglomerates: MOCK_CONGLOMERATES,
  alerts: MOCK_ALERTS,
  notificationPrefs: {
    Concentration: { push: true, email: true },
    Fee: { push: true, email: true },
    Overlap: { push: true, email: false },
    Nominee: { push: true, email: true },
    StyleDrift: { push: false, email: false },
    PanicGuard: { push: true, email: false },
  },
  nominees: MOCK_NOMINEES,
  taxGains: MOCK_TAX_ITEMS,
  sipAudits: MOCK_SIP_AUDIT,
  familyMembers: MOCK_FAMILY_MEMBERS,
  activeFamilyMemberId: "fam_1",
  ipoGuardList: MOCK_IPO_GUARD,
  dividends: MOCK_DIVIDENDS,
  newsImpacts: MOCK_NEWS_IMPACTS,
  advisorClients: MOCK_ADVISOR_CLIENTS,
  selectedClientId: "client_1",
  advisorSettings: DEFAULT_ADVISOR_SETTINGS,
  
  isSyncModalOpen: false,
  syncMethod: null,
  syncProgress: 0,
  syncStep: "",
  isSyncing: false,
  lastSyncedAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
  syncSource: "Account Aggregator",
  
  whatIfHoldings: MOCK_HOLDINGS,
  isWhatIfActive: false,
  swappedFundsCount: 0,
  
  macroConfig: {
    crudePrice: 82, // Base $82
    repoRate: 6.5, // Base 6.5%
    usdInr: 84.2, // Base 84.2
    itSectorShock: 0,
    bankingSectorShock: 0
  },
  
  isPdfModalOpen: false,
  isPanicGuardOpen: false,
  
  setHoldings: (holdings) => set({ holdings, whatIfHoldings: holdings }),
  
  openSyncModal: (method) => set({ isSyncModalOpen: true, syncMethod: method || "OTP", syncProgress: 0, syncStep: "", isSyncing: false }),
  closeSyncModal: () => set({ isSyncModalOpen: false, isSyncing: false }),
  
  startSync: async (method) => {
    set({ 
      isSyncing: true, 
      syncMethod: method, 
      syncProgress: 10, 
      syncStep: method === "OTP" 
        ? "Contacting RBI-registered Account Aggregator (Setu/Finvu)..." 
        : "Decrypting CAS Statement with document credentials..."
    });

    const steps = method === "OTP" 
      ? [
          { progress: 25, step: "Verifying Aadhaar & Mobile OTP with MF Central..." },
          { progress: 50, step: "Querying NSDL & CDSL Depositories for direct equity holdings..." },
          { progress: 75, step: "Syncing CAMS & KFintech mutual fund folios..." },
          { progress: 90, step: "Scanning bank FDs and EPFO pension balance..." },
          { progress: 100, step: "Sync complete! Running AMFI Look-Through Engine..." }
        ]
      : [
          { progress: 30, step: "Decoded CAS password signature (PAN/DoB verification)..." },
          { progress: 55, step: "Parsing transaction records across 4 AMC folios..." },
          { progress: 80, step: "Cross-referencing live AMFI NAVs and monthly portfolio disclosures..." },
          { progress: 95, step: "Calculating True Company Exposure and HHI score..." },
          { progress: 100, step: "CAS Import Successful! Portfolio X-Ray ready." }
        ];

    for (const s of steps) {
      await new Promise((res) => setTimeout(res, 650));
      set({ syncProgress: s.progress, syncStep: s.step });
    }

    await new Promise((res) => setTimeout(res, 400));
    set({
      isSyncing: false,
      isSyncModalOpen: false,
      lastSyncedAt: new Date().toISOString(),
      syncSource: method === "OTP" ? "Account Aggregator" : "CAS Statement",
    });
    useToastStore.getState().addToast({
      variant: "success",
      title: "Portfolio synced",
      description: method === "OTP" ? "Holdings refreshed via Account Aggregator." : "CAS statement imported successfully.",
    });
    trackEvent("portfolio_synced", { method });
  },
  
  dismissAlert: (id) => {
    const dismissed = get().alerts.find((a) => a.id === id);
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== id)
    }));
    useToastStore.getState().addToast({
      variant: "info",
      title: "Alert dismissed",
      action: dismissed
        ? {
            label: "Undo",
            onClick: () => set((state) => ({ alerts: [dismissed, ...state.alerts] })),
          }
        : undefined,
    });
  },

  updateNotificationPref: (category, channel, value) => set((state) => ({
    notificationPrefs: {
      ...state.notificationPrefs,
      [category]: { ...state.notificationPrefs[category], [channel]: value },
    },
  })),
  
  updateNominee: (id, updates) => {
    // Optimistic update pattern: apply the change to the UI immediately
    // (so the user sees it as instant), then confirm with the backend.
    // If the backend call fails, roll back to the snapshot and tell the
    // user — this is the shape the real API integration should keep.
    const previousNominees = get().nominees;
    set((state) => ({
      nominees: state.nominees.map((n) => n.id === id ? { ...n, ...updates } : n)
    }));

    // Simulated backend confirmation — replace with the real API call
    // (e.g. `await api.updateNominee(id, updates)`) when the backend is wired up.
    Promise.resolve()
      .then(() => {
        useToastStore.getState().addToast({ variant: "success", title: "Nominee details updated" });
        trackEvent("nominee_updated", { nomineeId: id });
      })
      .catch(() => {
        set({ nominees: previousNominees });
        useToastStore.getState().addToast({
          variant: "error",
          title: "Couldn't save nominee changes",
          description: "Your update was reverted. Please try again.",
        });
      });
  },

  addNominee: (nominee) => {
    set((state) => ({
      nominees: [...state.nominees, { ...nominee, id: `n_new_${Date.now()}` }]
    }));
    useToastStore.getState().addToast({ variant: "success", title: "Nominee added" });
  },
  
  swapFund: (targetId, replacementName, replacementTicker, replacementExpenseRatio) => {
    set((state) => {
    const updated = state.whatIfHoldings.map((h) => {
      if (h.id === targetId) {
        return {
          ...h,
          name: replacementName,
          ticker: replacementTicker,
          expenseRatio: replacementExpenseRatio,
          planType: "Direct" as const,
          returns: h.returns + 2.8,
          returnsValue: h.returnsValue + 12400,
          riskGrade: "Low" as const,
          underlyingHoldings: h.underlyingHoldings ? h.underlyingHoldings.map(u => ({
            ...u,
            allocation: Math.max(u.allocation * 0.7, 1.5) // Less overlap
          })) : undefined
        };
      }
      return h;
    });
    return {
      whatIfHoldings: updated,
      isWhatIfActive: true,
      swappedFundsCount: state.swappedFundsCount + 1
    };
    });
    useToastStore.getState().addToast({ variant: "success", title: "Fund swapped in simulation", description: `${replacementName} applied to what-if scenario.` });
    trackEvent("fund_swapped_whatif", { targetId, replacementTicker });
  },

  resetWhatIf: () => set((state) => ({
    whatIfHoldings: state.holdings,
    isWhatIfActive: false,
    swappedFundsCount: 0
  })),
  
  updateMacroConfig: (updates) => set((state) => ({
    macroConfig: { ...state.macroConfig, ...updates }
  })),
  
  resetMacroConfig: () => set({
    macroConfig: {
      crudePrice: 82,
      repoRate: 6.5,
      usdInr: 84.2,
      itSectorShock: 0,
      bankingSectorShock: 0
    }
  }),
  
  setActiveFamilyMember: (id) => set({ activeFamilyMemberId: id }),
  
  setSelectedClient: (id) => set({ selectedClientId: id }),
  
  updateAdvisorSettings: (updates) => set((state) => ({
    advisorSettings: { ...state.advisorSettings, ...updates }
  })),
  
  openPdfModal: () => set({ isPdfModalOpen: true }),
  closePdfModal: () => set({ isPdfModalOpen: false }),
  
  openPanicGuard: () => set({ isPanicGuardOpen: true }),
  closePanicGuard: () => set({ isPanicGuardOpen: false }),
  
  // Financial calculations
  getTotalPortfolioValue: () => {
    return get().holdings.reduce((sum, h) => sum + h.currentValue, 0);
  },

  getTotalGainValue: () => {
    return get().holdings.reduce((sum, h) => sum + h.returnsValue, 0);
  },

  getTotalGainPercent: () => {
    const totalVal = get().getTotalPortfolioValue();
    const totalGain = get().getTotalGainValue();
    const invested = totalVal - totalGain;
    return invested > 0 ? (totalGain / invested) * 100 : 0;
  },

  getHHIConcentrationScore: () => {
    // HHI = sum of squared market share percentages (0 - 10,000)
    // <1500 = Diversified, 1500-2500 = Moderate, >2500 = Highly Concentrated
    const exposures = get().companyExposures;
    const squaredSum = exposures.reduce((acc, c) => acc + (c.totalTruePercent * c.totalTruePercent), 0);
    // Add remaining tail weight approximation
    return Math.round(squaredSum + 420);
  },

  getDiversificationScore: () => {
    // CIBIL-like 300 to 900 score
    return 742;
  },

  getWastedFeeAnnually: () => {
    // Difference between holding regular plans vs direct plans + overlap TER
    const regularFunds = get().holdings.filter(h => h.planType === "Regular");
    const regularBleed = regularFunds.reduce((sum, f) => {
      const extraTer = ((f.expenseRatio || 0.015) - 0.006);
      return sum + (extraTer * f.currentValue);
    }, 0);
    return Math.round(regularBleed + 8200); // ~₹24,800
  },

  getTenYearCompoundedBleed: () => {
    const annual = get().getWastedFeeAnnually();
    // FV of annual annuity at 12% CAGR over 10 years: annual * (((1+0.12)^10 - 1) / 0.12)
    return Math.round(annual * 17.5487); // ~₹4,35,000
  },

  getWhatIfDiversificationScore: () => {
    if (!get().isWhatIfActive) return get().getDiversificationScore();
    return Math.min(get().getDiversificationScore() + 65, 900); // 807
  },

  getWhatIfFeeSavings: () => {
    if (!get().isWhatIfActive) return 0;
    return 18600 * get().swappedFundsCount;
  },

  getMacroStressedValue: () => {
    const baseValue = get().getTotalPortfolioValue();
    const { crudePrice, repoRate, usdInr, itSectorShock, bankingSectorShock } = get().macroConfig;
    
    // Sensitivity coefficients based on Indian sector weights
    // Crude +$10 -> -1.4% (Energy benefits slightly, consumer/paint/logistics drop)
    const crudeDelta = (crudePrice - 82) / 10;
    const crudeImpact = crudeDelta * -0.014;
    
    // Repo rate +0.5% -> -1.8% on market valuations
    const repoDelta = (repoRate - 6.5) / 0.25;
    const repoImpact = repoDelta * -0.009;
    
    // USDINR depreciation +₹2 -> +0.8% for IT/Pharma exporters
    const fxDelta = (usdInr - 84.2) / 2;
    const fxImpact = fxDelta * +0.008;
    
    // Direct sector overrides (IT weight ~16.5%, Banking weight ~34%)
    const itImpact = (itSectorShock / 100) * 0.165;
    const bankImpact = (bankingSectorShock / 100) * 0.34;
    
    const totalShockRatio = Math.max(crudeImpact + repoImpact + fxImpact + itImpact + bankImpact, -0.6);
    const dropRupees = Math.round(baseValue * totalShockRatio);
    const stressedValue = Math.round(baseValue + dropRupees);
    const dropPercent = Number((totalShockRatio * 100).toFixed(2));
    
    return { stressedValue, dropPercent, dropRupees };
  }
}));
