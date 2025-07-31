import { motion } from "framer-motion";
import { memo } from "react";

import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { buttonClasses } from "@/features/cases/constants/styles";
import { cn } from "@/lib/utils";

type UploadFormActionsProps = {
  onPrev: () => void;
  onNext: () => void;
  isNextDisabled: boolean;
};

/**
 * Renders the 'Previous' and 'Next' action buttons for the upload form.
 */
export const UploadFormActions = memo(
  ({ onPrev, onNext, isNextDisabled }: UploadFormActionsProps) => {
    return (
      <motion.div
        layout
        transition={{ layout: { type: "tween", duration: 0.6, ease: "easeInOut" } }}
      >
        <CardFooter className="flex justify-between gap-x-4 px-0">
          <div className="flex-1">
            <Button type="button" onClick={onPrev} className={cn(buttonClasses, "w-full")}>
              Previous
            </Button>
          </div>
          <div className={cn("flex-1", isNextDisabled && "cursor-not-allowed")}>
            <Button
              onClick={onNext}
              disabled={isNextDisabled}
              className="font-inter disabled:cursor-not--allowed relative h-9 w-full cursor-pointer overflow-hidden rounded-lg border-none bg-emerald-600 text-sm font-normal text-white uppercase transition-all duration-300 ease-in-out before:absolute before:top-0 before:-left-full before:z-[-1] before:h-full before:w-full before:rounded-lg before:bg-gradient-to-r before:from-yellow-400 before:to-yellow-500 before:transition-all before:duration-600 before:ease-in-out hover:scale-100 hover:border-transparent hover:bg-green-600 hover:text-white hover:before:left-0 disabled:opacity-50 disabled:before:left-full disabled:hover:shadow-none md:h-10 md:text-base"
            >
              Next
            </Button>
          </div>
        </CardFooter>
      </motion.div>
    );
  }
);

UploadFormActions.displayName = "UploadFormActions";
