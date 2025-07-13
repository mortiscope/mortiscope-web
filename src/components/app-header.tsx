"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import React from "react";
import { FiLogOut } from "react-icons/fi";
import { IoSettingsOutline } from "react-icons/io5";
import { LuHouse } from "react-icons/lu";
import { PiLightbulbFilament } from "react-icons/pi";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatPathToTitle, getDeterministicAvatar } from "@/lib/utils";

/**
 * Renders the main application header, including the page title, a sidebar
 * trigger for mobile, and a user profile dropdown menu.
 */
export const AppHeader = () => {
  // Hooks to retrieve the user's session data and the current URL path
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Memoizes the page title calculation to prevent re-computation on every render
  const pageTitle = React.useMemo(() => {
    const segments = pathname.split("/");
    return formatPathToTitle(segments[1]);
  }, [pathname]);

  // Derives user-specific details for display in the dropdown
  const user = session?.user;
  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  // Determines the avatar source, falling back to a deterministic avatar if no image is present
  const avatarSrc = user?.image ?? getDeterministicAvatar(user?.id);

  // Defines a consistent class name for dropdown menu items
  const menuItemClassName =
    "group font-inter cursor-pointer border-2 border-transparent transition-colors duration-300 ease-in-out hover:border-emerald-200 focus:bg-emerald-100";

  return (
    <header className="bg-background sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b px-6 shadow-sm md:h-20">
      {/* Left section of the header. */}
      <div className="flex items-center gap-4">
        <SidebarTrigger
          className={cn(
            "hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-slate-900 transition ease-in-out focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none [&>svg]:!size-5"
          )}
        />
        <h1 className="font-plus-jakarta-sans text-lg font-semibold text-slate-800 md:text-xl">
          {pageTitle}
        </h1>
      </div>

      {/* Right section of the header. */}
      <div>
        {/* Displays a skeleton loader while the user session is being fetched. */}
        {status === "loading" && <Skeleton className="h-8 w-8 rounded-full md:h-10 md:w-10" />}

        {/* Renders the user avatar and dropdown menu when the user is authenticated. */}
        {status === "authenticated" && user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-8 w-8 cursor-pointer transition duration-300 ease-in-out hover:opacity-90 md:h-10 md:w-10">
                <AvatarImage src={avatarSrc} alt={user.name ?? "User Avatar"} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              {/* Displays user profile information. */}
              <DropdownMenuLabel className="font-inter font-normal">
                <div className="flex items-center gap-2">
                  <Avatar>
                    <AvatarImage src={avatarSrc} alt={user.name ?? "User Avatar"} />
                    <AvatarFallback>{getDeterministicAvatar(user?.id)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm leading-none font-medium">{user.name}</p>
                    <p className="text-muted-foreground text-xs leading-none">{user.email}</p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* Navigation links within the dropdown menu. */}
              <DropdownMenuItem asChild className={menuItemClassName}>
                <Link href="/dashboard">
                  <LuHouse className="mr-2 h-4 w-4 transition-colors group-hover:text-emerald-500" />
                  <span className="transition-colors group-hover:text-emerald-500">Home</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className={menuItemClassName}>
                <Link href="/account">
                  <IoSettingsOutline className="mr-2 h-4 w-4 transition-colors group-hover:text-emerald-500" />
                  <span className="transition-colors group-hover:text-emerald-500">Account</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className={menuItemClassName}>
                <Link href="/help">
                  <PiLightbulbFilament className="mr-2 h-4 w-4 transition-colors group-hover:text-emerald-500" />
                  <span className="transition-colors group-hover:text-emerald-500">Help</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />

              {/* The sign-out action item. */}
              <DropdownMenuItem
                className={menuItemClassName}
                onSelect={() => signOut({ callbackUrl: "/" })}
              >
                <FiLogOut className="mr-2 h-4 w-4 transition-colors group-hover:text-emerald-500" />
                <span className="transition-colors group-hover:text-emerald-500">Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
};
