import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "True Exposure Map | Nivesh Lens",
  description: "Combined direct + look-through company exposure across your entire portfolio.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
