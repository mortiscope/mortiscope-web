"use client";

import { memo, useState } from "react";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AnnotationModalContainer } from "@/features/annotation/components/annotation-modal-container";
import { AnnotationModalFooter } from "@/features/annotation/components/annotation-modal-footer";
import { AnnotationModalHeader } from "@/features/annotation/components/annotation-modal-header";
import { cn } from "@/lib/utils";

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
    title: "Leave Without Saving",
    description: "Discard all unsaved changes and navigate away.",
  },
  {
    value: "save-and-leave" as const,
    title: "Save and Leave",
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
      <AnnotationModalContainer isOpen={isOpen} onOpenChange={handleModalClose}>
        <AnnotationModalHeader
          title="Unsaved Changes"
          colorVariant="rose"
          description={
            <>
              <p>
                You have unsaved changes that will be lost if you leave this page. What would you
                like to do?
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
                          "flex cursor-pointer flex-col rounded-2xl border-2 p-4 text-left transition-colors duration-300",
                          isPending && "cursor-not-allowed",
                          // Applies distinct styling for the selected option.
                          selectedAction === option.value
                            ? "border-rose-400 bg-rose-50"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        )}
                      >
                        <div className="flex items-start">
                          <RadioGroupItem
                            value={option.value}
                            id={option.value}
                            disabled={isPending}
                            className={cn(
                              "focus-visible:ring-rose-500/50",
                              selectedAction === option.value &&
                                "border-rose-600 text-rose-600 [&_svg]:fill-rose-600"
                            )}
                          />
                          <div className="ml-3">
                            <span className="font-inter font-medium text-slate-800">
                              {option.title}
                            </span>
                            <p className="font-inter mt-1.5 text-sm font-normal text-slate-600">
                              {option.description}
                            </p>
                          </div>
                        </div>
                      </Label>
                    );
                  })}
                </RadioGroup>
              </div>
            </>
          }
        />
        <AnnotationModalFooter
          onCancel={() => handleModalClose(false)}
          onConfirm={handleProceed}
          cancelText="Cancel"
          confirmText="Proceed"
          buttonVariant="destructive"
          isPending={isPending}
        />
      </AnnotationModalContainer>
    );
  }
);

UnsavedChangesModal.displayName = "UnsavedChangesModal";
