import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nivesh Lens | Portfolio Intelligence",
  description: "See what your portfolio is really exposed to.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="dark h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
