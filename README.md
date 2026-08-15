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
