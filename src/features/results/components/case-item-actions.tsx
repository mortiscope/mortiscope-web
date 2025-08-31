import React, { memo } from "react";
import { GoPencil } from "react-icons/go";
import { LuTrash2 } from "react-icons/lu";
import { MdOutlineRemoveRedEye } from "react-icons/md";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type Case } from "@/features/results/components/results-preview";
import { VerificationIndicator } from "@/features/results/components/verification-indicator";

/**
 * Defines the props required by the case item actions component.
 */
interface CaseItemActionsProps {
  /** The case object associated with this set of actions. */
  caseItem: Case;
  /** A callback function to handle viewing the case details. */
  onView: (caseId: string) => void;
  /** A callback function to initiate the renaming process for the case. */
  onStartRename: (e: React.MouseEvent | Event, caseId: string, currentName: string) => void;
  /** A callback function to initiate the deletion of the case. */
  onDelete: (caseId: string, caseName: string) => void;
}

/**
 * A memoized component that renders the row of action icons (View, Rename, Delete) for a case list item.
 */
export const CaseItemActions = memo(
  ({ caseItem, onView, onStartRename, onDelete }: CaseItemActionsProps) => {
    return (
      // The main container is hidden by default and becomes a flex container on large screens and up.
      <div className="hidden flex-shrink-0 items-center gap-1 lg:flex">
        {/* Verified Indicator */}
        <VerificationIndicator verificationStatus={caseItem.verificationStatus} className="mr-2" />
        {/* View Action */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`View ${caseItem.caseName}`}
              onClick={(e) => {
                // Prevents the click event from bubbling up to the parent list item's onClick handler.
                e.stopPropagation();
                onView(caseItem.id);
              }}
              className="h-8 w-8 cursor-pointer text-slate-500 transition-colors duration-300 ease-in-out hover:bg-amber-100 hover:text-amber-600"
            >
              <MdOutlineRemoveRedEye className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-inter">View</p>
          </TooltipContent>
        </Tooltip>
        {/* Rename Action */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Rename ${caseItem.caseName}`}
              onClick={(e) => onStartRename(e, caseItem.id, caseItem.caseName)}
              className="h-8 w-8 cursor-pointer text-slate-500 transition-colors duration-300 ease-in-out hover:bg-sky-100 hover:text-sky-600"
            >
              <GoPencil className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-inter">Rename</p>
          </TooltipContent>
        </Tooltip>
        {/* Delete Action */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Delete ${caseItem.caseName}`}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(caseItem.id, caseItem.caseName);
              }}
              className="h-8 w-8 cursor-pointer text-slate-500 transition-colors duration-300 ease-in-out hover:bg-rose-100 hover:text-rose-600"
            >
              <LuTrash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-inter">Delete</p>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }
);

CaseItemActions.displayName = "CaseItemActions";
