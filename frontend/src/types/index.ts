export type AssetType = "Stock" | "Mutual Fund" | "ETF" | "Cash" | "Gold";

export interface StockExposure {
  name: string;
  ticker: string;
  allocation: number; // percentage (0-100)
  sector: string;
  value: number;
}

export interface Holding {
  id: string;
  name: string;
  type: AssetType;
  ticker: string;
  quantity: number;
  currentValue: number;
  avgPrice: number;
  currentPrice: number;
  returns: number; // percentage (e.g. +18.4)
  returnsValue: number; // absolute value (e.g. +45000)
  allocation: number; // percentage of portfolio
  expenseRatio?: number; // e.g. 0.012 (1.2% fee)
  riskGrade: "High" | "Medium" | "Low";
  sector: string;
  underlyingHoldings?: StockExposure[]; // For mutual funds look-through
}

export interface ExposureAlert {
  id: string;
  type: "Danger" | "Warning" | "Success" | "Info";
  title: string;
  description: string;
  date: string;
}

export interface ActivityLog {
  id: string;
  type: "Buy" | "Sell" | "Dividend" | "Rebalance";
  assetName: string;
  quantity?: number;
  amount: number;
  date: string;
  status: "Completed" | "Pending";
}

export interface AIRecommendation {
  id: string;
  type: "Fee" | "Overlap" | "Concentration" | "Nominee" | "Tax";
  severity: "High" | "Medium" | "Low";
  title: string;
  description: string;
  actionText: string;
  impactValue?: string;
  link: string;
}

export interface CrashScenario {
  id: string;
  name: string;
  dateRange: string;
  marketDrop: number; // e.g. -38
  portfolioImpact: number; // e.g. -24
  recoveryMonths: number;
  description: string;
}

export interface PeerBenchmark {
  category: string;
  portfolio: number;
  average: number;
  top10Percent: number;
}

export interface CapitalGainsItem {
  id: string;
  assetName: string;
  gainType: "LTCG" | "STCG";
  purchaseDate: string;
  sellDate: string;
  sellValue: number;
  gainAmount: number;
  taxRate: number;
  taxOwed: number;
}

export interface NomineeRecord {
  id: string;
  name: string;
  relationship: "Spouse" | "Child" | "Parent" | "Sibling" | "Other";
  allocation: number; // percentage
  status: "Verified" | "Pending" | "Action Required";
  verificationMethod?: string;
}

export interface ClientProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  portfolioValue: number;
  gainLoss: number;
  gainLossPercent: number;
  riskScore: number; // 300-900 scale
  hhiScore: number; // Herfindahl-Hirschman Index
  diversificationGrade: "Excellent" | "Good" | "Average" | "Poor";
  feeBleedAnnually: number;
  nomineeStatus: "Complete" | "Partial" | "Missing";
}
