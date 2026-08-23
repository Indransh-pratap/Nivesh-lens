import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Family Aggregator | Nivesh Lens",
  description: "Consolidated portfolio view across family member accounts.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
