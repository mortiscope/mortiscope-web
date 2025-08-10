"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AccountContent } from "@/features/account/components/account-content";
import { AccountNavigation } from "@/features/account/components/account-navigation";

/**
 * The main container component for the account settings page.
 * Manages tab state and coordinates between navigation and content.
 */
export const AccountContainer = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("profile");

  // Initialize active tab from URL search params
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    const validTabs = ["profile", "security", "sessions", "deletion"];

    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    } else {
      setActiveTab("profile");
    }
  }, [searchParams]);

  // Handle tab change and update URL
  const handleTabChange = useCallback(
    (newTab: string) => {
      setActiveTab(newTab);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", newTab);
      router.replace(`/account?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  return (
    <div className="flex w-full flex-col gap-6 lg:grid lg:grid-cols-5 lg:gap-x-8">
      <div className="lg:col-span-1">
        <AccountNavigation activeTab={activeTab} onTabChange={handleTabChange} />
      </div>
      <div className="lg:col-span-4">
        <AccountContent activeTab={activeTab} />
      </div>
    </div>
  );
};

AccountContainer.displayName = "AccountContainer";
