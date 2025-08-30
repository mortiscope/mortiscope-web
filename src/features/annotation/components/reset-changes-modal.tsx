"use client";

import { memo } from "react";
import { PiWarning } from "react-icons/pi";

import { AnnotationModalContainer } from "@/features/annotation/components/annotation-modal-container";
import { AnnotationModalFooter } from "@/features/annotation/components/annotation-modal-footer";
import { AnnotationModalHeader } from "@/features/annotation/components/annotation-modal-header";
import { useAnnotationStore } from "@/features/annotation/store/annotation-store";

/**
 * Defines the props for the reset changes modal component.
 */
interface ResetChangesModalProps {
  /** The name of the image, displayed for confirmation. */
  imageName: string | null;
  /** Controls whether the modal is open or closed. */
  isOpen: boolean;
  /** Function to call when the modal's open state changes. */
  onOpenChange: (isOpen: boolean) => void;
}

/**
 * A modal to confirm resetting all changes to detections in the current image.
 * It warns the user about the action and handles the reset logic.
 *
 * @param {ResetChangesModalProps} props The props for controlling the modal's state.
 */
export const ResetChangesModal = memo(
  ({ imageName, isOpen, onOpenChange }: ResetChangesModalProps) => {
    const resetDetections = useAnnotationStore((state) => state.resetDetections);

    /**
     * Handles the click event for the reset confirmation button.
     */
    const handleReset = () => {
      resetDetections();
      onOpenChange(false);
    };

    /**
     * Handles the modal close action
     */
    const handleModalClose = (open: boolean) => {
      onOpenChange(open);
    };

    return (
      <AnnotationModalContainer isOpen={isOpen} onOpenChange={handleModalClose}>
        <AnnotationModalHeader
          title="Reset Changes"
          colorVariant="amber"
          description={
            <>
              <p>
                Are you sure you want to reset all changes to the image named{" "}
                <strong className="font-semibold break-all text-slate-800">{imageName}</strong>?
                This will restore all detections to their state from the previous saved.
              </p>

              <div className="mt-4 flex items-start gap-3 rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 text-left">
                <PiWarning className="h-5 w-5 flex-shrink-0 text-amber-500" />
                <p className="flex-1 text-slate-700">
                  <strong className="font-semibold text-amber-500">Warning:</strong> This action
                  will undo all your edits, including{" "}
                  <strong className="font-semibold text-slate-800">added</strong>,{" "}
                  <strong className="font-semibold text-slate-800">deleted</strong>, and{" "}
                  <strong className="font-semibold text-slate-800">modified</strong> detections.
                  This cannot be undone.
                </p>
              </div>
            </>
          }
        />
        <AnnotationModalFooter
          onCancel={() => handleModalClose(false)}
          onConfirm={handleReset}
          cancelText="Cancel"
          confirmText="Reset"
          buttonVariant="warning"
        />
      </AnnotationModalContainer>
    );
  }
);

ResetChangesModal.displayName = "ResetChangesModal";
