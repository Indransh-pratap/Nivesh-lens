import { 
  Holding, 
  CompanyExposureItem,
  ExposureAlert, 
  CrashScenario, 
  PeerBenchmark, 
  CapitalGainsItem, 
  NomineeRecord, 
  ConglomerateGroupData,
  SIPHealthItem,
  FamilyMember,
  IPONFOCheckItem,
  DividendEvent,
  NewsImpactItem,
  ClientProfile,
  AdvisorSettings
} from "@/types";

// Master Holdings Data (Consolidated Portfolio ~₹30,00,000)
export const MOCK_HOLDINGS: Holding[] = [
  {
    id: "h1",
    name: "Reliance Industries Ltd.",
    type: "Stock",
    ticker: "RELIANCE",
    isin: "INE002A01018",
    quantity: 120,
    avgPrice: 2450.0,
    currentPrice: 2840.5,
    currentValue: 340860.0,
    returns: 15.94,
    returnsValue: 46860.0,
    allocation: 11.36,
    riskGrade: "Medium",
    sector: "Energy & Petrochemicals",
    conglomerate: "Reliance / Ambani",
    nomineeStatus: "Verified"
  },
  {
    id: "h2",
    name: "Tata Consultancy Services Ltd.",
    type: "Stock",
    ticker: "TCS",
    isin: "INE467B01029",
    quantity: 65,
    avgPrice: 3200.0,
    currentPrice: 3850.2,
    currentValue: 250263.0,
    returns: 20.32,
    returnsValue: 42263.0,
    allocation: 8.34,
    riskGrade: "Low",
    sector: "Information Technology",
    conglomerate: "Tata Group",
    nomineeStatus: "Verified"
  },
  {
    id: "h3",
    name: "Infosys Ltd.",
    type: "Stock",
    ticker: "INFY",
    isin: "INE009A01021",
    quantity: 110,
    avgPrice: 1520.0,
    currentPrice: 1680.1,
    currentValue: 184811.0,
    returns: 10.53,
    returnsValue: 17611.0,
    allocation: 6.16,
    riskGrade: "Low",
    sector: "Information Technology",
    conglomerate: "Independent",
    nomineeStatus: "Verified"
  },
  {
    id: "h4",
    name: "HDFC Bank Ltd.",
    type: "Stock",
    ticker: "HDFCBANK",
    isin: "INE040A01034",
    quantity: 220,
    avgPrice: 1480.0,
    currentPrice: 1610.7,
    currentValue: 354354.0,
    returns: 8.83,
    returnsValue: 28754.0,
    allocation: 11.81,
    riskGrade: "Low",
    sector: "Financial Services",
    conglomerate: "HDFC Group",
    nomineeStatus: "Verified"
  },
  {
    id: "h5",
    name: "Parag Parikh Flexi Cap Fund - Direct (G)",
    type: "Mutual Fund",
    ticker: "PPFCF",
    isin: "INF879O01027",
    folioNumber: "10984201",
    quantity: 8540.24,
    avgPrice: 52.3,
    currentPrice: 70.25,
    currentValue: 599951.86,
    returns: 34.32,
    returnsValue: 153297.31,
    allocation: 20.00,
    expenseRatio: 0.0063, // 0.63%
    planType: "Direct",
    riskGrade: "Medium",
    sector: "Multi Cap Diversified",
    nomineeStatus: "Verified",
    cagr3Y: 21.4,
    alpha: 4.8,
    beta: 0.76,
    sipActive: true,
    sipAmount: 15000,
    underlyingHoldings: [
      { name: "HDFC Bank Ltd.", ticker: "HDFCBANK", allocation: 8.5, sector: "Financial Services", value: 50995.9 },
      { name: "Reliance Industries Ltd.", ticker: "RELIANCE", allocation: 6.2, sector: "Energy & Petrochemicals", value: 37197.0 },
      { name: "Alphabet Inc. (Google)", ticker: "GOOGL", allocation: 5.4, sector: "Technology & Software", value: 32397.4 },
      { name: "Microsoft Corp.", ticker: "MSFT", allocation: 4.8, sector: "Technology & Software", value: 28797.7 },
      { name: "ITC Ltd.", ticker: "ITC", allocation: 4.1, sector: "Consumer Staples", value: 24598.0 },
      { name: "Bajaj Holdings & Investment Ltd.", ticker: "BAJAJHLDNG", allocation: 3.5, sector: "Financial Services", value: 20998.3 },
      { name: "Tata Consultancy Services Ltd.", ticker: "TCS", allocation: 3.0, sector: "Information Technology", value: 17998.6 },
      { name: "ICICI Bank Ltd.", ticker: "ICICIBANK", allocation: 2.9, sector: "Financial Services", value: 17398.6 }
    ]
  },
  {
    id: "h6",
    name: "ICICI Prudential Bluechip Fund - Regular (G)",
    type: "Mutual Fund",
    ticker: "ICICIBLUE",
    isin: "INF109K01198",
    folioNumber: "45912803",
    quantity: 4520.18,
    avgPrice: 85.1,
    currentPrice: 98.4,
    currentValue: 444785.71,
    returns: 15.63,
    returnsValue: 60118.39,
    allocation: 14.83,
    expenseRatio: 0.0154, // 1.54% (High Regular Plan)
    planType: "Regular",
    riskGrade: "Low",
    sector: "Large Cap",
    nomineeStatus: "Verified",
    cagr3Y: 16.2,
    alpha: 0.8,
    beta: 0.92,
    sipActive: true,
    sipAmount: 10000,
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
    name: "Nippon India Small Cap Fund - Direct (G)",
    type: "Mutual Fund",
    ticker: "NIPSMALL",
    isin: "INF204K01F82",
    folioNumber: "78201945",
    quantity: 1850.55,
    avgPrice: 110.2,
    currentPrice: 148.9,
    currentValue: 275546.89,
    returns: 35.12,
    returnsValue: 71576.28,
    allocation: 9.18,
    expenseRatio: 0.0068, // 0.68%
    planType: "Direct",
    riskGrade: "High",
    sector: "Small Cap",
    nomineeStatus: "Action Required",
    cagr3Y: 28.5,
    alpha: 6.2,
    beta: 1.14,
    sipActive: true,
    sipAmount: 7000,
    underlyingHoldings: [
      { name: "Tube Investments of India Ltd.", ticker: "TIINDIA", allocation: 4.2, sector: "Capital Goods", value: 11572.9 },
      { name: "HDFC Bank Ltd.", ticker: "HDFCBANK", allocation: 3.1, sector: "Financial Services", value: 8541.9 },
      { name: "Krishna Institute of Medical Sciences", ticker: "KIMS", allocation: 2.8, sector: "Healthcare", value: 7715.3 },
      { name: "Reliance Industries Ltd.", ticker: "RELIANCE", allocation: 2.2, sector: "Energy & Petrochemicals", value: 6062.0 },
      { name: "KPIT Technologies", ticker: "KPITTECH", allocation: 3.4, sector: "Information Technology", value: 9368.6 }
    ]
  },
  {
    id: "h8",
    name: "SBI Contra Fund - Regular (G)",
    type: "Mutual Fund",
    ticker: "SBICONTRA",
    isin: "INF200K01460",
    folioNumber: "91024822",
    quantity: 2150.12,
    avgPrice: 205.4,
    currentPrice: 232.8,
    currentValue: 500547.94,
    returns: 13.34,
    returnsValue: 58813.25,
    allocation: 16.68,
    expenseRatio: 0.0162, // 1.62% (Regular Plan)
    planType: "Regular",
    riskGrade: "Medium",
    sector: "Value / Contra",
    nomineeStatus: "Action Required",
    cagr3Y: 24.1,
    alpha: 3.9,
    beta: 0.88,
    sipActive: false,
    underlyingHoldings: [
      { name: "State Bank of India", ticker: "SBIN", allocation: 6.8, sector: "Financial Services", value: 34037.2 },
      { name: "HDFC Bank Ltd.", ticker: "HDFCBANK", allocation: 5.5, sector: "Financial Services", value: 27530.1 },
      { name: "ICICI Bank Ltd.", ticker: "ICICIBANK", allocation: 5.2, sector: "Financial Services", value: 26028.5 },
      { name: "Cognizant Technology Solutions", ticker: "CTSH", allocation: 4.5, sector: "Information Technology", value: 22524.6 },
      { name: "Reliance Industries Ltd.", ticker: "RELIANCE", allocation: 3.8, sector: "Energy & Petrochemicals", value: 19020.8 }
    ]
  },
  {
    id: "h9",
    name: "HDFC Bank 3Y Fixed Deposit",
    type: "FD",
    ticker: "HDFC-FD",
    quantity: 1,
    avgPrice: 50000.0,
    currentPrice: 53750.0,
    currentValue: 53750.0,
    returns: 7.5,
    returnsValue: 3750.0,
    allocation: 1.79,
    riskGrade: "Low",
    sector: "Cash & Fixed Income",
    conglomerate: "HDFC Group",
    nomineeStatus: "Missing"
  },
  {
    id: "h10",
    name: "Bharti Airtel Ltd.",
    type: "Stock",
    ticker: "BHARTIARTL",
    isin: "INE397D01024",
    quantity: 85,
    avgPrice: 980.0,
    currentPrice: 1542.3,
    currentValue: 131095.5,
    returns: 57.38,
    returnsValue: 47795.5,
    allocation: 4.37,
    riskGrade: "Medium",
    sector: "Telecommunications",
    conglomerate: "Bharti Group",
    nomineeStatus: "Verified"
  },
  {
    id: "h11",
    name: "Larsen & Toubro Ltd.",
    type: "Stock",
    ticker: "LT",
    isin: "INE018A01030",
    quantity: 40,
    avgPrice: 2900.0,
    currentPrice: 3540.8,
    currentValue: 141632.0,
    returns: 22.09,
    returnsValue: 25632.0,
    allocation: 4.72,
    riskGrade: "Medium",
    sector: "Construction & Infrastructure",
    conglomerate: "Independent",
    nomineeStatus: "Verified"
  },
  {
    id: "h12",
    name: "State Bank of India",
    type: "Stock",
    ticker: "SBIN",
    isin: "INE062A01020",
    quantity: 150,
    avgPrice: 610.0,
    currentPrice: 812.4,
    currentValue: 121860.0,
    returns: 33.18,
    returnsValue: 30360.0,
    allocation: 4.06,
    riskGrade: "Medium",
    sector: "Financial Services",
    conglomerate: "Independent",
    nomineeStatus: "Verified"
  },
  {
    id: "h13",
    name: "Titan Company Ltd.",
    type: "Stock",
    ticker: "TITAN",
    isin: "INE280A01028",
    quantity: 32,
    avgPrice: 2850.0,
    currentPrice: 3402.6,
    currentValue: 108883.2,
    returns: 19.39,
    returnsValue: 17683.2,
    allocation: 3.63,
    riskGrade: "Medium",
    sector: "Consumer Durables",
    conglomerate: "Tata Group",
    nomineeStatus: "Action Required"
  },
  {
    id: "h14",
    name: "Mirae Asset Emerging Bluechip Fund - Direct (G)",
    type: "Mutual Fund",
    ticker: "MIRAEEBC",
    isin: "INF769K01AA9",
    folioNumber: "63201884",
    quantity: 3120.45,
    avgPrice: 68.4,
    currentPrice: 92.1,
    currentValue: 287453.4,
    returns: 34.65,
    returnsValue: 74044.7,
    allocation: 9.58,
    expenseRatio: 0.0058,
    planType: "Direct",
    riskGrade: "Medium",
    sector: "Large & Mid Cap",
    nomineeStatus: "Verified",
    cagr3Y: 22.8,
    alpha: 5.1,
    beta: 0.98,
    sipActive: true,
    sipAmount: 12000,
    underlyingHoldings: [
      { name: "HDFC Bank Ltd.", ticker: "HDFCBANK", allocation: 7.4, sector: "Financial Services", value: 21271.5 },
      { name: "Bharti Airtel Ltd.", ticker: "BHARTIARTL", allocation: 5.8, sector: "Telecommunications", value: 16672.3 },
      { name: "Larsen & Toubro Ltd.", ticker: "LT", allocation: 4.6, sector: "Construction & Infrastructure", value: 13222.9 },
      { name: "Reliance Industries Ltd.", ticker: "RELIANCE", allocation: 4.2, sector: "Energy & Petrochemicals", value: 12073.0 }
    ]
  },
  {
    id: "h15",
    name: "Kotak Emerging Equity Fund - Regular (G)",
    type: "Mutual Fund",
    ticker: "KOTAKEEF",
    isin: "INF174K01BJ0",
    folioNumber: "72094512",
    quantity: 2840.12,
    avgPrice: 74.2,
    currentPrice: 88.6,
    currentValue: 251633.0,
    returns: 19.41,
    returnsValue: 40908.0,
    allocation: 8.39,
    expenseRatio: 0.0175,
    planType: "Regular",
    riskGrade: "Medium",
    sector: "Mid Cap",
    nomineeStatus: "Action Required",
    cagr3Y: 19.6,
    alpha: 1.2,
    beta: 1.05,
    sipActive: true,
    sipAmount: 8000,
    underlyingHoldings: [
      { name: "Titan Company Ltd.", ticker: "TITAN", allocation: 3.9, sector: "Consumer Durables", value: 9813.7 },
      { name: "State Bank of India", ticker: "SBIN", allocation: 3.5, sector: "Financial Services", value: 8807.2 },
      { name: "ICICI Bank Ltd.", ticker: "ICICIBANK", allocation: 3.1, sector: "Financial Services", value: 7800.6 }
    ]
  },
  {
    id: "h16",
    name: "Sovereign Gold Bond 2029 Series III",
    type: "Gold",
    ticker: "SGB-2029",
    quantity: 25,
    avgPrice: 5420.0,
    currentPrice: 7180.0,
    currentValue: 179500.0,
    returns: 32.47,
    returnsValue: 44000.0,
    allocation: 5.98,
    riskGrade: "Low",
    sector: "Precious Metals",
    conglomerate: "Government of India",
    nomineeStatus: "Verified"
  },
  {
    id: "h17",
    name: "Employee Provident Fund",
    type: "EPF",
    ticker: "EPF",
    quantity: 1,
    avgPrice: 285000.0,
    currentPrice: 312400.0,
    currentValue: 312400.0,
    returns: 9.61,
    returnsValue: 27400.0,
    allocation: 10.41,
    riskGrade: "Low",
    sector: "Retirement Savings",
    conglomerate: "Government of India",
    nomineeStatus: "Verified"
  }
];

