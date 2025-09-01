import React, { memo } from "react";
import { GoPencil } from "react-icons/go";
import { LuEllipsisVertical, LuTrash2 } from "react-icons/lu";
import { MdOutlineRemoveRedEye } from "react-icons/md";
import { PiLightbulbFilament } from "react-icons/pi";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type Case } from "@/features/results/components/results-preview";
import { type ViewMode } from "@/features/results/store/results-store";
import { cn } from "@/lib/utils";

/**
 * Defines the props required by the case item dropdown component.
 */
interface CaseItemDropdownProps {
  /** The case object associated with this dropdown menu. */
  caseItem: Case;
  /** The current view mode ('list' or 'grid'), which affects the trigger's styling. */
  viewMode: ViewMode;
  /** A boolean indicating if the parent item is currently in renaming mode. */
  isRenameActive: boolean;
  /** A callback function to handle viewing the case details. */
  onView: (caseId: string) => void;
  /** A callback function to initiate the renaming process for the case. */
  onStartRename: (e: React.MouseEvent | Event, caseId: string, currentName: string) => void;
  /** A callback function to initiate the deletion of the case. */
  onDelete: (caseId: string, caseName: string) => void;
  /** A callback to confirm a rename, typically triggered when the menu closes while editing. */
  onConfirmRename: () => void;
  /** A callback function to handle opening the case information modal. */
  onDetails: (caseId: string) => void;
}

/**
 * Renders the dropdown menu with actions (Open, Rename, Delete) for a case item.
 * It handles complex interactions like confirming a rename on close and preventing event conflicts.
 */
export const CaseItemDropdown = memo(
  ({
    caseItem,
    viewMode,
    isRenameActive,
    onView,
    onStartRename,
    onDelete,
    onConfirmRename,
    onDetails,
  }: CaseItemDropdownProps) => {
    return (
      <DropdownMenu
        key={`case-dropdown-${caseItem.id}`}
        onOpenChange={(open) => {
          if (!open && isRenameActive) onConfirmRename();
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Options for ${caseItem.caseName}`}
            // Prevents the click event from bubbling up to the parent list item.
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "cursor-pointer rounded-full text-slate-500 transition-colors hover:bg-transparent hover:text-slate-700 focus-visible:ring-1 focus-visible:ring-slate-400 focus-visible:ring-offset-0",
              viewMode === "list" ? "h-8 w-8" : "absolute top-2 right-2 z-10 h-9 w-9 text-slate-800"
            )}
          >
            <LuEllipsisVertical className={viewMode === "list" ? "h-5 w-5" : "h-6 w-6"} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          // Prevents the default behavior of returning focus to the trigger on close.
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="w-40 border-2 border-slate-200"
        >
          <DropdownMenuItem
            onSelect={() => onView(caseItem.id)}
            className={cn(
              "font-inter cursor-pointer border-2 border-transparent text-slate-800 transition-colors duration-300 ease-in-out hover:border-emerald-200 hover:!text-emerald-600 focus:bg-emerald-100 hover:[&_svg]:!text-emerald-600"
            )}
          >
            <MdOutlineRemoveRedEye className="mr-2 h-4 w-4" />
            <span>Open</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => onDetails(caseItem.id)}
            className={cn(
              "font-inter mt-0.5 cursor-pointer border-2 border-transparent text-slate-800 transition-colors duration-300 ease-in-out hover:border-sky-200 hover:!text-sky-600 focus:bg-sky-100 hover:[&_svg]:!text-sky-600"
            )}
          >
            <PiLightbulbFilament className="mr-2 h-4 w-4" />
            <span>Details</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.stopPropagation();
              // Using `setTimeout` defers the execution of `onStartRename` to the next event loop cycle.
              setTimeout(() => onStartRename(e, caseItem.id, caseItem.caseName), 0);
            }}
            className={cn(
              "font-inter mt-0.5 cursor-pointer border-2 border-transparent text-slate-800 transition-colors duration-300 ease-in-out hover:border-amber-200 hover:!text-amber-600 focus:bg-amber-100 hover:[&_svg]:!text-amber-600"
            )}
          >
            <GoPencil className="mr-2 h-4 w-4" />
            <span>Rename</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => onDelete(caseItem.id, caseItem.caseName)}
            className={cn(
              "font-inter mt-0.5 cursor-pointer border-2 border-transparent text-slate-800 transition-colors duration-300 ease-in-out hover:border-rose-200 hover:!text-rose-600 focus:bg-red-100 hover:[&_svg]:!text-rose-600"
            )}
          >
            <LuTrash2 className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
);

CaseItemDropdown.displayName = "CaseItemDropdown";
