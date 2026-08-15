import { 
  Holding, 
  ExposureAlert, 
  ActivityLog, 
  AIRecommendation, 
  CrashScenario, 
  PeerBenchmark, 
  CapitalGainsItem, 
  NomineeRecord, 
  ClientProfile 
} from "@/types";

// Master Holdings Data
export const MOCK_HOLDINGS: Holding[] = [
  {
    id: "h1",
    name: "Reliance Industries Ltd.",
    type: "Stock",
    ticker: "RELIANCE",
    quantity: 120,
    avgPrice: 2450.0,
    currentPrice: 2840.5,
    currentValue: 340860.0,
    returns: 15.94,
    returnsValue: 46860.0,
    allocation: 13.63,
    riskGrade: "Medium",
    sector: "Energy & Petrochemicals"
  },
  {
    id: "h2",
    name: "Tata Consultancy Services Ltd.",
    type: "Stock",
    ticker: "TCS",
    quantity: 65,
    avgPrice: 3200.0,
    currentPrice: 3850.2,
    currentValue: 250263.0,
    returns: 20.32,
    returnsValue: 42263.0,
    allocation: 10.01,
    riskGrade: "Low",
    sector: "Information Technology"
  },
  {
    id: "h3",
    name: "Infosys Ltd.",
    type: "Stock",
    ticker: "INFY",
    quantity: 110,
    avgPrice: 1520.0,
    currentPrice: 1680.1,
    currentValue: 184811.0,
    returns: 10.53,
    returnsValue: 17611.0,
    allocation: 7.39,
    riskGrade: "Low",
    sector: "Information Technology"
  },
  {
    id: "h4",
    name: "HDFC Bank Ltd.",
    type: "Stock",
    ticker: "HDFCBANK",
    quantity: 220,
    avgPrice: 1480.0,
    currentPrice: 1610.7,
    currentValue: 354354.0,
    returns: 8.83,
    returnsValue: 28754.0,
    allocation: 14.17,
    riskGrade: "Low",
    sector: "Financial Services"
  },
  {
    id: "h5",
    name: "Parag Parikh Flexi Cap Fund",
    type: "Mutual Fund",
    ticker: "PPFCF",
    quantity: 8540.24,
    avgPrice: 52.3,
    currentPrice: 70.25,
    currentValue: 599951.86,
    returns: 34.32,
    returnsValue: 153297.31,
    allocation: 23.99,
    expenseRatio: 0.0076, // 0.76%
    riskGrade: "Medium",
    sector: "Multi Cap Diversified",
    underlyingHoldings: [
      { name: "HDFC Bank Ltd.", ticker: "HDFCBANK", allocation: 8.5, sector: "Financial Services", value: 50995.9 },
      { name: "Reliance Industries Ltd.", ticker: "RELIANCE", allocation: 6.2, sector: "Energy & Petrochemicals", value: 37197.0 },
      { name: "Alphabet Inc.", ticker: "GOOGL", allocation: 5.4, sector: "Technology & Software", value: 32397.4 },
      { name: "Microsoft Corp.", ticker: "MSFT", allocation: 4.8, sector: "Technology & Software", value: 28797.7 },
      { name: "ITC Ltd.", ticker: "ITC", allocation: 4.1, sector: "Consumer Staples", value: 24598.0 },
      { name: "Bajaj Holdings & Investment Ltd.", ticker: "BAJAJHLDNG", allocation: 3.5, sector: "Financial Services", value: 20998.3 },
      { name: "Tata Consultancy Services Ltd.", ticker: "TCS", allocation: 3.0, sector: "Information Technology", value: 17998.6 }
    ]
  },
  {
    id: "h6",
    name: "ICICI Prudential Bluechip Fund",
    type: "Mutual Fund",
    ticker: "ICICIBLUE",
    quantity: 4520.18,
    avgPrice: 85.1,
    currentPrice: 98.4,
    currentValue: 444785.71,
    returns: 15.63,
    returnsValue: 60118.39,
    allocation: 17.79,
    expenseRatio: 0.0092, // 0.92%
    riskGrade: "Low",
    sector: "Large Cap",
    underlyingHoldings: [
      { name: "ICICI Bank Ltd.", ticker: "ICICIBANK", allocation: 9.2, sector: "Financial Services", value: 40920.3 },
      { name: "Reliance Industries Ltd.", ticker: "RELIANCE", allocation: 8.1, sector: "Energy & Petrochemicals", value: 36027.6 },
      { name: "HDFC Bank Ltd.", ticker: "HDFCBANK", allocation: 7.8, sector: "Financial Services", value: 34693.3 },
      { name: "Infosys Ltd.", ticker: "INFY", allocation: 6.5, sector: "Information Technology", value: 28911.1 },
      { name: "Larsen & Toubro Ltd.", ticker: "LT", allocation: 5.2, sector: "Construction & Infrastructure", value: 23128.9 },
      { name: "Tata Consultancy Services Ltd.", ticker: "TCS", allocation: 4.5, sector: "Information Technology", value: 20015.4 }
    ]
  },
  {
    id: "h7",
    name: "Nippon India Small Cap Fund",
    type: "Mutual Fund",
    ticker: "NIPSMALL",
    quantity: 1850.55,
    avgPrice: 110.2,
    currentPrice: 148.9,
    currentValue: 275546.89,
    returns: 35.12,
    returnsValue: 71576.28,
    allocation: 11.02,
    expenseRatio: 0.0068, // 0.68%
    riskGrade: "High",
    sector: "Small Cap",
    underlyingHoldings: [
      { name: "Tube Investments of India Ltd.", ticker: "TIINDIA", allocation: 4.2, sector: "Capital Goods", value: 11572.9 },
      { name: "HDFC Bank Ltd.", ticker: "HDFCBANK", allocation: 3.1, sector: "Financial Services", value: 8541.9 },
      { name: "Krishna Institute of Medical Sciences", ticker: "KIMS", allocation: 2.8, sector: "Healthcare", value: 7715.3 },
      { name: "Reliance Industries Ltd.", ticker: "RELIANCE", allocation: 2.2, sector: "Energy & Petrochemicals", value: 6062.0 }
    ]
  },
  {
    id: "h8",
    name: "SBI Contra Fund",
    type: "Mutual Fund",
    ticker: "SBICONTRA",
    quantity: 2150.12,
    avgPrice: 205.4,
    currentPrice: 232.8,
    currentValue: 500547.94,
    returns: 13.34,
    returnsValue: 58813.25,
    allocation: 20.01,
    expenseRatio: 0.0084, // 0.84%
    riskGrade: "Medium",
    sector: "Value / Contra",
    underlyingHoldings: [
      { name: "State Bank of India", ticker: "SBIN", allocation: 6.8, sector: "Financial Services", value: 34037.2 },
      { name: "HDFC Bank Ltd.", ticker: "HDFCBANK", allocation: 5.5, sector: "Financial Services", value: 27530.1 },
      { name: "ICICI Bank Ltd.", ticker: "ICICIBANK", allocation: 5.2, sector: "Financial Services", value: 26028.5 },
      { name: "Cognizant Technology Solutions", ticker: "CTSH", allocation: 4.5, sector: "Information Technology", value: 22524.6 },
      { name: "Reliance Industries Ltd.", ticker: "RELIANCE", allocation: 3.8, sector: "Energy & Petrochemicals", value: 19020.8 }
    ]
  }
];

