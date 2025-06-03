"use client";

import React from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface Props {
  children: React.ReactNode;
}

/**
 * A dedicated component to render the sidebar toggle button for desktop views.
 */
const DesktopSidebarToggle = () => {
  const { state } = useSidebar();
  const isExpanded = state === "expanded";

  return (
    <SidebarTrigger
      className={cn(
        "absolute top-4 z-20 hidden h-16 w-16 cursor-pointer items-center justify-center text-slate-900 transition-all duration-300 ease-in-out hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:flex [&>svg]:!size-5",
        isExpanded ? "left-[17rem]" : "left-[7rem]"
      )}
    />
  );
};

/**
 * The primary layout component for authenticated sections of the application.
 *
 * @param {Props} props The component props, including child elements to render.
 * @returns A React component representing the main authenticated layout.
 */
const PrivateLayout = ({ children }: Props) => {
  return (
    // Provides sidebar state management to all nested components
    <SidebarProvider
      style={
        {
          "--sidebar-width-icon": "6rem",
        } as React.CSSProperties
      }
    >
      <div className="relative flex min-h-screen">
        {/* The main sidebar component containing navigation links. */}
        <AppSidebar />
        {/* The desktop-only sidebar toggle button. */}
        <DesktopSidebarToggle />
        {/* The main content area that adjusts its layout based on the sidebar state. */}
        <SidebarInset>
          {/* A mobile-only header containing the sidebar trigger for small screens. */}
          <header className="bg-background sticky top-0 z-10 flex h-14 items-center justify-end gap-4 px-4 md:hidden">
            <SidebarTrigger
              className={cn(
                "h-10 w-10 text-slate-900 hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 [&>svg]:!size-5"
              )}
            />
          </header>
          {/* The main content of the current page. */}
          <main className="flex-1 p-4 sm:px-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default PrivateLayout;