// Calculated True Company Exposures (Direct + MF Look-through)
export const MOCK_COMPANY_EXPOSURES: CompanyExposureItem[] = [
  {
    id: "exp_1",
    companyName: "HDFC Bank Ltd.",
    ticker: "HDFCBANK",
    sector: "Financial Services",
    conglomerateGroup: "HDFC Group",
    directValue: 354354.0,
    directPercent: 11.81,
    indirectValue: 121761.2,
    indirectPercent: 4.06,
    totalTrueValue: 476115.2,
    totalTruePercent: 15.87,
    riskCategory: "High Danger",
    promoterPledging: 0.0,
    fiiHolding: 54.2,
    supplyChainVulnerability: "High dependency on domestic retail loan growth & deposit franchise costs.",
    heldViaFunds: [
      { fundName: "Parag Parikh Flexi Cap", fundTicker: "PPFCF", fundAllocation: 8.5, indirectValue: 50995.9 },
      { fundName: "ICICI Bluechip", fundTicker: "ICICIBLUE", fundAllocation: 7.8, indirectValue: 34693.3 },
      { fundName: "SBI Contra", fundTicker: "SBICONTRA", fundAllocation: 5.5, indirectValue: 27530.1 },
      { fundName: "Nippon Small Cap", fundTicker: "NIPSMALL", fundAllocation: 3.1, indirectValue: 8541.9 }
    ]
  },
  {
    id: "exp_2",
    companyName: "Reliance Industries Ltd.",
    ticker: "RELIANCE",
    sector: "Energy & Petrochemicals",
    conglomerateGroup: "Reliance / Ambani",
    directValue: 340860.0,
    directPercent: 11.36,
    indirectValue: 98307.4,
    indirectPercent: 3.28,
    totalTrueValue: 439167.4,
    totalTruePercent: 14.64,
    riskCategory: "High Danger",
    promoterPledging: 0.0,
    fiiHolding: 22.4,
    supplyChainVulnerability: "Subject to global crude refining margins (GRM) & telecomm ARPU competition.",
    heldViaFunds: [
      { fundName: "Parag Parikh Flexi Cap", fundTicker: "PPFCF", fundAllocation: 6.2, indirectValue: 37197.0 },
      { fundName: "ICICI Bluechip", fundTicker: "ICICIBLUE", fundAllocation: 8.1, indirectValue: 36027.6 },
      { fundName: "SBI Contra", fundTicker: "SBICONTRA", fundAllocation: 3.8, indirectValue: 19020.8 },
      { fundName: "Nippon Small Cap", fundTicker: "NIPSMALL", fundAllocation: 2.2, indirectValue: 6062.0 }
    ]
  },
  {
    id: "exp_3",
    companyName: "Tata Consultancy Services Ltd.",
    ticker: "TCS",
    sector: "Information Technology",
    conglomerateGroup: "Tata Group",
    directValue: 250263.0,
    directPercent: 8.34,
    indirectValue: 38014.0,
    indirectPercent: 1.27,
    totalTrueValue: 288277.0,
    totalTruePercent: 9.61,
    riskCategory: "Elevated Warning",
    promoterPledging: 0.0,
    fiiHolding: 12.8,
    supplyChainVulnerability: "Vulnerable to North American BFSI IT spend slowdown & H1B visa wage policies.",
    heldViaFunds: [
      { fundName: "ICICI Bluechip", fundTicker: "ICICIBLUE", fundAllocation: 4.5, indirectValue: 20015.4 },
      { fundName: "Parag Parikh Flexi Cap", fundTicker: "PPFCF", fundAllocation: 3.0, indirectValue: 17998.6 }
    ]
  },
  {
    id: "exp_4",
    companyName: "Infosys Ltd.",
    ticker: "INFY",
    sector: "Information Technology",
    conglomerateGroup: "Independent",
    directValue: 184811.0,
    directPercent: 6.16,
    indirectValue: 28911.1,
    indirectPercent: 0.96,
    totalTrueValue: 213722.1,
    totalTruePercent: 7.12,
    riskCategory: "Safe / Optimal",
    promoterPledging: 0.0,
    fiiHolding: 33.1,
    supplyChainVulnerability: "Discretionary cloud migration budgeting cycles in US & Europe.",
    heldViaFunds: [
      { fundName: "ICICI Bluechip", fundTicker: "ICICIBLUE", fundAllocation: 6.5, indirectValue: 28911.1 }
    ]
  },
  {
    id: "exp_5",
    companyName: "ICICI Bank Ltd.",
    ticker: "ICICIBANK",
    sector: "Financial Services",
    conglomerateGroup: "ICICI Group",
    directValue: 0.0,
    directPercent: 0.0,
    indirectValue: 84347.4,
    indirectPercent: 2.81,
    totalTrueValue: 84347.4,
    totalTruePercent: 2.81,
    riskCategory: "Safe / Optimal",
    promoterPledging: 0.0,
    fiiHolding: 44.9,
    supplyChainVulnerability: "Asset quality trends in unsecured retail loans & SME credit.",
    heldViaFunds: [
      { fundName: "ICICI Bluechip", fundTicker: "ICICIBLUE", fundAllocation: 9.2, indirectValue: 40920.3 },
      { fundName: "SBI Contra", fundTicker: "SBICONTRA", fundAllocation: 5.2, indirectValue: 26028.5 },
      { fundName: "Parag Parikh Flexi Cap", fundTicker: "PPFCF", fundAllocation: 2.9, indirectValue: 17398.6 }
    ]
  },
  {
    id: "exp_6",
    companyName: "State Bank of India",
    ticker: "SBIN",
    sector: "Financial Services",
    conglomerateGroup: "PSU / Govt",
    directValue: 0.0,
    directPercent: 0.0,
    indirectValue: 34037.2,
    indirectPercent: 1.13,
    totalTrueValue: 34037.2,
    totalTruePercent: 1.13,
    riskCategory: "Safe / Optimal",
    promoterPledging: 0.0,
    fiiHolding: 11.2,
    supplyChainVulnerability: "Government sovereign lending mandates & corporate capex cycles.",
    heldViaFunds: [
      { fundName: "SBI Contra", fundTicker: "SBICONTRA", fundAllocation: 6.8, indirectValue: 34037.2 }
    ]
  },
  {
    id: "exp_7",
    companyName: "Alphabet Inc. (Google)",
    ticker: "GOOGL",
    sector: "Technology & Software",
    conglomerateGroup: "US Mega Tech",
    directValue: 0.0,
    directPercent: 0.0,
    indirectValue: 32397.4,
    indirectPercent: 1.08,
    totalTrueValue: 32397.4,
    totalTruePercent: 1.08,
    riskCategory: "Safe / Optimal",
    promoterPledging: 0.0,
    fiiHolding: 68.0,
    supplyChainVulnerability: "Digital advertising cyclicality and global antitrust regulations.",
    heldViaFunds: [
      { fundName: "Parag Parikh Flexi Cap", fundTicker: "PPFCF", fundAllocation: 5.4, indirectValue: 32397.4 }
    ]
  }
];

