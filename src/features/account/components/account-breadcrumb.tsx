"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface AccountBreadcrumbProps {
  /** The currently active tab's value. */
  activeTab: string;
}

/**
 * A specialized breadcrumb component for the account settings page.
 */
export function AccountBreadcrumb({ activeTab }: AccountBreadcrumbProps) {
  // Map tab values to display names
  const getTabDisplayName = (tab: string): string => {
    switch (tab.toLowerCase()) {
      case "profile":
        return "Profile";
      case "security":
        return "Security";
      case "sessions":
        return "Sessions";
      case "deletion":
        return "Deletion";
      default:
        return "Profile";
    }
  };

  return (
    <Breadcrumb className="font-inter w-full">
      <BreadcrumbList className="whitespace-nowrap">
        <BreadcrumbItem className="uppercase">
          <BreadcrumbPage>Mortiscope</BreadcrumbPage>
        </BreadcrumbItem>

        <BreadcrumbSeparator />

        {/* Displayed on all screens */}
        <BreadcrumbItem>
          <BreadcrumbPage>Account</BreadcrumbPage>
        </BreadcrumbItem>

        <BreadcrumbSeparator />

        {/* Display the current tab */}
        <BreadcrumbItem>
          <BreadcrumbPage>{getTabDisplayName(activeTab)}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

AccountBreadcrumb.displayName = "AccountBreadcrumb";
