"use client";

import { useMutation } from "@tanstack/react-query";
import { type Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import * as React from "react";
import { FiLogOut, FiMoreHorizontal } from "react-icons/fi";
import { GrList } from "react-icons/gr";
import { IoSettingsOutline } from "react-icons/io5";
import { LuHouse } from "react-icons/lu";
import { PiMicroscope } from "react-icons/pi";
import { PiLightbulbFilament } from "react-icons/pi";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Define a type for menu items using the imported Route type.
type MenuItem = {
  icon: React.ElementType;
  label: string;
  href: Route;
};

// Defines the data for the "Home" menu item.
const homeMenuItem: MenuItem = {
  icon: LuHouse,
  label: "Home",
  href: "/dashboard",
};

// Defines the data for the "Analysis" group of menu items.
const analysisMenuItems: MenuItem[] = [
  {
    icon: PiMicroscope,
    label: "Analyze",
    href: "/analyze",
  },
  {
    icon: GrList,
    label: "Results",
    href: "/results",
  },
];

// Defines the data for the "Settings" group of menu items.
const settingsMenuItems: MenuItem[] = [
  {
    icon: IoSettingsOutline,
    label: "Account",
    // @ts-expect-error: Route is yet to be implemented.
    href: "/account",
  },
  {
    icon: PiLightbulbFilament,
    label: "Help",
    // @ts-expect-error: Route is yet to be implemented.
    href: "/help",
  },
];

export const AppSidebar = () => {
  // Retrieves the current URL path to highlight the active menu item
  const pathname = usePathname();
  // Retrieves the sidebar's current state (e.g., "collapsed") from a shared context
  const { state } = useSidebar();
  // A boolean flag to simplify checking for the collapsed state
  const isCollapsed = state === "collapsed";

  // Sets up the sign-out mutation using TanStack Query
  const { mutate: performSignOut, isPending: isSigningOut } = useMutation({
    mutationFn: async () => signOut({ callbackUrl: "/" }),
    onError: (error) => {
      console.error("Sign out failed", error);
    },
  });

  // Defines a base set of Tailwind CSS classes for consistent menu item styling
  const menuItemClasses =
    "font-plus-jakarta-sans flex h-10 cursor-pointer items-center gap-3 rounded-lg bg-transparent px-3 text-sm font-normal ring-offset-emerald-900 transition-colors duration-300 ease-in-out hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none active:bg-emerald-800 data-[active=true]:bg-gradient-to-b from-emerald-600 to-emerald-700";

  // A specific class to ensure icons have a consistent size
  const iconSizeOverride = "[&>svg]:size-5.25";

  // Defines styles specifically for buttons when the sidebar is collapsed
  const collapsedButtonClasses =
    "group-data-[state=collapsed]:w-full! group-data-[state=collapsed]:h-10! group-data-[state=collapsed]:justify-center";

  // A reusable JSX element for the logo image to avoid repetition
  const LogoImage = (
    <Image
      src="/icons/icon-fly.svg"
      alt="Mortiscope Logo"
      width={45}
      height={45}
      className={cn(
        "invert transition-all duration-300",
        "pointer-events-none group-data-[state=collapsed]:pointer-events-auto"
      )}
    />
  );

  // A reusable JSX element for the "Home" link
  const HomeLink = (
    <Link href={homeMenuItem.href} passHref>
      <SidebarMenuButton
        isActive={pathname.startsWith(homeMenuItem.href)}
        className={cn(menuItemClasses, iconSizeOverride, collapsedButtonClasses)}
      >
        <homeMenuItem.icon className="text-white" />
        <span className="text-white group-data-[state=collapsed]:hidden">{homeMenuItem.label}</span>
      </SidebarMenuButton>
    </Link>
  );

  // A reusable JSX element for the "Sign Out" button, encapsulating its logic and state
  const SignOutButton = (
    <div className={isSigningOut ? "cursor-not-allowed" : ""}>
      <SidebarMenuButton
        onClick={() => performSignOut()}
        disabled={isSigningOut}
        className={cn(
          menuItemClasses,
          iconSizeOverride,
          "justify-center border border-emerald-700",
          isSigningOut ? "opacity-50" : "",
          collapsedButtonClasses
        )}
      >
        <FiLogOut className="text-white" />
        <span className="text-white group-data-[state=collapsed]:hidden">
          {isSigningOut ? "Signing Out..." : "Sign Out"}
        </span>
      </SidebarMenuButton>
    </div>
  );

  return (
    // The main sidebar container component
    <Sidebar
      className="bg-emerald-900 text-white [&>[data-slot=sidebar-container]]:group-data-[collapsible=icon]:w-[6.5rem] [&>[data-slot=sidebar-gap]]:group-data-[collapsible=icon]:w-[6.5rem]"
      collapsible="icon"
    >
      {/* The header section of the sidebar. */}
      <SidebarHeader className="bg-emerald-900 px-3 pt-6 pb-4">
        <div className="flex flex-col items-center text-center">
          {/* Conditionally wraps the logo in a tooltip when the sidebar is collapsed. */}
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>{LogoImage}</TooltipTrigger>
              <TooltipContent side="right" align="center" className="font-inter">
                <p>MORTISCOPE</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            LogoImage
          )}
          <span className="font-inter mt-2 text-2xl font-bold tracking-tighter transition-opacity duration-200 group-data-[state=collapsed]:pointer-events-none group-data-[state=collapsed]:opacity-0">
            <span className="text-amber-400">MORTI</span>
            <span className="text-white">SCOPE</span>
            <span className="text-amber-400">.</span>
          </span>
        </div>
      </SidebarHeader>

      {/* The main content area of the sidebar, holding the navigation menu groups. */}
      <SidebarContent className="bg-emerald-900 px-3">
        {/* The first group, containing the primary "Home" link. */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                {/* Conditionally wraps the link in a tooltip when collapsed. */}
                {isCollapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{HomeLink}</TooltipTrigger>
                    <TooltipContent side="right" align="center" className="font-inter">
                      <p>{homeMenuItem.label}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  HomeLink
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* The second group for "Analysis" related navigation. */}
        <SidebarGroup>
          <SidebarGroupLabel className="font-plus-jakarta-sans px-3 text-sm tracking-wide text-emerald-400 group-data-[state=collapsed]:mt-0 group-data-[state=collapsed]:flex group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:px-0 group-data-[state=collapsed]:opacity-100">
            {/* Shows text label when expanded, and an icon with a tooltip when collapsed. */}
            <span className="group-data-[state=collapsed]:hidden">Analysis</span>
            <div className="hidden group-data-[state=collapsed]:block">
              <Tooltip>
                <TooltipTrigger>
                  <FiMoreHorizontal className="h-5 w-5" />
                </TooltipTrigger>
                <TooltipContent side="right" align="center" className="font-inter">
                  <p>Analysis</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {/* Dynamically renders each menu item from the `analysisMenuItems` array. */}
              {analysisMenuItems.map((item) => {
                const menuItemLink = (
                  <Link href={item.href} passHref>
                    <SidebarMenuButton
                      isActive={pathname.startsWith(item.href)}
                      className={cn(menuItemClasses, iconSizeOverride, collapsedButtonClasses)}
                    >
                      <item.icon className="text-white" />
                      <span className="text-white group-data-[state=collapsed]:hidden">
                        {item.label}
                      </span>
                    </SidebarMenuButton>
                  </Link>
                );
                return (
                  <SidebarMenuItem key={item.label}>
                    {/* Wraps the menu item in a tooltip when collapsed to show the label on hover. */}
                    {isCollapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>{menuItemLink}</TooltipTrigger>
                        <TooltipContent side="right" align="center" className="font-inter">
                          <p>{item.label}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      menuItemLink
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* The third group for "Settings" related navigation. */}
        <SidebarGroup>
          <SidebarGroupLabel className="font-plus-jakarta-sans px-3 text-sm tracking-wide text-emerald-400 group-data-[state=collapsed]:mt-0 group-data-[state=collapsed]:flex group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:px-0 group-data-[state=collapsed]:opacity-100">
            {/* Shows text label when expanded, and an icon with a tooltip when collapsed. */}
            <span className="group-data-[state=collapsed]:hidden">Settings</span>
            <div className="hidden group-data-[state=collapsed]:block">
              <Tooltip>
                <TooltipTrigger>
                  <FiMoreHorizontal className="h-5 w-5" />
                </TooltipTrigger>
                <TooltipContent side="right" align="center" className="font-inter">
                  <p>Settings</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="mt-2 space-y-0.5">
              {/* Dynamically renders each menu item from the `settingsMenuItems` array. */}
              {settingsMenuItems.map((item) => {
                const menuItemLink = (
                  <Link href={item.href} passHref>
                    <SidebarMenuButton
                      isActive={pathname.startsWith(item.href)}
                      className={cn(menuItemClasses, iconSizeOverride, collapsedButtonClasses)}
                    >
                      <item.icon className="text-white" />
                      <span className="text-white group-data-[state=collapsed]:hidden">
                        {item.label}
                      </span>
                    </SidebarMenuButton>
                  </Link>
                );
                return (
                  <SidebarMenuItem key={item.label}>
                    {/* Wraps the menu item in a tooltip when collapsed. */}
                    {isCollapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>{menuItemLink}</TooltipTrigger>
                        <TooltipContent side="right" align="center" className="font-inter">
                          <p>{item.label}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      menuItemLink
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* The footer section, used for the sign-out action. */}
      <SidebarFooter className="bg-emerald-900 px-3 py-4 text-white">
        <SidebarMenu className="mt-auto">
          <SidebarMenuItem>
            {/* Conditionally wraps the sign-out button in a tooltip when collapsed. */}
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>{SignOutButton}</TooltipTrigger>
                <TooltipContent side="right" align="center" className="font-inter">
                  <p>Sign Out</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              SignOutButton
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};