// Conglomerate Group Concentration
export const MOCK_CONGLOMERATES: ConglomerateGroupData[] = [
  {
    id: "cg_1",
    groupName: "HDFC Group",
    totalValue: 529865.2,
    totalPercentage: 17.66,
    riskStatus: "Elevated",
    companies: [
      { name: "HDFC Bank Ltd. (Direct + MFs)", ticker: "HDFCBANK", value: 476115.2, percentage: 15.87, heldVia: "Direct + 4 Funds" },
      { name: "HDFC Fixed Deposit", ticker: "HDFC-FD", value: 53750.0, percentage: 1.79, heldVia: "Direct FD" }
    ]
  },
  {
    id: "cg_2",
    groupName: "Reliance Industries (Ambani)",
    totalValue: 439167.4,
    totalPercentage: 14.64,
    riskStatus: "Elevated",
    companies: [
      { name: "Reliance Industries (Oil, Retail, Jio)", ticker: "RELIANCE", value: 439167.4, percentage: 14.64, heldVia: "Direct + 4 Funds" }
    ]
  },
  {
    id: "cg_3",
    groupName: "Tata Group",
    totalValue: 288277.0,
    totalPercentage: 9.61,
    riskStatus: "Normal",
    companies: [
      { name: "Tata Consultancy Services (TCS)", ticker: "TCS", value: 288277.0, percentage: 9.61, heldVia: "Direct + 2 Funds" }
    ]
  },
  {
    id: "cg_4",
    groupName: "ICICI Group",
    totalValue: 84347.4,
    totalPercentage: 2.81,
    riskStatus: "Normal",
    companies: [
      { name: "ICICI Bank Ltd.", ticker: "ICICIBANK", value: 84347.4, percentage: 2.81, heldVia: "3 Funds" }
    ]
  }
];

