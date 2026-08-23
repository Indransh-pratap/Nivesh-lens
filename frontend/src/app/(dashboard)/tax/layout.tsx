import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tax Rebalancer | Nivesh Lens",
  description: "Tax-loss harvesting and capital gains optimization across your holdings.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
