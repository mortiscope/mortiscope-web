"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

/**
 * A specialized breadcrumb component for the account settings page.
 */
export function AccountBreadcrumb() {
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
      </BreadcrumbList>
    </Breadcrumb>
  );
}

AccountBreadcrumb.displayName = "AccountBreadcrumb";
