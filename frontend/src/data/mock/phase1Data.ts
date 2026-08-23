import { 
  UserProfile, 
  HealthScoreData, 
  WastedFeeSummary, 
  TopExposureCompany, 
  TransactionRecord 
} from "@/types";

export const MOCK_USER_PROFILE: UserProfile = {
  id: "usr_ind_98241",
  name: "Anubhav Thakur",
  email: "anubhav.thakur@wealthtech.in",
  phone: "+91 98765 43210",
  panMasked: "ABCDE****F",
  kycStatus: "Verified",
  totalPortfolioValue: 3480000.0,
  totalGainLoss: 524000.0,
  totalGainPercent: 17.72,
  folioCount: 8,
  accountAggregatorStatus: "Connected",
  lastSyncedAt: "2026-08-19 15:30 IST"
};

export const MOCK_HEALTH_SCORE: HealthScoreData = {
  overallScore: 748,
  ratingGrade: "Healthy",
  percentileRank: 84, // Top 16% of retail investors
  ratingText: "Strong portfolio foundation with moderate large-cap banking concentration and duplicate regular plan commissions.",
  subPillars: [
    {
      id: "sp_1",
      name: "Asset Class Allocation",
      score: 88,
      maxScore: 100,
      weight: 25,
      status: "Optimal",
      insight: "Well-distributed across Equities (78%), Fixed Income (14%), and Global Tech (8%)."
    },
    {
      id: "sp_2",
      name: "Single-Company Exposure",
      score: 64,
      maxScore: 100,
      weight: 30,
      status: "Alert",
      insight: "HDFC Bank (15.87%) & Reliance (14.64%) exceed safe 10% single-stock ceiling."
    },
    {
      id: "sp_3",
      name: "Scheme Overlap & TER",
      score: 68,
      maxScore: 100,
      weight: 20,
      status: "Moderate",
      insight: "42% portfolio stock duplication between Flexi Cap and Bluechip holdings."
    },
    {
      id: "sp_4",
      name: "Corporate Group Risk",
      score: 79,
      maxScore: 100,
      weight: 15,
      status: "Optimal",
      insight: "HDFC + Reliance Groups account for 32.3% of total deployed capital."
    },
    {
      id: "sp_5",
      name: "Nominee & Compliance",
      score: 70,
      maxScore: 100,
      weight: 10,
      status: "Moderate",
      insight: "2 Mutual Fund folios lack verified digital nominee allocation under SEBI guidelines."
    }
  ]
};

export const MOCK_WASTED_FEES: WastedFeeSummary = {
  annualBleedAmount: 24800,
  regularCommissionTotal: 16600,
  duplicateTerTotal: 8200,
  tenYearCompoundedLoss: 435200,
  compoundingRate: 12.0
};

