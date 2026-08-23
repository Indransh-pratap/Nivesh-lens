import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Advisor Reports | Nivesh Lens",
  description: "Generate white-labeled portfolio diagnostic reports for clients.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
