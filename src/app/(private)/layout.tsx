"use client";

import { usePathname } from "next/navigation";
import React from "react";

import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

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
          <main className="flex-1 bg-slate-200 px-8 py-6">
            {/* Conditionally render the breadcrumb. */}
            {pathname !== "/dashboard" && (
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