export const MOCK_TOP_EXPOSURES: TopExposureCompany[] = [
  {
    id: "top_1",
    companyName: "HDFC Bank Ltd.",
    ticker: "HDFCBANK",
    isin: "INE040A01034",
    sector: "Financial Services",
    conglomerate: "HDFC Group",
    directHoldingValue: 354354.0,
    directPercent: 10.18,
    indirectHoldingValue: 198000.0,
    indirectPercent: 5.69,
    totalTrueValue: 552354.0,
    totalTruePercent: 15.87,
    riskTier: "Critical Danger",
    lookThroughFundsCount: 4
  },
  {
    id: "top_2",
    companyName: "Reliance Industries Ltd.",
    ticker: "RELIANCE",
    isin: "INE002A01018",
    sector: "Energy & Petrochemicals",
    conglomerate: "Reliance / Ambani",
    directHoldingValue: 340860.0,
    directPercent: 9.79,
    indirectHoldingValue: 168600.0,
    indirectPercent: 4.85,
    totalTrueValue: 509460.0,
    totalTruePercent: 14.64,
    riskTier: "Critical Danger",
    lookThroughFundsCount: 4
  },
  {
    id: "top_3",
    companyName: "Tata Consultancy Services Ltd.",
    ticker: "TCS",
    isin: "INE467B01029",
    sector: "Information Technology",
    conglomerate: "Tata Group",
    directHoldingValue: 250263.0,
    directPercent: 7.19,
    indirectHoldingValue: 84200.0,
    indirectPercent: 2.42,
    totalTrueValue: 334463.0,
    totalTruePercent: 9.61,
    riskTier: "Elevated Risk",
    lookThroughFundsCount: 3
  },
  {
    id: "top_4",
    companyName: "Infosys Ltd.",
    ticker: "INFY",
    isin: "INE009A01021",
    sector: "Information Technology",
    conglomerate: "Independent",
    directHoldingValue: 184811.0,
    directPercent: 5.31,
    indirectHoldingValue: 63000.0,
    indirectPercent: 1.81,
    totalTrueValue: 247811.0,
    totalTruePercent: 7.12,
    riskTier: "Optimal Spread",
    lookThroughFundsCount: 2
  },
  {
    id: "top_5",
    companyName: "ICICI Bank Ltd.",
    ticker: "ICICIBANK",
    isin: "INE090A01021",
    sector: "Financial Services",
    conglomerate: "ICICI Group",
    directHoldingValue: 0.0,
    directPercent: 0.0,
    indirectHoldingValue: 142800.0,
    indirectPercent: 4.10,
    totalTrueValue: 142800.0,
    totalTruePercent: 4.10,
    riskTier: "Optimal Spread",
    lookThroughFundsCount: 3
  }
];

// 50 realistic transactions spanning across 2025-2026 for performant virtualization
export const MOCK_TRANSACTIONS_50: TransactionRecord[] = Array.from({ length: 50 }, (_, i) => {
  const schemes = [
    { name: "Parag Parikh Flexi Cap Fund - Direct (G)", ticker: "PPFCF", folio: "10984201", baseNav: 68.4 },
    { name: "ICICI Prudential Bluechip Fund - Regular (G)", ticker: "ICICIBLUE", folio: "45912803", baseNav: 96.2 },
    { name: "Nippon India Small Cap Fund - Direct (G)", ticker: "NIPSMALL", folio: "78201945", baseNav: 144.8 },
    { name: "SBI Contra Fund - Regular (G)", ticker: "SBICONTRA", folio: "91024822", baseNav: 228.1 },
    { name: "UTI Nifty 50 Index Fund - Direct (G)", ticker: "UTINIFTY", folio: "33918204", baseNav: 162.5 },
    { name: "Reliance Industries Ltd. (Direct Equity)", ticker: "RELIANCE", folio: "IN300128", baseNav: 2820.0 },
    { name: "HDFC Bank Ltd. (Direct Equity)", ticker: "HDFCBANK", folio: "IN300128", baseNav: 1610.0 }
  ];

  const types: TransactionRecord["type"][] = [
    "SIP Buy", "SIP Buy", "SIP Buy", "Lump Sum Buy", "Dividend Payout", "Switch In", "Redemption"
  ];

  const selectedScheme = schemes[i % schemes.length];
  const selectedType = types[i % types.length];
  const daysAgo = i * 6 + (i % 3);
  const dateObj = new Date(2026, 7, 18); // Aug 18, 2026 base
  dateObj.setDate(dateObj.getDate() - daysAgo);

  const nav = Number((selectedScheme.baseNav * (1 - (i * 0.003))).toFixed(2));
  const amount = selectedType === "SIP Buy" 
    ? (i % 2 === 0 ? 15000 : 10000)
    : selectedType === "Lump Sum Buy" 
    ? (i % 2 === 0 ? 50000 : 25000)
    : (i * 1250) + 3200;

  const units = Number((amount / nav).toFixed(3));

  return {
    id: `tx_${5000 + i}`,
    date: dateObj.toISOString().split("T")[0],
    type: selectedType,
    schemeName: selectedScheme.name,
    ticker: selectedScheme.ticker,
    folioNumber: selectedScheme.folio,
    units,
    nav,
    amount,
    status: i === 0 ? "Processing" : "Executed",
    transactionRef: `NSE_MF_${892019 + i * 17}`
  };
});
