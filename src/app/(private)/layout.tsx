"use client";

import { usePathname } from "next/navigation";
import React, { useEffect } from "react";
import { toast } from "sonner";

import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAnalyzeStore } from "@/features/analyze/store/analyze-store";

interface Props {
  children: React.ReactNode;
}

/**
 * The primary layout component for authenticated sections of the application.
 *
 * @param {Props} props The component props, including child elements to render.
 * @returns A React component representing the main authenticated layout.
 */
const PrivateLayout = ({ children }: Props) => {
  const pathname = usePathname();

  // Get the submission status and the action to clear it from the store.
  const submissionStatus = useAnalyzeStore((state) => state.submissionStatus);
  const clearSubmissionStatus = useAnalyzeStore((state) => state.clearSubmissionStatus);

  /**
   * Shows a success toast on page load if a successful submission just occurred.
   */
  useEffect(() => {
    if (submissionStatus === "success") {
      toast.success("Case successfully submitted!");
      clearSubmissionStatus();
    }
    // This effect runs when the status changes or when the user navigates to a new page.
  }, [submissionStatus, clearSubmissionStatus, pathname]);

  // Determine if the breadcrumb should be visible.
  const isBreadcrumbVisible = pathname !== "/dashboard" && pathname !== "/results";

  return (
    // Provides sidebar state management to all nested components
    <SidebarProvider
      style={
        {
          "--sidebar-width-icon": "6rem",
        } as React.CSSProperties
      }
    >
      {/* The main flex container for the entire page. */}
      <div className="flex min-h-screen w-full">
        <AppSidebar />

        {/* A simple flex container for the rest of the page. */}
        <div className="flex flex-1 flex-col">
          <AppHeader />
          <main className="flex flex-1 flex-col bg-slate-200 p-6 md:p-8">
            {/* Conditionally render the breadcrumb. */}
            {isBreadcrumbVisible && (
              <div className="mb-4">
                <AppBreadcrumb />
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default PrivateLayout;
