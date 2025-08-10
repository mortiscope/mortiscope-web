"use client";

import { useState } from "react";

import { AccountContent } from "@/features/account/components/account-content";
import { AccountNavigation } from "@/features/account/components/account-navigation";

/**
 * The main container component for the account settings page.
 * Manages tab state and coordinates between navigation and content.
 */
export const AccountContainer = () => {
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <div className="flex w-full flex-col gap-6 lg:grid lg:grid-cols-5 lg:gap-x-8">
      <div className="lg:col-span-1">
        <AccountNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
      <div className="lg:col-span-4">
        <AccountContent activeTab={activeTab} />
      </div>
    </div>
  );
};

AccountContainer.displayName = "AccountContainer";
