"use client";

import React from "react";

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
          <main className="flex-1 bg-slate-200 p-4 sm:px-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default PrivateLayout;
