import React, { memo, useEffect, useState } from "react";
import { IoInformation } from "react-icons/io5";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * A shared class string for consistent styling of the dropdown menu items.
 */
export const dropdownItemStyle =
  "font-inter cursor-pointer border-2 border-transparent text-sm text-slate-800 transition-colors duration-300 ease-in-out hover:border-emerald-200 hover:!text-emerald-600 focus:bg-emerald-100 [&_svg]:text-slate-800 hover:[&_svg]:!text-emerald-600";

/**
 * Defines the structure of a view option for the toolbar.
 */
export interface ViewOption<T extends string> {
  /** The unique value identifier for this view. */
  value: T;
  /** The icon component to display for this view. */
  icon: React.ElementType;
  /** The human-readable label for this view. */
  label: string;
}

/**
 * Defines the props for the dashboard widget toolbar component.
 */
interface DashboardWidgetToolbarProps<T extends string> {
  /** An array of available view options. */
  viewOptions: readonly ViewOption<T>[];
  /** The currently selected view. */
  selectedView: T;
  /** A callback function to handle the selection of a new view. */
  onViewSelect: (view: T) => void;
  /** A callback function to handle the information button click. */
  onInfoClick: () => void;
  /** The default icon to display when no view is selected. */
  defaultIcon: React.ElementType;
}

/**
 * A generic, memoized component that renders a toolbar for dashboard widgets.
 */
function DashboardWidgetToolbarComponent<T extends string>({
  viewOptions,
  selectedView,
  onViewSelect,
  onInfoClick,
  defaultIcon,
}: DashboardWidgetToolbarProps<T>) {
  // State to ensure the component is only rendered on the client, preventing hydration mismatches.
  const [isMounted, setIsMounted] = useState(false);

  // A side effect to set `isMounted` to true only after the initial render on the client.
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Dynamically selects the appropriate icon for the dropdown trigger based on the selected view.
  const SelectedViewIcon = viewOptions.find((o) => o.value === selectedView)?.icon ?? defaultIcon;

  // Renders a skeleton placeholder before the component has mounted on the client.
  if (!isMounted) {
    return (
      <div className="flex items-center">
        <div className="size-8 rounded-none rounded-l-md border-2 border-slate-200 bg-slate-100 md:size-9" />
        <div className="-ml-[2px] size-8 rounded-none rounded-r-md border-2 border-slate-200 bg-slate-100 md:size-9" />
      </div>
    );
  }

  return (
    <div className="ml-2 flex items-center">
      <Tooltip key="view-tooltip">
        <DropdownMenu key="view-dropdown">
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                aria-label="Change view"
                className={cn(
                  "relative size-8 rounded-none rounded-l-md border-2 border-slate-200 bg-slate-100 text-slate-500 transition-all duration-300 ease-in-out focus-visible:border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 md:size-9",
                  "cursor-pointer hover:z-10 hover:border-emerald-500 hover:bg-emerald-100 hover:text-emerald-500"
                )}
              >
                <SelectedViewIcon className="size-4 md:size-5" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-inter">Change view</p>
          </TooltipContent>
          <DropdownMenuContent
            align="end"
            onCloseAutoFocus={(e) => e.preventDefault()}
            className="w-auto border-2 border-slate-200"
          >
            {/* Maps over the configuration array to render the dropdown options. */}
            {viewOptions.map((option, index) => {
              const isActive = selectedView === option.value;
              const prevOption = viewOptions[index - 1];
              const isPrevActive = prevOption?.value === selectedView;

              return (
                <DropdownMenuItem
                  key={option.value}
                  onSelect={() => onViewSelect(option.value)}
                  className={cn(
                    dropdownItemStyle,
                    index > 0 && "mt-0.5",
                    isActive &&
                      "border-emerald-200 bg-emerald-50 text-emerald-700 [&_svg]:text-emerald-600",
                    isActive && index > 0 && !isPrevActive && "mt-1",
                    !isActive && isPrevActive && "mt-1"
                  )}
                >
                  <option.icon className="mr-2 h-4 w-4" />
                  <span>{option.label}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </Tooltip>
      {/* The information button. */}
      <Tooltip key="info-tooltip">
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            aria-label="Information"
            onClick={onInfoClick}
            className="relative -ml-[2px] size-8 cursor-pointer rounded-none rounded-r-md border-2 border-slate-200 bg-slate-100 text-slate-500 transition-all duration-300 ease-in-out hover:z-10 hover:border-emerald-500 hover:bg-emerald-100 hover:text-emerald-500 focus-visible:border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 md:size-9"
          >
            <IoInformation className="size-4 md:size-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-inter">Information</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

/**
 * Memoized version of the dashboard widget toolbar component.
 */
export const DashboardWidgetToolbar = memo(DashboardWidgetToolbarComponent) as <T extends string>(
  props: DashboardWidgetToolbarProps<T>
) => React.ReactElement;

(DashboardWidgetToolbar as React.NamedExoticComponent).displayName = "DashboardWidgetToolbar";
