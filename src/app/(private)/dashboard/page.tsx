import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";

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

  return <div></div>;
};

export default DashboardPage;
