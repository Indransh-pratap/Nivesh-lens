import { create } from "zustand";
import { 
  Holding, 
  ExposureAlert, 
  ActivityLog, 
  AIRecommendation, 
  NomineeRecord,
  CapitalGainsItem,
  ClientProfile
} from "@/types";
import { 
  MOCK_HOLDINGS, 
  MOCK_ALERTS, 
  MOCK_ACTIVITIES, 
  MOCK_RECOMMENDATIONS, 
  MOCK_NOMINEES,
  MOCK_TAX_REBALANCING
} from "@/data/mock/portfolioData";

interface PortfolioState {
  holdings: Holding[];
  alerts: ExposureAlert[];
  activities: ActivityLog[];
  recommendations: AIRecommendation[];
  nominees: NomineeRecord[];
  taxGains: CapitalGainsItem[];
  
  // Sync Status
  isSynced: boolean;
  syncMethod: "OTP" | "CAS" | null;
  syncProgress: number;
  syncStep: string;
  
  // What-If Simulator State
  whatIfHoldings: Holding[];
  isWhatIfActive: boolean;
  
  // Actions
  setHoldings: (holdings: Holding[]) => void;
  addActivity: (activity: ActivityLog) => void;
  dismissAlert: (id: string) => void;
  updateNominee: (id: string, updates: Partial<NomineeRecord>) => void;
  addNominee: (nominee: Omit<NomineeRecord, "id">) => void;
  
  // Sync actions
  startSync: (method: "OTP" | "CAS") => Promise<void>;
  resetSync: () => void;
  
  // What-If Simulator actions
  swapHolding: (targetId: string, replacementName: string, replacementTicker: string, replacementExpenseRatio: number) => void;
  resetWhatIf: () => void;
  
  // Financial analysis helpers
  getPortfolioValue: () => number;
  getWhatIfValue: () => number;
  getAverageExpenseRatio: () => number;
  getWhatIfExpenseRatio: () => number;
  getDiversificationScore: () => number; // 300 - 900
  getWhatIfDiversificationScore: () => number;
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  holdings: MOCK_HOLDINGS,
  alerts: MOCK_ALERTS,
  activities: MOCK_ACTIVITIES,
  recommendations: MOCK_RECOMMENDATIONS,
  nominees: MOCK_NOMINEES,
  taxGains: MOCK_TAX_REBALANCING,
  
  isSynced: true,
  syncMethod: null,
  syncProgress: 0,
  syncStep: "",
  
  whatIfHoldings: MOCK_HOLDINGS,
  isWhatIfActive: false,

  setHoldings: (holdings) => set({ holdings, whatIfHoldings: holdings }),
  
  addActivity: (activity) => set((state) => ({ 
    activities: [activity, ...state.activities] 
  })),
  
  dismissAlert: (id) => set((state) => ({
    alerts: state.alerts.filter((a) => a.id !== id)
  })),
  
  updateNominee: (id, updates) => set((state) => ({
    nominees: state.nominees.map((n) => n.id === id ? { ...n, ...updates } : n)
  })),

  addNominee: (nominee) => set((state) => {
    const newNominee: NomineeRecord = {
      ...nominee,
      id: `n_new_${Date.now()}`
    };
    return { nominees: [...state.nominees, newNominee] };
  }),

  startSync: async (method) => {
    set({ 
      isSynced: false, 
      syncMethod: method, 
      syncProgress: 0, 
      syncStep: method === "OTP" ? "Initiating secure request..." : "Reading document signature..."
    });

    const steps = method === "OTP" 
      ? [
          { progress: 15, step: "Connecting to MF Central API..." },
          { progress: 35, step: "Verifying mobile number OTP token..." },
          { progress: 60, step: "Retrieving NSDL & CDSL stock positions..." },
          { progress: 85, step: "Consolidating mutual fund portfolios..." },
          { progress: 100, step: "Sync successful! Parsing underlying holdings..." }
        ]
      : [
          { progress: 20, step: "Decrypting CAS PDF with credential passphrase..." },
          { progress: 45, step: "Extracting transaction statements..." },
          { progress: 70, step: "Running AI folio aggregation..." },
          { progress: 90, step: "Cross-referencing AMC NAV endpoints..." },
          { progress: 100, step: "Success! Complete portfolio diagnostic loaded." }
        ];

    for (const step of steps) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      set({ syncProgress: step.progress, syncStep: step.step });
    }

    set({ isSynced: true });
  },

  resetSync: () => set({ isSynced: false, syncProgress: 0, syncStep: "", syncMethod: null }),

  swapHolding: (targetId, replacementName, replacementTicker, replacementExpenseRatio) => set((state) => {
    const swapped = state.whatIfHoldings.map((h) => {
      if (h.id === targetId) {
        // Swap holding with replacement, simulating same value and quantity
        return {
          ...h,
          name: replacementName,
          ticker: replacementTicker,
          expenseRatio: replacementExpenseRatio,
          returns: h.returns + 2.5, // simulate better return potential
          returnsValue: h.returnsValue * 1.1,
          riskGrade: "Low" as const, // usually replaced with lower-risk/cost ETFs
          underlyingHoldings: h.underlyingHoldings ? h.underlyingHoldings.map(u => ({
            ...u,
            allocation: u.allocation * 0.9 // simulate better sector spread
          })) : undefined
        };
      }
      return h;
    });

    return {
      whatIfHoldings: swapped,
      isWhatIfActive: true
    };
  }),

  resetWhatIf: () => set((state) => ({
    whatIfHoldings: state.holdings,
    isWhatIfActive: false
  })),

  // Calculation helpers
  getPortfolioValue: () => {
    return get().holdings.reduce((sum, h) => sum + h.currentValue, 0);
  },

  getWhatIfValue: () => {
    return get().whatIfHoldings.reduce((sum, h) => sum + h.currentValue, 0);
  },

  getAverageExpenseRatio: () => {
    const funds = get().holdings.filter((h) => h.type === "Mutual Fund");
    if (funds.length === 0) return 0;
    const totalValue = funds.reduce((sum, h) => sum + h.currentValue, 0);
    const weightedSum = funds.reduce((sum, h) => sum + ((h.expenseRatio || 0) * h.currentValue), 0);
    return weightedSum / totalValue;
  },

  getWhatIfExpenseRatio: () => {
    const funds = get().whatIfHoldings.filter((h) => h.type === "Mutual Fund");
    if (funds.length === 0) return 0;
    const totalValue = funds.reduce((sum, h) => sum + h.currentValue, 0);
    const weightedSum = funds.reduce((sum, h) => sum + ((h.expenseRatio || 0) * h.currentValue), 0);
    return weightedSum / totalValue;
  },

  getDiversificationScore: () => {
    // Return score based on overlap / number of holdings
    const stockCount = get().holdings.length;
    if (stockCount > 6) return 840;
    if (stockCount > 4) return 720;
    return 580;
  },

  getWhatIfDiversificationScore: () => {
    if (!get().isWhatIfActive) return get().getDiversificationScore();
    const score = get().getDiversificationScore();
    return Math.min(score + 60, 900); // Replacing funds improves score
  }
}));