// Exposure Alerts
export const MOCK_ALERTS: ExposureAlert[] = [
  {
    id: "a1",
    type: "Danger",
    title: "Extreme Stock Concentration",
    description: "HDFC Bank Ltd. represents 20.1% of your aggregate portfolio, including indirect mutual fund holdings.",
    date: "10 mins ago"
  },
  {
    id: "a2",
    type: "Warning",
    title: "High Sector Conglomerate Exposure",
    description: "Your total exposure to Reliance Conglomerate (Reliance Industries + MF holdings) exceeds 18.5%.",
    date: "2 hours ago"
  },
  {
    id: "a3",
    type: "Info",
    title: "Nominee Missing",
    description: "2 mutual funds are missing nominee registrations. Immediate action recommended to avoid asset freeze.",
    date: "1 day ago"
  },
  {
    id: "a4",
    type: "Success",
    title: "Rebalance Complete",
    description: "Successfully reallocated Parag Parikh Flexi Cap allocation.",
    date: "3 days ago"
  }
];

// Recent Activities
export const MOCK_ACTIVITIES: ActivityLog[] = [
  {
    id: "act1",
    type: "Buy",
    assetName: "Parag Parikh Flexi Cap Fund",
    quantity: 120.5,
    amount: 8465.12,
    date: "2026-08-05",
    status: "Completed"
  },
  {
    id: "act2",
    type: "Sell",
    assetName: "Infosys Ltd.",
    quantity: 15,
    amount: 25201.5,
    date: "2026-08-01",
    status: "Completed"
  },
  {
    id: "act3",
    type: "Dividend",
    assetName: "Reliance Industries Ltd.",
    amount: 1080.0,
    date: "2026-07-28",
    status: "Completed"
  },
  {
    id: "act4",
    type: "Rebalance",
    assetName: "SBI Contra Fund",
    amount: 50000.0,
    date: "2026-07-15",
    status: "Completed"
  }
];

