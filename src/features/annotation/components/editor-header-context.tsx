"use client";

import { memo } from "react";
import { IoIosArrowRoundBack } from "react-icons/io";
import { LuChevronRight, LuPanelLeftClose, LuPanelLeftOpen } from "react-icons/lu";

import { Button } from "@/components/ui/button";

/**
 * Defines the props for the editor header context component.
 */
interface EditorHeaderContextProps {
  /** Handler for back navigation. */
  onBackNavigation: () => void;
  /** Whether the mobile sidebar is currently open. */
  isMobileSidebarOpen: boolean;
  /** Handler to toggle the mobile sidebar. */
  onToggleMobileSidebar: () => void;
  /** Whether any details panel is currently open. */
  hasOpenPanel: boolean;
  /** The case name for breadcrumbs. */
  caseName: string;
  /** The current image name for breadcrumbs. */
  currentImageName: string;
}

/**
 * The left section of the editor header containing back button, title, and breadcrumbs.
 */
export const EditorHeaderContext = memo(
  ({
    onBackNavigation,
    isMobileSidebarOpen,
    onToggleMobileSidebar,
    hasOpenPanel,
    caseName,
    currentImageName,
  }: EditorHeaderContextProps) => {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {/* Back navigation button */}
        <Button
          onClick={onBackNavigation}
          variant="ghost"
          size="icon"
          className="group h-8 w-8 flex-shrink-0 bg-transparent text-white hover:cursor-pointer hover:bg-transparent hover:text-white focus:outline-none md:h-10 md:w-10 [&_svg]:!size-6 md:[&_svg]:!size-7"
          aria-label="Go back to results"
        >
          <IoIosArrowRoundBack className="transition-all duration-200 group-hover:-translate-x-1 group-hover:text-emerald-200" />
        </Button>

        {/* MORTISCOPE title, visible only on medium devices */}
        <span className="font-plus-jakarta-sans hidden text-2xl font-semibold md:block lg:hidden">
          <span className="text-amber-400">MORTI</span>
          <span className="text-white">SCOPE</span>
          <span className="text-amber-400">.</span>
        </span>

        {/* Mobile sidebar toggle button, hidden on medium screens and above */}
        <div
          className={`flex-shrink-0 md:hidden ${hasOpenPanel && isMobileSidebarOpen ? "cursor-not-allowed" : "cursor-pointer"}`}
        >
          <div
            onClick={hasOpenPanel && isMobileSidebarOpen ? undefined : onToggleMobileSidebar}
            className={`text-white transition-colors ${hasOpenPanel && isMobileSidebarOpen ? "opacity-50" : "hover:text-emerald-300"}`}
            aria-label={isMobileSidebarOpen ? "Close sidebar" : "Open sidebar"}
            aria-disabled={hasOpenPanel && isMobileSidebarOpen}
          >
            {isMobileSidebarOpen ? (
              <LuPanelLeftClose className="h-6 w-6" strokeWidth={1.5} />
            ) : (
              <LuPanelLeftOpen className="h-6 w-6" strokeWidth={1.5} />
            )}
          </div>
        </div>

        {/* Breadcrumb-style title, visible on larger screens */}
        <h1 className="font-inter flex min-w-0 flex-1 items-center gap-2 text-sm text-slate-100 md:text-sm">
          <span className="hidden max-w-48 truncate lg:block xl:max-w-64" title={caseName}>
            {caseName}
          </span>
          {caseName && currentImageName && (
            <LuChevronRight className="hidden h-3.5 w-3.5 flex-shrink-0 text-slate-300 lg:block" />
          )}
          <span className="hidden max-w-48 truncate lg:block xl:max-w-64" title={currentImageName}>
            {currentImageName}
          </span>
        </h1>
      </div>
    );
  }
);

EditorHeaderContext.displayName = "EditorHeaderContext";
