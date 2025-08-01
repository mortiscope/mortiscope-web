"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import React, { useEffect,useState } from "react";
import { FiLogOut } from "react-icons/fi";
import { IoSettingsOutline } from "react-icons/io5";
import { LuHouse } from "react-icons/lu";
import { PiLightbulbFilament } from "react-icons/pi";

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
import { UserAvatar } from "@/components/user-avatar";
import { cn, formatPathToTitle } from "@/lib/utils";

/**
 * Renders the main application header, including the page title, a sidebar
 * trigger for mobile, and a user profile dropdown menu.
 */
export const AppHeader = () => {
  const { data: session, status, update } = useSession();
  const pathname = usePathname();

  // State to track sign-out transition
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Auto-refresh session when authentication state issues are detected
  useEffect(() => {
    const isProtectedRoute = ![
      "/",
      "/signin",
      "/signup",
      "/forgot-password",
      "/reset-password",
      "/verification",
    ].includes(pathname);

    // Refresh session if on protected route but session shows unauthenticated
    if (isProtectedRoute && status === "unauthenticated") {
      const timer = setTimeout(() => {
        update();
      }, 1000);

      return () => clearTimeout(timer);
    }

    // Handle case where status is authenticated but no user data exists
    if (status === "authenticated" && !session?.user) {
      const timer = setTimeout(() => {
        update();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [pathname, status, session?.user, update]);

  // Refresh session on window focus for protected routes with authentication issues
  useEffect(() => {
    const handleFocus = () => {
      if (status === "unauthenticated") {
        const isProtectedRoute = ![
          "/",
          "/signin",
          "/signup",
          "/forgot-password",
          "/reset-password",
          "/verification",
        ].includes(pathname);
        if (isProtectedRoute) {
          update();
        }
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [pathname, status, update]);

  // Periodic session refresh for persistent authentication state mismatches
  useEffect(() => {
    const isProtectedRoute = ![
      "/",
      "/signin",
      "/signup",
      "/forgot-password",
      "/reset-password",
      "/verification",
    ].includes(pathname);

    if (isProtectedRoute && status === "unauthenticated") {
      let attempts = 0;
      const maxAttempts = 5;

      const intervalId = setInterval(() => {
        attempts++;

        if (attempts >= maxAttempts) {
          clearInterval(intervalId);
          return;
        }

        update();
      }, 2000);

      return () => clearInterval(intervalId);
    }
  }, [pathname, status, update]);

  // Memoizes the page title calculation to prevent re-computation on every render
  const pageTitle = React.useMemo(() => {
    const segments = pathname.split("/");
    return formatPathToTitle(segments[1]);
  }, [pathname]);

  // Handle sign out with proper loading state
  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      console.error("Sign out error:", error);
      setIsSigningOut(false);
    }
  };

  const user = session?.user;
  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated" && !!user;

  // Defines a consistent class name for dropdown menu items
  const menuItemClassName =
    "group font-inter cursor-pointer border-2 border-transparent transition-colors duration-300 ease-in-out hover:border-emerald-200 focus:bg-emerald-100";

  return (
    <header className="bg-background sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b px-6 shadow-lg shadow-gray-400/10 md:h-20">
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
        {isLoading && <Skeleton className="h-8 w-8 rounded-full md:h-10 md:w-10" />}

        {/* Renders the user avatar and dropdown menu when the user is authenticated. */}
        {isAuthenticated && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="cursor-pointer transition duration-300 ease-in-out hover:opacity-90">
                <UserAvatar user={user} />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              {/* Displays user profile information. */}
              <DropdownMenuLabel className="font-inter font-normal">
                <div className="flex items-center gap-2">
                  <UserAvatar user={user} size="sm" />
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm leading-none font-medium">{user?.name}</p>
                    <p className="text-muted-foreground text-xs leading-none">{user?.email}</p>
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
                className={cn(menuItemClassName, isSigningOut && "cursor-not-allowed opacity-50")}
                onSelect={isSigningOut ? undefined : handleSignOut}
                disabled={isSigningOut}
              >
                <FiLogOut className="mr-2 h-4 w-4 transition-colors group-hover:text-emerald-500" />
                <span className="transition-colors group-hover:text-emerald-500">
                  {isSigningOut ? "Signing Out..." : "Sign Out"}
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
};