// Exposure Alerts
export const MOCK_ALERTS: ExposureAlert[] = [
  {
    id: "a1",
    type: "Danger",
    category: "Concentration",
    title: "Heavy Double-Dipping: HDFC Bank Exposure (15.87%)",
    description: "You hold ₹3.54L of HDFC Bank directly and another ₹1.21L secretly inside 4 different Mutual Funds. Total capital tied to one lender is ₹4.76 Lakhs.",
    impactScore: "-35 Health Pts",
    date: "10 mins ago"
  },
  {
    id: "a2",
    type: "Danger",
    category: "Fee",
    title: "Regular Plan Commission Bleed: ₹24,800/yr",
    description: "ICICI Bluechip & SBI Contra are in Regular Plan distributors mode with 1.54%+ TER. Switching to Direct saves ₹2.48L over 7 years.",
    impactScore: "Save ₹24,800/yr",
    date: "25 mins ago"
  },
  {
    id: "a3",
    type: "Warning",
    category: "Overlap",
    title: "High Fund Overlap: 42% Common Stock Portfolio",
    description: "Parag Parikh Flexi Cap and ICICI Bluechip hold almost identical banking and IT giants. You are paying double fund manager fees for clone portfolios.",
    impactScore: "Overlap 42%",
    date: "2 hours ago"
  },
  {
    id: "a4",
    type: "Warning",
    category: "Nominee",
    title: "Nominee Missing on 2 Mutual Fund Folios & FD",
    description: "SBI Contra, Nippon Small Cap, and HDFC FD have no verified nominee. Assets risk being locked in probate under SEBI guidelines.",
    impactScore: "Critical Legal",
    date: "1 day ago"
  },
  {
    id: "a5",
    type: "Info",
    category: "StyleDrift",
    title: "Style Drift Warning: SBI Contra Momentum Drift",
    description: "SBI Contra has recently added momentum tech holdings, drifting away from its core value mandate.",
    impactScore: "Watchlist",
    date: "2 days ago"
  },
  {
    id: "a6",
    type: "Success",
    category: "PanicGuard",
    title: "Panic Guard: Strong V-Shape Recovery History",
    description: "During 2020 COVID (-38%) and 2008 GFC, resilient diversified portfolios recovered 100% of losses within 8 to 28 months.",
    impactScore: "Emotional Shield",
    date: "3 days ago"
  }
];

