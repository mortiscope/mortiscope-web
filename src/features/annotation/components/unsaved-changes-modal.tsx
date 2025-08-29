"use client";

import { motion, type Variants } from "framer-motion";
import { memo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

/**
 * Framer Motion variants for the main modal content container.
 * This orchestrates the animation of its children with a staggered effect.
 */
const modalContentVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { delayChildren: 0.2, staggerChildren: 0.2 } },
};

/**
 * Framer Motion variants for individual animated items in the modal.
 * This creates the slide-up and fade-in effect.
 */
const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring", damping: 20, stiffness: 150 } },
};

/**
 * Defines the possible actions a user can choose in the modal.
 */
type NavigationAction = "leave" | "save-and-leave";

/**
 * Defines the props for the unsaved changes modal component.
 */
interface UnsavedChangesModalProps {
  /** A boolean to control the visibility of the modal. */
  isOpen: boolean;
  /** A callback function to handle changes to the modal's open state. */
  onOpenChange: (isOpen: boolean) => void;
  /** A callback function invoked with the user's chosen action when they click proceed. */
  onProceed: (action: NavigationAction) => void;
  /** An optional boolean to indicate if an action is in progress, which disables the modal controls. */
  isPending?: boolean;
}

/**
 * A configuration array that defines the options for the radio group.
 * This approach centralizes the options to make it easy to manage and map over in the interface.
 */
const navigationOptions = [
  {
    value: "leave" as const,
    description: "Discard all unsaved changes and navigate away.",
  },
  {
    value: "save-and-leave" as const,
    description: "Save all changes before navigating away.",
  },
];

/**
 * A smart modal component that prompts the user to either save or discard their unsaved
 * changes before navigating away from a page. It manages its own internal selection state
 * and communicates the user's final decision to the parent component.
 */
export const UnsavedChangesModal = memo(
  ({ isOpen, onOpenChange, onProceed, isPending = false }: UnsavedChangesModalProps) => {
    /** Local state to manage the user's selected action. */
    const [selectedAction, setSelectedAction] = useState<NavigationAction>("leave");

    /**
     * Invokes the `onProceed` callback with the currently selected action.
     */
    const handleProceed = () => {
      onProceed(selectedAction);
    };

    /**
     * A wrapper for `onOpenChange` that prevents the user from closing the modal
     * while an action is pending.
     */
    const handleModalClose = (open: boolean) => {
      if (!isPending) {
        onOpenChange(open);
      }
    };

    return (
      <Dialog open={isOpen} onOpenChange={handleModalClose}>
        <DialogContent className="flex flex-col rounded-2xl bg-white p-0 shadow-2xl sm:max-w-sm md:rounded-3xl">
          <motion.div
            className="contents"
            variants={modalContentVariants}
            initial="hidden"
            animate="show"
          >
            {/* Header Section */}
            <motion.div variants={itemVariants} className="shrink-0 px-6 pt-6">
              <DialogHeader className="text-center">
                <DialogTitle className="font-plus-jakarta-sans text-center text-xl font-bold text-rose-600 md:text-2xl">
                  Unsaved Changes
                </DialogTitle>
                <DialogDescription asChild>
                  <div className="font-inter pt-4 text-center text-sm text-slate-600">
                    <p>
                      You have unsaved changes that will be lost if you leave this page. What would
                      you like to do?
                    </p>

                    {/* Radio Group Section for user action selection */}
                    <div className={cn("mt-4", isPending && "pointer-events-none opacity-50")}>
                      <RadioGroup
                        value={selectedAction}
                        onValueChange={(value) => setSelectedAction(value as NavigationAction)}
                        className="gap-1.5 space-y-2"
                      >
                        {navigationOptions.map((option) => {
                          return (
                            <Label
                              key={option.value}
                              htmlFor={option.value}
                              className={cn(
                                "flex items-center rounded-2xl border-2 p-4 text-left transition-colors duration-300",
                                isPending ? "cursor-not-allowed" : "cursor-pointer",
                                // Applies distinct styling for the selected option.
                                selectedAction === option.value
                                  ? "border-rose-400 bg-rose-50"
                                  : "border-slate-200 bg-white hover:bg-slate-50"
                              )}
                            >
                              <RadioGroupItem
                                value={option.value}
                                id={option.value}
                                disabled={isPending}
                                className={cn(
                                  "mr-3 shrink-0",
                                  "focus-visible:ring-rose-500/50",
                                  selectedAction === option.value &&
                                    "border-rose-600 text-rose-600 [&_svg]:fill-rose-600"
                                )}
                              />
                              <p className="font-inter flex-1 text-sm font-normal text-slate-700">
                                {option.description}
                              </p>
                            </Label>
                          );
                        })}
                      </RadioGroup>
                    </div>
                  </div>
                </DialogDescription>
              </DialogHeader>
            </motion.div>

            {/* Footer/Actions Section */}
            <motion.div variants={itemVariants} className="shrink-0 px-6 pt-4 pb-6">
              <DialogFooter className="flex w-full flex-row gap-3">
                <div className={cn("flex-1", isPending && "cursor-not-allowed")}>
                  <Button
                    variant="outline"
                    onClick={() => handleModalClose(false)}
                    disabled={isPending}
                    className="font-inter h-10 w-full cursor-pointer uppercase transition-all duration-300 ease-in-out hover:bg-slate-100"
                  >
                    Cancel
                  </Button>
                </div>

                <div className={cn("flex-1", isPending && "cursor-not-allowed")}>
                  <Button
                    onClick={handleProceed}
                    disabled={isPending}
                    className="font-inter flex h-10 w-full cursor-pointer items-center justify-center gap-2 bg-rose-600 uppercase transition-all duration-300 ease-in-out hover:bg-rose-500 hover:shadow-lg hover:shadow-rose-500/20"
                  >
                    Proceed
                  </Button>
                </div>
              </DialogFooter>
            </motion.div>
          </motion.div>
        </DialogContent>
      </Dialog>
    );
  }
);

UnsavedChangesModal.displayName = "UnsavedChangesModal";
