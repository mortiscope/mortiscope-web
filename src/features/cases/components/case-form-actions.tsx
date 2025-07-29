import { memo } from "react";

import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { buttonClasses } from "@/features/cases/constants/styles";
import { cn } from "@/lib/utils";

type CaseFormActionsProps = {
  status: string;
  isSaving: boolean;
  isValid: boolean;
  onPrev: () => void;
};

/**
 * Renders the action buttons for the form, such as 'Previous' and 'Save and Continue'.
 */
export const CaseFormActions = memo(
  ({ status, isSaving, isValid, onPrev }: CaseFormActionsProps) => {
    return (
      <CardFooter className="flex justify-between gap-x-4 px-0 pt-6">
        {/* The 'Previous' button is only rendered if it's not the first step. */}
        {status !== "details" && (
          <Button type="button" onClick={onPrev} disabled={isSaving} className={cn(buttonClasses)}>
            Previous
          </Button>
        )}

        {/* Wrapper for the 'Save and Continue' button. */}
        <div
          className={cn("flex-1", {
            "cursor-not-allowed": !isValid || isSaving,
            "w-full": status === "details",
          })}
        >
          <Button
            type="submit"
            disabled={!isValid || isSaving}
            className={cn(buttonClasses, "w-full")}
          >
            {isSaving ? "Saving..." : "Save and Continue"}
          </Button>
        </div>
      </CardFooter>
    );
  }
);

CaseFormActions.displayName = "CaseFormActions";