// Correlation Matrix Data (Daily NAV correlation from mfapi.in)
export const MOCK_CORRELATION_FUNDS = [
  "PPFCF (Flexi)",
  "ICICIBLUE (Large)",
  "SBICONTRA (Value)",
  "NIPSMALL (Small)",
  "RELIANCE (Stock)",
  "HDFCBANK (Stock)"
];

export const MOCK_CORRELATION_MATRIX = [
  [1.00, 0.78, 0.65, 0.42, 0.58, 0.62],
  [0.78, 1.00, 0.81, 0.49, 0.72, 0.89],
  [0.65, 0.81, 1.00, 0.54, 0.66, 0.74],
  [0.42, 0.49, 0.54, 1.00, 0.35, 0.38],
  [0.58, 0.72, 0.66, 0.35, 1.00, 0.45],
  [0.62, 0.89, 0.74, 0.38, 0.45, 1.00]
];

// Historical Crash Simulator Scenarios
export const MOCK_CRASH_SCENARIOS: CrashScenario[] = [
  {
    id: "c1",
    name: "2020 COVID Market Crash",
    dateRange: "Feb 2020 - Apr 2020",
    marketDrop: -38.2,
    portfolioImpact: -24.8,
    estimatedLossRupees: -744000,
    recoveryMonths: 8,
    description: "Worldwide pandemic lockdown triggered swift liquidity selloff. Rapid V-shaped recovery followed by massive technology and retail expansion.",
    historicalNiftyPoints: [
      { month: "Jan 20", nifty: 12350, portfolio: 3000000 },
      { month: "Feb 20", nifty: 11200, portfolio: 2750000 },
      { month: "Mar 20", nifty: 7610, portfolio: 2256000 },
      { month: "Jun 20", nifty: 10300, portfolio: 2680000 },
      { month: "Oct 20", nifty: 12400, portfolio: 3050000 },
      { month: "Dec 20", nifty: 13980, portfolio: 3420000 }
    ]
  },
  {
    id: "c2",
    name: "2008 Global Financial Crisis (Lehman)",
    dateRange: "Jan 2008 - Mar 2009",
    marketDrop: -52.6,
    portfolioImpact: -36.2,
    estimatedLossRupees: -1086000,
    recoveryMonths: 28,
    description: "Global credit freeze and banking collapse. High financial sector weight suffered heavy drawdown, but bluechip equities fully recovered within 2.3 years.",
    historicalNiftyPoints: [
      { month: "Jan 08", nifty: 6280, portfolio: 3000000 },
      { month: "Jun 08", nifty: 4040, portfolio: 2240000 },
      { month: "Oct 08", nifty: 2520, portfolio: 1914000 },
      { month: "May 09", nifty: 4400, portfolio: 2450000 },
      { month: "Nov 09", nifty: 5100, portfolio: 2780000 },
      { month: "May 10", nifty: 6300, portfolio: 3100000 }
    ]
  },
  {
    id: "c3",
    name: "2022 Tech & Rate Hike Shock",
    dateRange: "Jan 2022 - Oct 2022",
    marketDrop: -22.4,
    portfolioImpact: -15.1,
    estimatedLossRupees: -453000,
    recoveryMonths: 14,
    description: "Rapid US Fed and RBI interest rate hikes to fight global inflation punished high-multiple growth equities.",
    historicalNiftyPoints: [
      { month: "Jan 22", nifty: 18300, portfolio: 3000000 },
      { month: "Mar 22", nifty: 16240, portfolio: 2740000 },
      { month: "Jun 22", nifty: 15290, portfolio: 2547000 },
      { month: "Sep 22", nifty: 17800, portfolio: 2890000 },
      { month: "Dec 22", nifty: 18800, portfolio: 3120000 }
    ]
  },
  {
    id: "c4",
    name: "2016 Demonetization Shock",
    dateRange: "Nov 2016 - Feb 2017",
    marketDrop: -12.8,
    portfolioImpact: -8.4,
    estimatedLossRupees: -252000,
    recoveryMonths: 5,
    description: "Sudden withdrawal of 86% high-denomination currency caused temporary consumer demand slowdown, followed by swift formalisation rally.",
    historicalNiftyPoints: [
      { month: "Oct 16", nifty: 8650, portfolio: 3000000 },
      { month: "Nov 16", nifty: 7920, portfolio: 2748000 },
      { month: "Dec 16", nifty: 8100, portfolio: 2830000 },
      { month: "Feb 17", nifty: 8900, portfolio: 3080000 },
      { month: "Apr 17", nifty: 9300, portfolio: 3240000 }
    ]
  }
];

