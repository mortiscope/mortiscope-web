"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { analysisSteps } from "@/features/analyze/components/analyze-progress";
import { useAnalyzeStore } from "@/features/analyze/store/analyze-store";
import { useCaseName } from "@/features/results/hooks/use-case-name";
import { cn } from "@/lib/utils";

/**
 * Defines the structure for a single breadcrumb item.
 */
type BreadcrumbItemType = {
  href: string;
  label: string;
};

/**
 * Formats a URL path segment into a human-readable string.
 * It capitalizes words, replaces hyphens with spaces, and leaves dynamic segments as is.
 *
 * @param segment A single part of the URL path (e.g., 'user-settings').
 * @returns A formatted string (e.g., 'User Settings').
 */
const formatBreadcrumbLabel = (segment: string): string => {
  // Check if the segment is likely a dynamic ID.
  const isDynamic = /^[a-zA-Z0-9]{20,}/.test(segment);
  if (isDynamic) {
    return segment;
  }
  // Otherwise, format it for display.
  return segment.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

/**
 * Takes a URL pathname and generates an array of breadcrumb items.
 * Each item in the array represents a step in the path hierarchy.
 *
 * @param pathname The full URL path from `usePathname`.
 * @returns An array of BreadcrumbItemType objects.
 */
const generateBreadcrumbsFromPath = (pathname: string): BreadcrumbItemType[] => {
  const pathSegments = pathname.split("/").filter(Boolean);
  const breadcrumbItems: BreadcrumbItemType[] = [];
  let currentPath = "";

  for (const segment of pathSegments) {
    currentPath += `/${segment}`;
    breadcrumbItems.push({
      href: currentPath,
      label: formatBreadcrumbLabel(segment),
    });
  }
  return breadcrumbItems;
};

/**
 * A styled, reusable link component for a single breadcrumb item.
 */
const BreadcrumbLinkItem = ({
  href,
  label,
  isStatic = false,
}: BreadcrumbItemType & { isStatic?: boolean }) => (
  <BreadcrumbLink asChild>
    <Link
      href={href}
      className={cn(
        "group",
        // Conditionally apply cursor and disable pointer events
        isStatic ? "pointer-events-none cursor-default" : "cursor-pointer"
      )}
    >
      <span
        className={cn(
          "transition-colors duration-300 ease-in-out",
          // Conditionally apply the hover text color class
          !isStatic && "group-hover:text-emerald-600"
        )}
      >
        {label}
      </span>
    </Link>
  </BreadcrumbLink>
);

/**
 * A styled, reusable dropdown menu item for use within the ellipsis.
 */
const StyledDropdownMenuItem = ({
  href,
  label,
  isStatic = false,
}: BreadcrumbItemType & { isStatic?: boolean }) => (
  <DropdownMenuItem
    asChild
    disabled={isStatic}
    className={cn(
      "border-2 border-transparent transition-colors duration-300 ease-in-out",
      !isStatic && "cursor-pointer hover:border-emerald-200 focus:bg-emerald-100"
    )}
  >
    <Link href={href} className={cn("group", isStatic && "pointer-events-none")}>
      <span
        className={cn(
          "transition-colors duration-300 ease-in-out",
          !isStatic && "group-hover:text-emerald-600"
        )}
      >
        {label}
      </span>
    </Link>
  </DropdownMenuItem>
);

/**
 * A dynamic and responsive breadcrumb component that generates its structure from the current URL path.
 */
export function AppBreadcrumb() {
  const pathname = usePathname();
  const currentStep = useAnalyzeStore((state) => state.step);

  const pathSegments = React.useMemo(() => pathname.split("/").filter(Boolean), [pathname]);
  const isResultsPage = pathSegments[0] === "results" && pathSegments.length === 2;
  const caseId = isResultsPage ? pathSegments[1] : null;

  const { data: caseData, isLoading } = useCaseName(caseId);

  const items = React.useMemo(() => {
    const baseItems = generateBreadcrumbsFromPath(pathname);

    // If on the results page, replace the last breadcrumb's label (the ID) with the fetched case name.
    if (isResultsPage && baseItems.length > 0) {
      const lastItem = baseItems[baseItems.length - 1];
      if (isLoading) {
        lastItem.label = "Loading...";
      } else if (caseData?.caseName) {
        lastItem.label = caseData.caseName;
      }
    }

    if (pathname === "/analyze") {
      const stepDetails = analysisSteps.find((s) => s.id === currentStep);
      if (stepDetails) {
        return [...baseItems, { href: pathname, label: stepDetails.name }];
      }
    }
    return baseItems;
  }, [pathname, currentStep, isResultsPage, caseData, isLoading]);

  if (items.length === 0) {
    return (
      <Breadcrumb className="font-inter">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="uppercase">Mortiscope</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  // Separate the breadcrumb items into clickable links and the non-clickable current page.
  const linkItems = items.slice(0, -1);
  const currentPageItem = items[items.length - 1];

  const MAX_VISIBLE_LINKS_DESKTOP = 3;
  const needsEllipsisDesktop = linkItems.length > MAX_VISIBLE_LINKS_DESKTOP;

  /**
   * A reusable trigger component for the ellipsis dropdown menu.
   */
  const EllipsisTrigger = () => (
    <DropdownMenuTrigger
      className="flex items-center gap-1 transition-colors duration-300 ease-in-out focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
      aria-label="Toggle menu"
    >
      <BreadcrumbEllipsis className="h-4 w-4 cursor-pointer" />
    </DropdownMenuTrigger>
  );

  return (
    <Breadcrumb className="font-inter">
      {/* Mobile View (hidden on medium screens and up) */}
      <BreadcrumbList className="whitespace-nowrap md:hidden">
        <BreadcrumbItem>
          <BreadcrumbPage className="uppercase">Mortiscope</BreadcrumbPage>
        </BreadcrumbItem>

        {linkItems.length > 0 && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <DropdownMenu>
                <EllipsisTrigger />
                <DropdownMenuContent align="start" className="font-inter">
                  {linkItems.map((item) => {
                    const isStatic = pathname === "/analyze" && item.href === "/analyze";
                    return <StyledDropdownMenuItem key={item.href} {...item} isStatic={isStatic} />;
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
          </>
        )}

        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage className="max-w-28 truncate">{currentPageItem.label}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>

      {/* Desktop View (visible on medium screens and up) */}
      <BreadcrumbList className="hidden whitespace-nowrap md:flex">
        <BreadcrumbItem>
          <BreadcrumbPage className="uppercase">Mortiscope</BreadcrumbPage>
        </BreadcrumbItem>
        <BreadcrumbSeparator />

        {/* Renders all links directly if the path is short enough. */}
        {!needsEllipsisDesktop &&
          linkItems.map((item) => {
            const isStatic = pathname === "/analyze" && item.href === "/analyze";
            return (
              <React.Fragment key={item.href}>
                <BreadcrumbItem>
                  <BreadcrumbLinkItem href={item.href} label={item.label} isStatic={isStatic} />
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </React.Fragment>
            );
          })}

        {/* Renders the collapsed breadcrumb view for longer paths. */}
        {needsEllipsisDesktop && (
          <>
            <BreadcrumbItem>
              <BreadcrumbLinkItem
                href={linkItems[0].href}
                label={linkItems[0].label}
                isStatic={pathname === "/analyze" && linkItems[0].href === "/analyze"}
              />
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <DropdownMenu>
                <EllipsisTrigger />
                <DropdownMenuContent align="start" className="font-inter">
                  {linkItems.slice(1, -1).map((item) => (
                    <StyledDropdownMenuItem
                      key={item.href}
                      {...item}
                      isStatic={pathname === "/analyze" && item.href === "/analyze"}
                    />
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLinkItem
                href={linkItems[linkItems.length - 1].href}
                label={linkItems[linkItems.length - 1].label}
                isStatic={
                  pathname === "/analyze" && linkItems[linkItems.length - 1].href === "/analyze"
                }
              />
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </>
        )}

        {/* The final, non-clickable breadcrumb for the current page. */}
        <BreadcrumbItem>
          <BreadcrumbPage className="truncate">{currentPageItem.label}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
