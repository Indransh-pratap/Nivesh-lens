import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Alerts | Nivesh Lens",
  description: "Portfolio risk alerts — overlap warnings, concentration flags, and compliance nudges.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