// SIP Health Audit Data
export const MOCK_SIP_AUDIT: SIPHealthItem[] = [
  {
    id: "sip_1",
    fundName: "Parag Parikh Flexi Cap Fund",
    ticker: "PPFCF",
    monthlyAmount: 15000,
    totalInvested: 360000,
    currentValue: 599951,
    rolling3YReturn: 21.4,
    benchmarkReturn: 14.8,
    alpha: 6.6,
    grade: "A+",
    status: "Outperformer",
    recommendation: "High alpha generation with global tech exposure. Maintain current monthly SIP."
  },
  {
    id: "sip_2",
    fundName: "Nippon India Small Cap Fund",
    ticker: "NIPSMALL",
    monthlyAmount: 7000,
    totalInvested: 168000,
    currentValue: 275546,
    rolling3YReturn: 28.5,
    benchmarkReturn: 22.1,
    alpha: 6.4,
    grade: "A",
    status: "Outperformer",
    recommendation: "Solid small cap compounding. Monitor small-cap valuation run-up."
  },
  {
    id: "sip_3",
    fundName: "ICICI Prudential Bluechip Fund",
    ticker: "ICICIBLUE",
    monthlyAmount: 10000,
    totalInvested: 240000,
    currentValue: 444785,
    rolling3YReturn: 15.6,
    benchmarkReturn: 15.1,
    alpha: 0.5,
    grade: "C",
    status: "Underperformer",
    recommendation: "Trailing Nifty 50 TRI while charging high Regular TER (1.54%). 1-Click switch to Low-Cost Nifty 50 Index recommended.",
    suggestedSwitch: {
      replacementFund: "UTI Nifty 50 Index Fund (Direct)",
      replacementTicker: "UTINIFTY",
      terDifference: "Save 1.34% TER Annually",
      historicalAlphaDiff: "+1.8% Net After Fees"
    }
  }
];

// Family Portfolio Members
export const MOCK_FAMILY_MEMBERS: FamilyMember[] = [
  {
    id: "fam_1",
    name: "Anubhav Thakur",
    relation: "Self",
    panMasked: "ABCDE****F",
    portfolioValue: 3000000.0,
    totalGain: 450000.0,
    gainPercent: 17.65,
    healthScore: 742,
    holdingsCount: 9,
    topStock: "HDFC Bank (15.8%)",
    color: "#4f8cff"
  },
  {
    id: "fam_2",
    name: "Pooja Thakur",
    relation: "Spouse",
    panMasked: "BCDEF****G",
    portfolioValue: 1450000.0,
    totalGain: 280000.0,
    gainPercent: 23.93,
    healthScore: 810,
    holdingsCount: 6,
    topStock: "TCS (18.2%)",
    color: "#35c878"
  },
  {
    id: "fam_3",
    name: "Ramendra Thakur",
    relation: "Father",
    panMasked: "CDEFG****H",
    portfolioValue: 2100000.0,
    totalGain: 190000.0,
    gainPercent: 9.95,
    healthScore: 680,
    holdingsCount: 8,
    topStock: "Reliance Industries (24.1%)",
    color: "#f59e0b"
  }
];

// Tax-Aware Capital Gains Roadmap
export const MOCK_TAX_ITEMS: CapitalGainsItem[] = [
  {
    id: "tax_1",
    assetName: "Infosys Ltd.",
    gainType: "STCG",
    purchaseDate: "2026-03-10",
    sellDate: "2026-08-01",
    sellValue: 25200.0,
    gainAmount: -12400.0,
    taxRate: 0.20, // Budget 2024 revised STCG @ 20%
    taxOwed: -2480.0,
    exitLoadApplicable: false,
    exitLoadFee: 0,
    recommendation: "Harvest Loss Now"
  },
  {
    id: "tax_2",
    assetName: "Reliance Industries Ltd.",
    gainType: "LTCG",
    purchaseDate: "2022-04-10",
    sellDate: "2026-08-01",
    sellValue: 120000.0,
    gainAmount: 48000.0,
    taxRate: 0.125, // Budget 2024 LTCG @ 12.5%
    taxOwed: 0.0, // Within annual ₹1.25L exemption!
    exitLoadApplicable: false,
    exitLoadFee: 0,
    recommendation: "Sell Partial under Exemption"
  },
  {
    id: "tax_3",
    assetName: "SBI Contra Fund",
    gainType: "STCG",
    purchaseDate: "2026-02-18",
    sellDate: "2026-08-01",
    sellValue: 150000.0,
    gainAmount: 22000.0,
    taxRate: 0.20,
    taxOwed: 4400.0,
    exitLoadApplicable: true,
    exitLoadFee: 1500.0, // 1% exit load before 1 year
    recommendation: "Hold till LTCG"
  }
];

