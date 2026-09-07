export type AssetType = "Stock" | "Mutual Fund" | "ETF" | "Gold" | "FD" | "EPF";

// Legacy look-through shape used in portfolioData.ts
export interface CompanyExposureItem {
  id: string;
  companyName: string;
  ticker: string;
  sector: string;
  conglomerateGroup: string;
  directValue: number;
  directPercent: number;
  indirectValue: number;
  indirectPercent: number;
  totalTrueValue: number;
  totalTruePercent: number;
  riskCategory: string;
  promoterPledging: number;
  fiiHolding: number;
  supplyChainVulnerability: string;
  heldViaFunds: {
    fundName: string;
    fundTicker: string;
    fundAllocation: number;
    indirectValue: number;
  }[];
}

export interface ExposureSourceItem {
  type: "direct" | "mutual_fund";
  holding_name?: string;
  isin?: string;
  fund_name?: string;
  fund_isin?: string;
  fund_value?: number;
  company_weight?: number;
  exposure_value: number;
  value: number;
  as_of_date?: string;
}

export interface CompanyExposureItemDetail {
  company_id: string;
  company_name: string;
  isin?: string;
  ticker?: string;
  sector?: string;
  combined_value: number;
  combined_percent: number;
  direct_value: number;
  direct_percent: number;
  mutual_fund_value: number;
  mutual_fund_percent: number;
  sources: ExposureSourceItem[];
}

export interface CompanyExposureResponse {
  portfolio_id: string;
  portfolio_value: number;
  data_as_of?: string;
  mf_lookthrough_available: boolean;
  total_direct_value: number;
  total_mf_value: number;
  companies: CompanyExposureItemDetail[];
}

export interface MFLookthroughHoldingItem {
  company_name: string;
  isin?: string;
  ticker?: string;
  sector?: string;
  weight_percent: number;
  exposure_value: number;
  quantity?: number;
  market_value?: number;
}

export interface MFLookthroughSchemeItem {
  scheme_name: string;
  scheme_code?: string;
  scheme_isin?: string;
  user_value: number;
  lookthrough_available: boolean;
  as_of_date?: string;
  holdings: MFLookthroughHoldingItem[];
}

export interface ContributingFundItem {
  fund_name: string;
  fund_isin?: string;
  fund_value: number;
  weight_percent: number;
  exposure_value: number;
  as_of_date?: string;
}

export interface IndirectCompanyExposureItem {
  company_id: string;
  company_name: string;
  isin?: string;
  ticker?: string;
  sector?: string;
  total_exposure_value: number;
  total_exposure_percent: number;
  contributing_funds: ContributingFundItem[];
}

export interface LookThroughResponse {
  portfolio_id: string;
  portfolio_value: number;
  total_mf_value: number;
  data_as_of?: string;
  mf_lookthrough_available: boolean;
  mutual_funds: MFLookthroughSchemeItem[];
  companies: IndirectCompanyExposureItem[];
  combined_companies: CompanyExposureItemDetail[];
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  type: "sync" | "alert" | "update" | "info";
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  panMasked: string;
  kycStatus: "Verified" | "Pending" | "Action Required";
  totalPortfolioValue: number;
  totalGainLoss: number;
  totalGainPercent: number;
  folioCount: number;
  accountAggregatorStatus: "Connected" | "Disconnected";
  lastSyncedAt: string;
}

export interface HealthSubPillar {
  id: string;
  name: string;
  score: number;
  maxScore: number;
  weight: number;
  status: "Optimal" | "Moderate" | "Alert" | "Critical";
  insight: string;
}

export interface HealthScoreData {
  overallScore: number; // 300 to 900 scale
  ratingGrade: "Prime" | "Healthy" | "Moderate Risk" | "Vulnerable";
  percentileRank: number; // e.g. Top 15%
  ratingText: string;
  subPillars: HealthSubPillar[];
}

export interface WastedFeeSummary {
  annualBleedAmount: number;
  regularCommissionTotal: number;
  duplicateTerTotal: number;
  tenYearCompoundedLoss: number;
  compoundingRate: number; // e.g. 12%
}