// AI Recommendations
export const MOCK_RECOMMENDATIONS: AIRecommendation[] = [
  {
    id: "r1",
    type: "Fee",
    severity: "High",
    title: "Switch to Direct Plan Options",
    description: "You hold Regular plans in Parag Parikh Flexi Cap and ICICI Bluechip. Switching to Direct plans will reduce your average expense ratio from 0.81% to 0.45%, saving substantial fees.",
    actionText: "Convert to Direct Plans",
    impactValue: "₹18,520 / yr",
    link: "/diagnostics?tab=fee"
  },
  {
    id: "r2",
    type: "Overlap",
    severity: "Medium",
    title: "Eliminate Stock Overlap",
    description: "Parag Parikh Flexi Cap and ICICI Bluechip share a 32% portfolio overlap in Large-cap financials (HDFC, ICICI Bank, and Reliance). You can consolidate or swap ICICI Bluechip to minimize redundancy.",
    actionText: "Compare Fund Overlap",
    impactValue: "Reduce overlap by 14%",
    link: "/diagnostics?tab=overlap"
  },
  {
    id: "r3",
    type: "Nominee",
    severity: "High",
    title: "Add Nominees to Mutual Funds",
    description: "SBI Contra Fund and Nippon India Small Cap have no nominee designated. SEBI mandates listing nominees to prevent asset freezing on succession.",
    actionText: "Update Nominees Now",
    impactValue: "Fix Compliance",
    link: "/diagnostics?tab=nominee"
  },
  {
    id: "r4",
    type: "Tax",
    severity: "Low",
    title: "Harvest Tax Losses",
    description: "You have ₹12,400 of unrealized short-term losses in Infosys. Selling and repurchasing can offset your current STCG gains liability.",
    actionText: "Simulate Tax Savings",
    impactValue: "Save ₹1,860",
    link: "/advanced?tab=tax"
  }
];