// Nominees Audit
export const MOCK_NOMINEES: NomineeRecord[] = [
  { id: "n1", accountName: "Zerodha Demat (12081600...)", accountType: "Demat (Zerodha)", folioNumber: "120816000281", nomineeName: "Pooja Thakur", relationship: "Spouse", allocation: 100, status: "Verified", verificationMethod: "DigiLocker e-Sign", lastUpdated: "2026-01-15" },
  { id: "n2", accountName: "Groww Demat (12088700...)", accountType: "Demat (Groww)", folioNumber: "120887009182", nomineeName: "Aarav Thakur", relationship: "Child", allocation: 100, status: "Verified", verificationMethod: "Aadhaar OTP", lastUpdated: "2025-11-20" },
  { id: "n3", accountName: "Parag Parikh Flexi Cap", accountType: "Mutual Fund (CAMS)", folioNumber: "10984201", nomineeName: "Pooja Thakur", relationship: "Spouse", allocation: 100, status: "Verified", verificationMethod: "CAMS Online", lastUpdated: "2026-02-10" },
  { id: "n4", accountName: "SBI Contra Fund", accountType: "Mutual Fund (KFintech)", folioNumber: "91024822", nomineeName: "Unassigned", relationship: "Unassigned", allocation: 0, status: "Action Required", lastUpdated: "Never Updated" },
  { id: "n5", accountName: "Nippon Small Cap Fund", accountType: "Mutual Fund (KFintech)", folioNumber: "78201945", nomineeName: "Unassigned", relationship: "Unassigned", allocation: 0, status: "Action Required", lastUpdated: "Never Updated" },
  { id: "n6", accountName: "HDFC Bank 3Y Fixed Deposit", accountType: "Bank FD", folioNumber: "FD-9842109", nomineeName: "Unassigned", relationship: "Unassigned", allocation: 0, status: "Action Required", lastUpdated: "Created 2024" }
];

// IPO & NFO Overlap Guard
export const MOCK_IPO_GUARD: IPONFOCheckItem[] = [
  {
    id: "ipo_1",
    name: "Swiggy Ltd. IPO",
    type: "IPO",
    issuePrice: "₹371 - ₹390",
    issueDate: "Upcoming / Active",
    category: "Consumer Tech / Quick Commerce",
    overlapPercent: 8.4,
    overlappingHoldings: [
      { holdingName: "Prosus NV / Naspers", viaFund: "Parag Parikh Flexi Cap", existingExposurePercent: 4.8 },
      { holdingName: "SoftBank Tech holdings", viaFund: "Nippon Small Cap", existingExposurePercent: 3.6 }
    ],
    verdict: "Moderate Overlap",
    rationale: "You already have ~₹42,000 indirect exposure to Quick Commerce logistics through flexi-cap international allocations."
  },
  {
    id: "ipo_2",
    name: "Hyundai Motor India IPO",
    type: "IPO",
    issuePrice: "₹1,865 - ₹1,960",
    issueDate: "Completed / Listing",
    category: "Automotive OEM",
    overlapPercent: 1.2,
    overlappingHoldings: [
      { holdingName: "Tube Investments of India", viaFund: "Nippon Small Cap", existingExposurePercent: 1.2 }
    ],
    verdict: "Unique / Clean Addition",
    rationale: "Low portfolio overlap. Introduces fresh passenger vehicle OEM exposure not heavily duplicated in your current portfolio."
  },
  {
    id: "ipo_3",
    name: "NTPC Green Energy Ltd. IPO",
    type: "IPO",
    issuePrice: "₹102 - ₹108",
    issueDate: "Upcoming",
    category: "Renewable Energy PSU",
    overlapPercent: 14.8,
    overlappingHoldings: [
      { holdingName: "NTPC Ltd. Parent", viaFund: "SBI Contra", existingExposurePercent: 3.8 },
      { holdingName: "Reliance Green Hydrogen", viaFund: "Direct + Bluechip", existingExposurePercent: 11.0 }
    ],
    verdict: "High Duplicate Exposure",
    rationale: "Heavy redundancy with your existing energy & PSU allocations (Reliance 14.6% + SBI Contra PSU holdings)."
  }
];

// Upcoming Dividend Calendar (12 Months)
export const MOCK_DIVIDENDS: DividendEvent[] = [
  { id: "div_1", companyName: "Tata Consultancy Services Ltd.", ticker: "TCS", exDate: "2026-10-18", recordDate: "2026-10-19", payoutDate: "2026-11-04", dividendPerShare: 28.0, sharesHeld: 65, totalDividend: 1820.0, dividendYield: 1.2, status: "Announced" },
  { id: "div_2", companyName: "Reliance Industries Ltd.", ticker: "RELIANCE", exDate: "2026-08-28", recordDate: "2026-08-30", payoutDate: "2026-09-15", dividendPerShare: 10.0, sharesHeld: 120, totalDividend: 1200.0, dividendYield: 0.4, status: "Announced" },
  { id: "div_3", companyName: "Infosys Ltd.", ticker: "INFY", exDate: "2026-10-25", recordDate: "2026-10-28", payoutDate: "2026-11-12", dividendPerShare: 18.5, sharesHeld: 110, totalDividend: 2035.0, dividendYield: 1.8, status: "Estimated" },
  { id: "div_4", companyName: "HDFC Bank Ltd.", ticker: "HDFCBANK", exDate: "2027-05-14", recordDate: "2027-05-16", payoutDate: "2027-06-02", dividendPerShare: 19.5, sharesHeld: 220, totalDividend: 4290.0, dividendYield: 1.4, status: "Estimated" },
  { id: "div_5", companyName: "ITC Ltd. (Indirect via PPFCF)", ticker: "ITC", exDate: "2027-02-12", recordDate: "2027-02-15", payoutDate: "2027-02-28", dividendPerShare: 6.25, sharesHeld: 80, totalDividend: 500.0, dividendYield: 3.1, status: "Estimated" }
];

