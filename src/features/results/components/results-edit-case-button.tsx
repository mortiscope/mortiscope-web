"use client";

import { PiNotePencil } from "react-icons/pi";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Defines the props for the results edit case button component.
 */
interface ResultsEditCaseButtonProps {
  /** Controls whether the button is disabled. */
  isDisabled?: boolean;
  /** An optional click handler for the button. */
  onClick?: () => void;
}

/**
 * Renders a button to open the case editing sheet.
 * It displays as an icon-only button on small screens and includes a tooltip
 * that is only active when the button is enabled.
 *
 * @param {ResultsEditCaseButtonProps} props The component props.
 */
export const ResultsEditCaseButton = ({ isDisabled, onClick }: ResultsEditCaseButtonProps) => {
  const handleEdit = () => {
    // If an onClick handler is provided, call it.
    if (onClick) {
      onClick();
    }
  };

  const ButtonComponent = (
    <span className={isDisabled ? "cursor-not-allowed" : ""} tabIndex={isDisabled ? -1 : undefined}>
      <Button
        variant="outline"
        aria-label="Edit Case"
        disabled={isDisabled}
        onClick={handleEdit}
        className="flex h-10 w-11 shrink-0 cursor-pointer items-center justify-center border-2 border-slate-200 bg-white px-2 shadow-none hover:bg-slate-50 focus-visible:ring-0 focus-visible:ring-offset-0 sm:w-[130px] sm:gap-2 sm:px-3"
      >
        <PiNotePencil className="h-4 w-4 shrink-0 text-slate-600" />
        <span className="font-inter hidden text-sm font-normal text-slate-800 sm:inline">
          Edit Case
        </span>
      </Button>
    </span>
  );

  // Conditionally render the tooltip wrapper.
  return isDisabled ? (
    ButtonComponent
  ) : (
    <Tooltip>
      <TooltipTrigger asChild>{ButtonComponent}</TooltipTrigger>
      <TooltipContent className="bg-slate-800 text-white sm:hidden">
        <p className="font-inter">Edit Case</p>
      </TooltipContent>
    </Tooltip>
  );
};
