import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mutual Fund Health | Nivesh Lens",
  description: "Direct vs Regular plan analysis, expense ratio bleed, and scheme-level look-through.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
