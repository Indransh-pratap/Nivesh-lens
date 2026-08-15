 project structure .

 frotnend

 src/
├── app/                  # Next.js App Router Pages
│   ├── (auth)/           # Authentication routes (login, signup, OTP, etc.)
│   ├── (dashboard)/      # Authenticated dashboard workspace
│   │   ├── dashboard/    # Main portfolio metrics and summary charts
│   │   ├── portfolio/    # Detail Holdings Table (expandable stocks/funds)
│   │   ├── diagnostics/  # Overlap, CAS upload, fee audit, diversification, nominee
│   │   ├── simulator/    # Crash testing, what-if, macro risk, correlation matrix
│   │   ├── advanced/     # Tax, WhatsApp AI, behavioral warnings, conglomerate exposure
│   │   ├── advisor/      # B2B Advisor dashboard
│   │   ├── developer/    # API/SDK Webhook & Developer portal
│   │   ├── reports/      # PDF-style client reports
│   │   └── settings/     # Profile, security, notifications, accounts
│   ├── layout.tsx        # App-wide root layout
│   └── page.tsx          # Premium Landing Page (Hero, Features, Pricing, Testimonials)
├── components/           # Reusable generic UI components (Card, Table, Toast, etc.)
├── features/             # Feature-specific components and sub-modules
├── services/             # Abstract API/mock service layer
├── hooks/                # Custom React hooks (theme, viewport, search)
├── lib/                  # Utilities (class merger, formatters, calculations)
├── types/                # TypeScript interface definitions
├── constants/            # Constants (color codes, route tables)
├── data/                 # Mock JSON data store

└── store/                # Zustand global state (auth, portfolio, settings)




portfolio-xray/
│
├── frontend/                         # Next.js 15
│   │
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── signup/
│   │   │   │       └── page.tsx
│   │   │   │
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   ├── portfolio/
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   ├── upload/
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   ├── api/
│   │   │   │   └── auth/
│   │   │   │
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   │
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── portfolio/
│   │   │   └── upload/
│   │   │
│   │   ├── lib/
│   │   │   ├── auth.ts
│   │   │   ├── auth-client.ts
│   │   │   └── api.ts
│   │   │
│   │   ├── hooks/
│   │   ├── types/
│   │   └── utils/
│   │
│   ├── public/
│   ├── .env.local
│   ├── package.json
│   └── tsconfig.json
│
│
├── backend/                          # FastAPI
│   │
│   ├── app/
│   │   ├── main.py
│   │   │
│   │   ├── api/
│   │   │   ├── health.py
│   │   │   ├── auth.py
│   │   │   ├── portfolio.py
│   │   │   └── cas.py
│   │   │
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── security.py
│   │   │
│   │   ├── db/
│   │   │   ├── database.py
│   │   │   └── dependencies.py
│   │   │
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── portfolio.py
│   │   │   ├── holding.py
│   │   │   ├── transaction.py
│   │   │   └── import_record.py
│   │   │
│   │   ├── schemas/
│   │   │   ├── user.py
│   │   │   ├── portfolio.py
│   │   │   ├── holding.py
│   │   │   └── cas.py
│   │   │
│   │   ├── services/
│   │   │   ├── portfolio_service.py
│   │   │   └── cas_service.py
│   │   │
│   │   ├── parsers/
│   │   │   ├── base.py
│   │   │   ├── detector.py
│   │   │   ├── cams.py
│   │   │   └── kfintech.py
│   │   │
│   │   └── analytics/
│   │       ├── hhi.py
│   │       ├── exposure.py
│   │       ├── diversification.py
│   │       └── fees.py
│   │
│   ├── tests/
│   │   ├── test_health.py
│   │   ├── test_cas.py
│   │   └── test_portfolio.py
│   │
│   ├── requirements.txt
│   └── .env
│
│
├── docs/
│   ├── architecture.md
│   ├── api-contract.md
│   └── database.md
│
├── .gitignore
├── README.md
└── docker-compose.yml                 # later