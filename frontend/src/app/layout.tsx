import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Fraunces } from "next/font/google";
import "./globals.css";

const sansFont = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Signature display serif — used sparingly for the wordmark and hero
// numbers only, so the product reads as designed rather than a stock
// sans-everywhere SaaS template.
const displayFont = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nivesh Lens | Institutional Portfolio Intelligence",
  description: "AMFI Look-Through, True Company Exposure & Wealth Diagnostics for Indian Investors.",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`dark h-full antialiased ${sansFont.variable} ${monoFont.variable} ${displayFont.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Runs before hydration/paint so a returning light-theme user never
            briefly sees the dark theme flash before React mounts. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="light"){document.documentElement.classList.remove("dark");}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans selection:bg-primary selection:text-white">
        {children}
      </body>
    </html>
  );
}