// News & Portfolio Impact Alerts
export const MOCK_NEWS_IMPACTS: NewsImpactItem[] = [
  {
    id: "news_1",
    headline: "RBI leaves Repo Rate unchanged at 6.50%; Signals stance shift to neutral",
    source: "Bloomberg / Mint",
    timestamp: "1 hour ago",
    ticker: "HDFCBANK",
    companyName: "HDFC Bank & Financials",
    sector: "Financial Services",
    sentiment: "Bullish",
    companyImpactPercent: +2.4,
    portfolioImpactPercent: +0.76,
    summary: "Rate neutrality relieves margin compression on banking deposits and boosts loan book valuations.",
    actionNudge: "No action needed. Favorable for your 34% banking allocation."
  },
  {
    id: "news_2",
    headline: "Govt revises windfall tax on crude petroleum production down to zero",
    source: "Economic Times",
    timestamp: "3 hours ago",
    ticker: "RELIANCE",
    companyName: "Reliance Industries Ltd.",
    sector: "Energy & Petrochemicals",
    sentiment: "Bullish",
    companyImpactPercent: +1.8,
    portfolioImpactPercent: +0.26,
    summary: "Zero windfall duty expands gross refining margins (GRM) for domestic refiners immediately.",
    actionNudge: "Positive for Reliance (14.6% true exposure)."
  },
  {
    id: "news_3",
    headline: "US Tech Giants signal cautious Q3 enterprise cloud spending guidance",
    source: "Reuters",
    timestamp: "6 hours ago",
    ticker: "TCS, INFY",
    companyName: "TCS & Infosys",
    sector: "Information Technology",
    sentiment: "Bearish",
    companyImpactPercent: -1.5,
    portfolioImpactPercent: -0.24,
    summary: "Slow client decision cycles may trim short-term revenue growth for Tier-1 Indian IT exporters.",
    actionNudge: "Hold position; IT valuations already factor in conservative guidance."
  }
];

// Peer Benchmarks
export const MOCK_PEER_BENCHMARKS: PeerBenchmark[] = [
  { category: "3Y Portfolio CAGR", portfolio: 18.5, average: 13.8, top10Percent: 22.4, unit: "%" },
  { category: "Diversification Health Rating", portfolio: 742, average: 610, top10Percent: 820, unit: "Score" },
  { category: "Sharpe Ratio (Risk-Adjusted)", portfolio: 1.42, average: 0.95, top10Percent: 1.78, unit: "Ratio" },
  { category: "Fee Efficiency (Lower TER %)", portfolio: 0.94, average: 1.35, top10Percent: 0.48, unit: "%" },
  { category: "HHI Concentration (Lower=Better)", portfolio: 1420, average: 2150, top10Percent: 950, unit: "HHI" }
];

// Advisor White-Label Mock Client Profiles
export const MOCK_ADVISOR_CLIENTS: ClientProfile[] = [
  { id: "c_user1", name: "Anubhav Thakur", email: "anubhav.thakur@gmail.com", phone: "+91 98765 43210", portfolioValue: 3000000.0, gainLoss: 450000.0, gainLossPercent: 17.65, riskScore: 742, hhiScore: 1420, diversificationGrade: "Good", feeBleedAnnually: 24800, nomineeStatus: "Partial", lastAuditDate: "2026-08-10" },
  { id: "c_user2", name: "Ramesh Sharma", email: "ramesh.sharma@outlook.com", phone: "+91 98112 34567", portfolioValue: 7500000.0, gainLoss: 890000.0, gainLossPercent: 13.46, riskScore: 540, hhiScore: 3400, diversificationGrade: "Poor", feeBleedAnnually: 68400, nomineeStatus: "Missing", lastAuditDate: "2026-07-28" },
  { id: "c_user3", name: "Sneha Patel", email: "sneha.patel@yahoo.com", phone: "+91 99201 88776", portfolioValue: 1250000.0, gainLoss: 210000.0, gainLossPercent: 20.19, riskScore: 820, hhiScore: 920, diversificationGrade: "Excellent", feeBleedAnnually: 6200, nomineeStatus: "Complete", lastAuditDate: "2026-08-14" },
  { id: "c_user4", name: "Vikram Malhotra", email: "vmalhotra@gmail.com", phone: "+91 97654 11223", portfolioValue: 4800000.0, gainLoss: -120000.0, gainLossPercent: -2.44, riskScore: 480, hhiScore: 2800, diversificationGrade: "Average", feeBleedAnnually: 32400, nomineeStatus: "Complete", lastAuditDate: "2026-08-01" }
];

export const DEFAULT_ADVISOR_SETTINGS: AdvisorSettings = {
  firmName: "Apex Wealth Advisory & Partners",
  advisorName: "Vikram Singhania, CFA",
  arnNumber: "ARN-184920",
  sebiReg: "INZ00029381 / INA00001482",
  email: "vikram@apexwealth.in",
  phone: "+91 98200 12345",
  website: "www.apexwealth.in",
  brandPrimaryColor: "#4f8cff",
  logoText: "APEX WEALTH",
  disclaimer: "Confidential Client Diagnostic prepared by Apex Wealth Partners using Nivesh Lens X-Ray Engine. Past performance is not indicative of future returns. Mutual fund investments are subject to market risks."
};
