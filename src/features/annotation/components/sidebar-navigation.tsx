import { motion } from "framer-motion";
import { Fragment, memo } from "react";
import { FaRegKeyboard } from "react-icons/fa";
import { FiMoreHorizontal } from "react-icons/fi";
import { GoFileCode } from "react-icons/go";
import { IoSettingsOutline } from "react-icons/io5";
import { RxImage } from "react-icons/rx";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type SidebarItem } from "@/features/annotation/hooks/use-editor-sidebar";
import { cn } from "@/lib/utils";

/**
 * Defines the structure for a single sidebar button configuration.
 */
type SidebarButton = {
  id: SidebarItem;
  icon: React.ElementType;
  label: string;
};

/**
 * A configuration array that defines the buttons for the sidebar. This approach
 * centralizes the options, making them easy to manage and map over in the UI.
 */
const sidebarButtons: SidebarButton[] = [
  {
    id: "annotation",
    icon: GoFileCode,
    label: "Annotation",
  },
  {
    id: "attributes",
    icon: RxImage,
    label: "Attributes",
  },
  {
    id: "shortcuts",
    icon: FaRegKeyboard,
    label: "Shortcuts",
  },
  {
    id: "settings",
    icon: IoSettingsOutline,
    label: "Settings",
  },
];

/**
 * Defines the props for the sidebar navigation component.
 */
interface SidebarNavigationProps {
  /** The currently selected sidebar item. */
  selectedItem: SidebarItem | null;
  /** A boolean to control the visibility of the sidebar on mobile view. */
  isMobileSidebarOpen: boolean;
  /** A boolean indicating if the current view is mobile. */
  isMobile: boolean;
  /** Callback to handle button clicks. */
  onButtonClick: (itemId: SidebarItem) => void;
}

/**
 * A presentational component that renders the sidebar navigation with buttons for different panels.
 * Includes tooltips, separators, and responsive behavior for mobile devices.
 *
 * @param {SidebarNavigationProps} props The props for the component.
 * @returns A React component representing the sidebar navigation.
 */
export const SidebarNavigation = memo(function SidebarNavigation({
  selectedItem,
  isMobileSidebarOpen,
  isMobile,
  onButtonClick,
}: SidebarNavigationProps) {
  /** A shared class string for consistent styling of the sidebar buttons. */
  const buttonClasses =
    "font-plus-jakarta-sans h-9 md:h-10 w-full cursor-pointer rounded-lg bg-transparent px-2 md:px-3 text-sm font-normal ring-offset-emerald-800 transition-colors duration-300 ease-in-out hover:bg-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none active:bg-emerald-700 [&>svg]:!size-5 md:[&>svg]:!size-5.25";

  /** A class string applied to the active sidebar button for a distinct visual state. */
  const activeClasses =
    "bg-gradient-to-b from-emerald-600 to-emerald-700 hover:from-emerald-600 hover:to-emerald-700";

  return (
    <motion.aside
      initial={false}
      animate={{ x: isMobile ? (isMobileSidebarOpen ? 0 : -64) : 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed top-16 left-0 z-20 flex h-[calc(100vh-4rem)] w-16 flex-col items-center justify-center bg-emerald-800 px-2 py-4 md:top-20 md:h-[calc(100vh-5rem)] md:w-24 md:px-3 md:py-6"
    >
      <nav className="flex w-full flex-col gap-1.5 px-1 md:gap-2 md:px-2">
        {sidebarButtons.map((button, index) => {
          const isActive = selectedItem === button.id;
          // Hide shortcuts button on small devices only
          const isHidden = button.id === "shortcuts";

          // The button is defined as a variable to be passed to the tooltip trigger.
          const ButtonElement = (
            <Button
              onClick={() => onButtonClick(button.id)}
              className={cn(buttonClasses, isActive && activeClasses, isHidden && "hidden md:flex")}
              aria-label={button.label}
              aria-pressed={isActive}
              variant="ghost"
              size="lg"
            >
              <button.icon className="text-white" />
            </Button>
          );

          return (
            <Fragment key={button.id}>
              {/* Conditionally disabled the tooltip when a panel is open to prevent it from overlapping. */}
              <Tooltip open={selectedItem ? false : undefined}>
                <TooltipTrigger asChild>{ButtonElement}</TooltipTrigger>
                <TooltipContent side="right" align="center" className="font-inter">
                  <p>{button.label}</p>
                </TooltipContent>
              </Tooltip>
              {/* Renders a separator between buttons. */}
              {index < sidebarButtons.length - 1 && (
                <div className={cn("flex justify-center", isHidden && "hidden md:flex")}>
                  <FiMoreHorizontal className="h-4 w-4 text-emerald-400 md:h-5 md:w-5" />
                </div>
              )}
            </Fragment>
          );
        })}
      </nav>
    </motion.aside>
  );
});

SidebarNavigation.displayName = "SidebarNavigation";
