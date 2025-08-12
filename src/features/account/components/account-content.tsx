"use client";

import dynamic from "next/dynamic";
import { memo } from "react";

/**
 * A map of dynamically imported tab components.
 */
const TabComponents = {
  profile: dynamic(
    () =>
      import("@/features/account/components/account-profile").then(
        (module) => module.AccountProfile
      ),
    { ssr: false }
  ),
  security: dynamic(
    () =>
      import("@/features/account/components/account-security").then(
        (module) => module.AccountSecurity
      ),
    { ssr: false }
  ),
  sessions: dynamic(
    () =>
      import("@/features/account/components/account-sessions").then(
        (module) => module.AccountSessions
      ),
    { ssr: false }
  ),
  deletion: dynamic(
    () =>
      import("@/features/account/components/account-deletion").then(
        (module) => module.AccountDeletion
      ),
    { ssr: false }
  ),
};

/**
 * Defines the props for the account content component.
 */
interface AccountContentProps {
  /** The currently active tab's value. */
  activeTab: string;
}

/**
 * A memoized content display component for the account settings page.
 * It renders the forms and information corresponding to the selected tab with lazy loading.
 */
export const AccountContent = memo(({ activeTab }: AccountContentProps) => {
  // Dynamically selects the correct, lazily-loaded tab component from the map.
  const SelectedTabComponent = TabComponents[activeTab as keyof typeof TabComponents];

  if (!SelectedTabComponent) {
    return null;
  }

  return (
    <div className="w-full">
      <SelectedTabComponent />
    </div>
  );
});

AccountContent.displayName = "AccountContent";
