import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { DashboardContainer } from "@/features/dashboard/components/dashboard-container";

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

const DashboardPage = async () => {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin");
  }

  const firstName = session.user.name?.split(" ")[0] ?? "User";

  return <DashboardContainer firstName={firstName} />;
};

export default DashboardPage;
