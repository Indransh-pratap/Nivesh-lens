import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { PortfolioDashboard } from "@/components/dashboard/PortfolioDashboard";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  return <PortfolioDashboard />;
}