export interface TopExposureCompany {
  id: string;
  companyName: string;
  ticker: string;
  isin: string;
  sector: string;
  conglomerate: string;
  directHoldingValue: number;
  directPercent: number;
  indirectHoldingValue: number;
  indirectPercent: number;
  totalTrueValue: number;
  totalTruePercent: number;
  riskTier: "Critical Danger" | "Elevated Risk" | "Optimal Spread";
  lookThroughFundsCount: number;
}

export interface TransactionRecord {
  id: string;
  date: string;
  type: "SIP Buy" | "Lump Sum Buy" | "Redemption" | "Switch In" | "Switch Out" | "Dividend Payout";
  schemeName: string;
  ticker: string;
  folioNumber: string;
  units: number;
  nav: number;
  amount: number;
  status: "Executed" | "Settled" | "Processing";
  transactionRef: string;
}

export interface StockExposure {
  name: string;
  ticker: string;
  allocation: number;
  sector: string;
  value: number;
}

export interface Holding {
  id: string;
  name: string;
  type: AssetType;
  ticker: string;
  isin?: string;
  folioNumber?: string;
  quantity: number;
  currentValue: number;
  avgPrice: number;
  currentPrice: number;
  returns: number;
  returnsValue: number;
  allocation: number;
  expenseRatio?: number;
  planType?: "Direct" | "Regular";
  riskGrade: "High" | "Medium" | "Low";
  sector: string;
  conglomerate?: string;
  nomineeStatus?: "Verified" | "Missing" | "Action Required";
  assetClass?: string;
  cagr3Y?: number;
  alpha?: number;
  beta?: number;
  sipActive?: boolean;
  sipAmount?: number;
  underlyingHoldings?: StockExposure[];
}

export interface ExposureAlert {
  id: string;
  type: "Danger" | "Warning" | "Success" | "Info";
  category: "Concentration" | "Fee" | "Overlap" | "Nominee" | "Conglomerate" | "StyleDrift" | "PanicGuard";
  title: string;
  description: string;
  impactScore?: string;
  date: string;
}

export interface CrashScenario {
  id: string;
  name: string;
  dateRange: string;
  marketDrop: number;
  portfolioImpact: number;
  estimatedLossRupees: number;
  recoveryMonths: number;
  description: string;
  historicalNiftyPoints?: { month: string; nifty: number; portfolio: number }[];
}

export interface PeerBenchmark {
  category: string;
  portfolio: number;
  average: number;
  top10Percent: number;
  unit: string;
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
  exitLoadApplicable: boolean;
  exitLoadFee: number;
  recommendation: "Harvest Loss Now" | "Hold till LTCG" | "Sell Partial under Exemption";
}

export interface NomineeRecord {
  id: string;
  accountName: string;
  accountType: "Demat (Zerodha)" | "Demat (Groww)" | "Mutual Fund (CAMS)" | "Mutual Fund (KFintech)" | "Bank FD" | "EPFO";
  folioNumber: string;
  nomineeName: string;
  relationship: "Spouse" | "Child" | "Parent" | "Sibling" | "Unassigned";
  allocation: number;
  status: "Verified" | "Pending" | "Action Required";
  verificationMethod?: string;
  lastUpdated: string;
}

export interface ConglomerateGroupData {
  id: string;
  groupName: string;
  totalValue: number;
  totalPercentage: number;
  riskStatus: "High Alert" | "Elevated" | "Normal";
  companies: {
    name: string;
    ticker: string;
    value: number;
    percentage: number;
    heldVia: string;
  }[];
}

export interface SIPHealthItem {
  id: string;
  fundName: string;
  ticker: string;
  monthlyAmount: number;
  totalInvested: number;
  currentValue: number;
  rolling3YReturn: number;
  benchmarkReturn: number;
  alpha: number;
  grade: "A+" | "A" | "B" | "C" | "D";
  status: "Outperformer" | "Consistent" | "Underperformer";
  recommendation: string;
  suggestedSwitch?: {
    replacementFund: string;
    replacementTicker: string;
    terDifference: string;
    historicalAlphaDiff: string;
  };
}