// History performance charts (1 year monthly data)
export const MOCK_PERFORMANCE_HISTORY = [
  { month: "Aug 2025", Portfolio: 2100000, Nifty50: 2100000 },
  { month: "Sep 2025", Portfolio: 2180000, Nifty50: 2140000 },
  { month: "Oct 2025", Portfolio: 2150000, Nifty50: 2110000 },
  { month: "Nov 2025", Portfolio: 2240000, Nifty50: 2180000 },
  { month: "Dec 2025", Portfolio: 2310000, Nifty50: 2220000 },
  { month: "Jan 2026", Portfolio: 2380000, Nifty50: 2250000 },
  { month: "Feb 2026", Portfolio: 2340000, Nifty50: 2240000 },
  { month: "Mar 2026", Portfolio: 2420000, Nifty50: 2290000 },
  { month: "Apr 2026", Portfolio: 2480000, Nifty50: 2330000 },
  { month: "May 2026", Portfolio: 2530000, Nifty50: 2350000 },
  { month: "Jun 2026", Portfolio: 2610000, Nifty50: 2400000 },
  { month: "Jul 2026", Portfolio: 2700000, Nifty50: 2440000 },
  { month: "Aug 2026", Portfolio: 3000000, Nifty50: 2500000 }
];

// Sector Allocation Data
export const MOCK_SECTOR_ALLOCATION = [
  { name: "Financial Services", value: 34.2, color: "#3B82F6" },
  { name: "Energy & Petrochemicals", value: 19.8, color: "#10B981" },
  { name: "Information Technology", value: 16.5, color: "#F59E0B" },
  { name: "Technology & Software", value: 10.2, color: "#8B5CF6" },
  { name: "Capital Goods", value: 8.5, color: "#EC4899" },
  { name: "Healthcare & Pharma", value: 6.4, color: "#14B8A6" },
  { name: "Consumer Staples", value: 4.4, color: "#6B7280" }
];

// Asset Class Allocation
export const MOCK_ASSET_ALLOCATION = [
  { name: "Large Cap Stocks", value: 42.5, color: "#2563EB" },
  { name: "Mid Cap Stocks", value: 28.0, color: "#3B82F6" },
  { name: "Small Cap Stocks", value: 16.5, color: "#60A5FA" },
  { name: "International Tech", value: 10.2, color: "#8B5CF6" },
  { name: "Liquid Cash", value: 2.8, color: "#10B981" }
];

// Historical Crash Simulator
export const MOCK_CRASH_SCENARIOS: CrashScenario[] = [
  {
    id: "c1",
    name: "2008 Global Financial Crisis",
    dateRange: "Jan 2008 - Mar 2009",
    marketDrop: -52.6,
    portfolioImpact: -34.8,
    recoveryMonths: 28,
    description: "The subprime mortgage meltdown triggered a global banking run. Financials crashed hard, but defensive stocks and diversified multi-cap portfolios rebounded within 2 years."
  },
  {
    id: "c2",
    name: "2020 Covid Market Crash",
    dateRange: "Feb 2020 - Apr 2020",
    marketDrop: -38.2,
    portfolioImpact: -26.5,
    recoveryMonths: 8,
    description: "Pandemic locks triggered severe worldwide liquidity liquidations. Sharp, swift V-shaped recovery driven by massive tech demand, healthcare growth, and government stimulus."
  },
  {
    id: "c3",
    name: "2022 Tech & Inflation Correction",
    dateRange: "Jan 2022 - Oct 2022",
    marketDrop: -22.4,
    portfolioImpact: -14.2,
    recoveryMonths: 14,
    description: "Federal Reserve hiking cycle to curb soaring global inflation punished high-multiple growth equities. Diversified small-cap and value funds outperformed large tech."
  }
];

// Peer Benchmarks
export const MOCK_PEER_BENCHMARKS: PeerBenchmark[] = [
  { category: "Returns (3Y CAGR)", portfolio: 18.5, average: 14.2, top10Percent: 22.4 },
  { category: "Diversification Rating", portfolio: 84.0, average: 65.0, top10Percent: 90.0 },
  { category: "Risk/Sharpe Ratio", portfolio: 78.0, average: 58.0, top10Percent: 85.0 },
  { category: "Fee Minimization", portfolio: 62.0, average: 50.0, top10Percent: 88.0 },
  { category: "HHI Score (Lower=Better)", portfolio: 88.0, average: 70.0, top10Percent: 95.0 }
];

