"use client";

import { PiCalculator } from "react-icons/pi";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Defines the props for the results recalculate button component.
 */
interface ResultsRecalculateButtonProps {
  /** The unique identifier of the case to recalculate. */
  caseId: string;
  /** Controls whether the button is disabled. */
  isDisabled?: boolean;
  /** An optional click handler for the button. */
  onClick?: () => void;
}

/**
 * Renders a button to trigger the PMI recalculation process.
 * It displays as an icon-only button on small screens and includes a tooltip
 * that is only active when the button is enabled.
 *
 * @param {ResultsRecalculateButtonProps} props The component props.
 */
export const ResultsRecalculateButton = ({
  isDisabled,
  onClick,
}: ResultsRecalculateButtonProps) => {
  const handleRecalculate = () => {
    // If an onClick handler is provided, call it.
    if (onClick) {
      onClick();
    }
  };

  const ButtonComponent = (
    <span className={isDisabled ? "cursor-not-allowed" : ""} tabIndex={isDisabled ? -1 : undefined}>
      <Button
        variant="outline"
        aria-label="Recalculate PMI"
        disabled={isDisabled}
        onClick={handleRecalculate}
        className="flex h-10 shrink-0 cursor-pointer items-center justify-center border-2 border-slate-200 bg-white px-2 shadow-none hover:bg-slate-50 focus-visible:ring-0 focus-visible:ring-offset-0 sm:gap-2 sm:px-3"
      >
        <PiCalculator className="h-4 w-4 shrink-0 text-slate-600" />
        <span className="font-inter hidden text-sm font-normal text-slate-800 sm:inline">
          Recalculate
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
        <p className="font-inter">Recalculate PMI</p>
      </TooltipContent>
    </Tooltip>
  );
};
