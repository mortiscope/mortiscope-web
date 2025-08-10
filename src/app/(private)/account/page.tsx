import { type Metadata } from "next";
import { JSX } from "react";

import { AccountContainer } from "@/features/account/components/account-container";
import { AccountNavigation } from "@/features/account/components/account-navigation";

export const metadata: Metadata = {
  title: "Account Settings • MortiScope",
};

/**
 * The main server component for the account settings page.
 * It establishes a responsive layout with navigation and content.
 *
 * @returns {JSX.Element} The rendered page component.
 */
const AccountPage = (): JSX.Element => {
  return (
    <div className="flex flex-1 rounded-2xl bg-white p-2 sm:p-6 md:rounded-3xl">
      <div className="flex w-full flex-col gap-6 lg:grid lg:grid-cols-5 lg:gap-x-6">
        <div className="lg:col-span-1">
          <AccountNavigation />
        </div>
        <div className="lg:col-span-4">
          <AccountContainer />
        </div>
      </div>
    </div>
  );
};

export default AccountPage;