// Tax Rebalancing summary
export const MOCK_TAX_REBALANCING: CapitalGainsItem[] = [
  {
    id: "t1",
    assetName: "Infosys Ltd.",
    gainType: "STCG",
    purchaseDate: "2026-02-15",
    sellDate: "2026-08-01",
    sellValue: 25201.5,
    gainAmount: -12400.0,
    taxRate: 0.15,
    taxOwed: -1860.0
  },
  {
    id: "t2",
    assetName: "Reliance Industries Ltd.",
    gainType: "LTCG",
    purchaseDate: "2022-04-10",
    sellDate: "2026-08-01",
    sellValue: 120000.0,
    gainAmount: 48000.0,
    taxRate: 0.10,
    taxOwed: 4800.0
  },
  {
    id: "t3",
    assetName: "Parag Parikh Flexi Cap Fund",
    gainType: "STCG",
    purchaseDate: "2026-01-20",
    sellDate: "2026-08-01",
    sellValue: 80000.0,
    gainAmount: 18500.0,
    taxRate: 0.15,
    taxOwed: 2775.0
  }
];

// Nominees audit
export const MOCK_NOMINEES: NomineeRecord[] = [
  { id: "n1", name: "Indransh Pratap Thakur", relationship: "Spouse", allocation: 50, status: "Verified", verificationMethod: "e-KYC & Aadhar" },
  { id: "n2", name: "Aarav Pratap Thakur", relationship: "Child", allocation: 50, status: "Verified", verificationMethod: "Birth Certificate Upload" },
  { id: "n3", name: "Parag Parikh Flexi Cap Fund", relationship: "Spouse", allocation: 100, status: "Verified", verificationMethod: "FATCA declaration" },
  { id: "n4", name: "SBI Contra Fund", relationship: "Spouse", allocation: 0, status: "Action Required" },
  { id: "n5", name: "Nippon India Small Cap Fund", relationship: "Spouse", allocation: 0, status: "Action Required" }
];

// API Developer Console mock data
export const MOCK_API_KEYS = [
  { id: "k1", name: "Production Reader", key: "nl_prod_live_83kfs82jkdhsiuwh19", created: "2026-03-12", status: "Active" },
  { id: "k2", name: "Sandbox Sync Test", key: "nl_test_sand_92ksjdhsuiaw82jd71", created: "2026-05-18", status: "Active" }
];

export const MOCK_WEBHOOKS = [
  { id: "w1", url: "https://api.wealthadvisor.com/v1/nivesh-callback", events: ["portfolio.synced", "risk.alert"], created: "2026-04-01", status: "Active" }
];

// Advisor Clients list
export const MOCK_ADVISOR_CLIENTS: ClientProfile[] = [
  { id: "c_user1", name: "Anubhav Thakur", email: "anubhav@gmail.com", portfolioValue: 3000000.0, gainLoss: 450000.0, gainLossPercent: 17.65, riskScore: 785, hhiScore: 1250, diversificationGrade: "Excellent", feeBleedAnnually: 18520, nomineeStatus: "Partial" },
  { id: "c_user2", name: "Ramesh Sharma", email: "ramesh@outlook.com", portfolioValue: 7500000.0, gainLoss: 890000.0, gainLossPercent: 13.46, riskScore: 540, hhiScore: 3400, diversificationGrade: "Poor", feeBleedAnnually: 68400, nomineeStatus: "Missing" },
  { id: "c_user3", name: "Sneha Patel", email: "sneha.p@yahoo.com", portfolioValue: 1250000.0, gainLoss: 210000.0, gainLossPercent: 20.19, riskScore: 820, hhiScore: 920, diversificationGrade: "Excellent", feeBleedAnnually: 6200, nomineeStatus: "Complete" },
  { id: "c_user4", name: "Vikram Malhotra", email: "vmalhotra@gmail.com", portfolioValue: 4800000.0, gainLoss: -120000.0, gainLossPercent: -2.44, riskScore: 480, hhiScore: 2800, diversificationGrade: "Average", feeBleedAnnually: 32400, nomineeStatus: "Complete" }
];
