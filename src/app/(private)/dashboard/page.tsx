import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { auth } from "@/auth";
import { getCaseData } from "@/features/dashboard/actions/get-case-data";
import { DashboardContainer } from "@/features/dashboard/components/dashboard-container";
import { DashboardSkeleton } from "@/features/dashboard/components/dashboard-skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const session = await auth();

  if (!session?.user?.name) {
    return {
      title: "Dashboard • MortiScope",
    };
  }

  const firstName = session.user.name.split(" ")[0];

  const possessiveSuffix = firstName.toLowerCase().endsWith("s") ? "'" : "'s";

  return {
    title: `${firstName}${possessiveSuffix} Dashboard • MortiScope`,
  };
}

/**
 * A server component that fetches and prepares the data for the dashboard page.
 */
async function DashboardPageContent() {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin");
  }

  const firstName = session.user.name?.split(" ")[0] ?? "User";
  const caseData = await getCaseData();

  return <DashboardContainer firstName={firstName} caseData={caseData} />;
}

/**
 * The main server component for the dashboard page.
 * Uses a Suspense boundary to show a skeleton while fetching data.
 */
export default async function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardPageContent />
    </Suspense>
  );
}
