import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Nivesh Lens",
  description: "Consolidated portfolio overview — total value, gain/loss, top exposures and risk alerts at a glance.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