export interface FamilyMember {
  id: string;
  name: string;
  relation: "Self" | "Spouse" | "Father" | "Mother" | "Child";
  panMasked: string;
  portfolioValue: number;
  totalGain: number;
  gainPercent: number;
  healthScore: number;
  holdingsCount: number;
  topStock: string;
  color: string;
}

export interface IPONFOCheckItem {
  id: string;
  name: string;
  type: "IPO" | "NFO";
  issuePrice: string;
  issueDate: string;
  category: string;
  overlapPercent: number;
  overlappingHoldings: {
    holdingName: string;
    viaFund: string;
    existingExposurePercent: number;
  }[];
  verdict: "High Duplicate Exposure" | "Moderate Overlap" | "Unique / Clean Addition";
  rationale: string;
}

export interface MacroStressConfig {
  crudePrice: number;
  repoRate: number;
  usdInr: number;
  itSectorShock: number;
  bankingSectorShock: number;
}

export interface DividendEvent {
  id: string;
  companyName: string;
  ticker: string;
  exDate: string;
  recordDate: string;
  payoutDate: string;
  dividendPerShare: number;
  sharesHeld: number;
  totalDividend: number;
  dividendYield: number;
  status: "Announced" | "Estimated" | "Credited";
}

export interface NewsImpactItem {
  id: string;
  headline: string;
  source: string;
  timestamp: string;
  ticker: string;
  companyName: string;
  sector: string;
  sentiment: "Bullish" | "Bearish" | "Neutral";
  companyImpactPercent: number;
  portfolioImpactPercent: number;
  summary: string;
  actionNudge: string;
}

export interface ClientProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  portfolioValue: number;
  gainLoss: number;
  gainLossPercent: number;
  riskScore: number;
  hhiScore: number;
  diversificationGrade: "Excellent" | "Good" | "Average" | "Poor";
  feeBleedAnnually: number;
  nomineeStatus: "Complete" | "Partial" | "Missing";
  lastAuditDate: string;
}

export interface AdvisorSettings {
  firmName: string;
  advisorName: string;
  arnNumber: string;
  sebiReg: string;
  email: string;
  phone: string;
  website: string;
  brandPrimaryColor: string;
  logoText: string;
  disclaimer: string;
}

export interface DiagnosticPillarDetail {
  score: number;
  max_score: number;
  weight_percent: number;
  status: string;
  note: string;
}

export interface DiagnosticsResponse {
  portfolio_id: string;
  total_value: number;
  diversification_score: {
    score: number;
    rating: string;
    max_score: number;
    min_score: number;
    pillars: {
      single_company_exposure: DiagnosticPillarDetail;
      asset_spread: DiagnosticPillarDetail;
      scheme_overlap_ter: DiagnosticPillarDetail;
      nominee_compliance: DiagnosticPillarDetail;
    };
    explainability_notes: string[];
  };
  concentration: {
    hhi_score: number;
    inverse_hhi_effective_count: number;
    category: string;
    unmapped_weight_percent: number;
  };
  top_company_exposures: Array<{
    company_name: string;
    isin?: string;
    combined_percent: number;
    combined_value: number;
    direct_value: number;
    mutual_fund_value: number;
  }>;
  fee_analysis?: {
    total_portfolio_value: number;
    total_annual_cost: number;
    actual_ter_annual_cost: number;
    regular_plan_annual_bleed: number;
    potential_duplicate_ter_cost: number;
    compounded_loss_projections: Record<string, number>;
  };
  nominee_audit?: {
    accounts_checked: number;
    accounts_confirmed: number;
    accounts_missing: number;
    accounts_unknown: number;
    compliance_percentage: number;
    is_fully_compliant: boolean;
    red_flags: Array<{
      account_name: string;
      account_number: string;
      warning: string;
      action_required: string;
    }>;
    accounts: Array<{
      account_id: string;
      account_name: string;
      account_type: string;
      masked_account_number: string;
      nominee_status: "CONFIRMED" | "MISSING" | "UNKNOWN";
      nominee_name?: string | null;
      relationship?: string | null;
      action_required?: string | null;
    }>;
  };
  alerts: Array<{
    id?: string;
    type: string;
    title: string;
    message: string;
    severity: string;
  }>;
}

