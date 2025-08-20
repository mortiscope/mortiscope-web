import { type Metadata } from "next";
import { Suspense } from "react";

import { AccountContainer } from "@/features/account/components/account-container";

type Props = {
  searchParams: Promise<{ tab?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const tab = params.tab || "profile";

  const tabTitles: Record<string, string> = {
    profile: "Profile",
    security: "Security",
    sessions: "Sessions",
    deletion: "Deletion",
  };

  const tabTitle = tabTitles[tab] || "Profile";

  return {
    title: `Account Settings — ${tabTitle} • MortiScope`,
  };
}

/**
 * The main page component for the account settings page.
 */
const AccountPage = () => {
  return (
    <div className="flex flex-1 rounded-2xl bg-white px-4 pt-2 pb-6 sm:px-6 sm:py-8 md:rounded-3xl">
      <Suspense fallback={null}>
        <AccountContainer />
      </Suspense>
    </div>
  );
};

export default AccountPage;
