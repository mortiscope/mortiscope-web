"use client";

import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { buttonClasses } from "@/features/cases/constants/styles";
import { cn } from "@/lib/utils";

interface EditCaseSheetFooterProps {
  activeTab: string;
  isSubmitting: boolean;
  isDisabled: boolean;
}

/**
 * Renders the animated footer for the Edit Case sheet, containing the save button.
 */
export const EditCaseSheetFooter = React.memo(
  ({ activeTab, isSubmitting, isDisabled }: EditCaseSheetFooterProps) => {
    return (
      <AnimatePresence>
        {activeTab !== "history" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <CardFooter className="shrink-0 border-t-2 border-slate-200 p-4">
              <div className={cn("w-full", { "cursor-not-allowed": isDisabled })}>
                <Button type="submit" disabled={isDisabled} className={cn(buttonClasses, "w-full")}>
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardFooter>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);

EditCaseSheetFooter.displayName = "EditCaseSheetFooter";
