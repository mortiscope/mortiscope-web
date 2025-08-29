import { motion, type Variants } from "framer-motion";
import React, { memo } from "react";

import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { buttonClasses, cancelButtonClasses } from "@/features/cases/constants/styles";
import { cn } from "@/lib/utils";

/**
 * Defines the props required by the ReviewActions component.
 */
interface ReviewActionsProps {
  /** A boolean to indicate if the analysis is in the final "processing" state, which changes the button layout. */
  isProcessing: boolean;
  /** A boolean to show the pending state for the cancellation action. */
  isCancelling: boolean;
  /** A boolean to show the pending state for the submission action. */
  isSubmitting: boolean;
  /** A general pending state, likely from `useTransition`, to disable navigation. */
  isPending: boolean;
  /** A callback function to cancel the ongoing analysis. */
  onCancel: () => void;
  /** A callback function to navigate to the previous step. */
  onPrevious: () => void;
  /** A callback function to submit the analysis. */
  onSubmit: () => void;
  /** Framer Motion variants for the entrance animation. */
  variants: Variants;
}

/**
 * A memoized component that renders the footer containing the action buttons for the review step.
 * Its layout and button states change dynamically based on the current processing status.
 */
export const ReviewActions = memo(
  ({
    isProcessing,
    isCancelling,
    isSubmitting,
    isPending,
    onCancel,
    onPrevious,
    onSubmit,
    variants,
  }: ReviewActionsProps) => {
    return (
      // The main animated container for the actions footer.
      <motion.div variants={variants}>
        <CardFooter className="relative z-20 flex justify-between gap-x-4 px-0">
          {/* The component renders one of two layouts based on the `isProcessing` flag. */}
          {isProcessing ? (
            // A single, full-width cancel button shown during the final processing state.
            <div className={cn("flex flex-1", { "cursor-not-allowed": isCancelling })}>
              <Button
                onClick={onCancel}
                disabled={isCancelling}
                className={cn(cancelButtonClasses)}
              >
                {isCancelling ? "Cancelling..." : "Cancel"}
              </Button>
            </div>
          ) : (
            // The standard layout with previous and submit buttons.
            <>
              {/* The previous navigation button. */}
              <div
                className={cn("flex flex-1", { "cursor-not-allowed": isPending || isSubmitting })}
              >
                <Button
                  onClick={onPrevious}
                  className={cn(buttonClasses)}
                  disabled={isPending || isSubmitting}
                >
                  Previous
                </Button>
              </div>

              {/* The final submit button. */}
              <div
                className={cn("flex flex-1", { "cursor-not-allowed": isSubmitting || isPending })}
              >
                <Button
                  onClick={onSubmit}
                  className={cn(buttonClasses)}
                  disabled={isSubmitting || isPending}
                >
                  {isSubmitting ? "Submitting..." : "Submit"}
                </Button>
              </div>
            </>
          )}
        </CardFooter>
      </motion.div>
    );
  }
);

ReviewActions.displayName = "ReviewActions";
