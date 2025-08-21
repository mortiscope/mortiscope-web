"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";

// Dynamically import app breadcrumb and disable Server-Side Rendering (SSR) to prevent hydration issues
const AppBreadcrumb = dynamic(
  () => import("@/components/app-breadcrumb").then((module) => ({ default: module.AppBreadcrumb })),
  {
    ssr: false,
    loading: () => <div className="h-6 w-32" />,
  }
);
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useSessionMonitor } from "@/features/account/hooks/use-session-monitor";
import { useAnalyzeStore } from "@/features/analyze/store/analyze-store";
import { useLayoutStore } from "@/stores/layout-store";

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
  const [isNotFoundPage, setIsNotFoundPage] = useState(false);

  // Monitor session status and redirect if revoked
  useSessionMonitor();

  // Get the submission status and the action to clear it from the store.
  const submissionStatus = useAnalyzeStore((state) => state.submissionStatus);
  const clearSubmissionStatus = useAnalyzeStore((state) => state.clearSubmissionStatus);

  // Get the dynamic header content from the layout store.
  const headerAdditionalContent = useLayoutStore((state) => state.headerAdditionalContent);

  /**
   * Clear submission status when navigating to prevent stale state.
   */
  useEffect(() => {
    if (submissionStatus === "success") {
      clearSubmissionStatus();
    }
    // This effect runs when the status changes or when the user navigates to a new page.
  }, [submissionStatus, clearSubmissionStatus, pathname]);

  /**
   * Detect if the children contain a not-found page by checking for specific markers.
   */
  useEffect(() => {
    // Reset on pathname change
    setIsNotFoundPage(false);

    // Check if children contains not-found indicators
    const checkForNotFound = () => {
      const pageContent = document.querySelector('[aria-label="Page Not Found"]');
      if (pageContent) {
        setIsNotFoundPage(true);
      }
    };

    // Small delay to allow DOM to render
    const timer = setTimeout(checkForNotFound, 0);
    return () => clearTimeout(timer);
  }, [children, pathname]);

  // Determine if the breadcrumb should be visible.
  const isBreadcrumbVisible = pathname !== "/dashboard" && pathname !== "/results";

  // If it's a not-found page, render without layout chrome
  if (isNotFoundPage) {
    return <>{children}</>;
  }

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
              <div className="mb-4 flex items-center justify-between">
                <AppBreadcrumb />
                {headerAdditionalContent}
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
