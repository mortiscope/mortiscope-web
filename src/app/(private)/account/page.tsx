import { type Metadata } from "next";
import { JSX } from "react";

import { AccountContainer } from "@/features/account/components/account-container";
import { AccountNavigation } from "@/features/account/components/account-navigation";

export const metadata: Metadata = {
  title: "Account Settings • MortiScope",
};

/**
 * The main server component for the account settings page.
 * It establishes a two-column grid layout for navigation and content.
 *
 * @returns {JSX.Element} The rendered page component.
 */
const AccountPage = (): JSX.Element => {
  return (
    <div className="flex flex-1 rounded-2xl bg-white p-6 md:rounded-3xl">
      <div className="grid w-full grid-cols-5 gap-x-6">
        <div className="col-span-1">
          <AccountNavigation />
        </div>
        <div className="col-span-4">
          <AccountContainer />
        </div>
      </div>
    </div>
  );
};

export default AccountPage;
