import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Direct Holdings | Nivesh Lens",
  description: "Every stock and fund you directly hold, with returns, weight, and risk grade per position.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
