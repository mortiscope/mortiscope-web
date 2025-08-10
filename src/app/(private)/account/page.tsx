import { type Metadata } from "next";

import { AccountContainer } from "@/features/account/components/account-container";

export const metadata: Metadata = {
  title: "Account Settings • MortiScope",
};

/**
 * The main page component for the account settings page.
 */
const AccountPage = () => {
  return (
    <div className="flex flex-1 rounded-2xl bg-white px-4 py-2 sm:p-6 md:rounded-3xl">
      <AccountContainer />
    </div>
  );
};

export default AccountPage;
