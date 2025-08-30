"use client";

import { memo, useState } from "react";
import { PiInfo } from "react-icons/pi";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AnnotationModalContainer } from "@/features/annotation/components/annotation-modal-container";
import { AnnotationModalFooter } from "@/features/annotation/components/annotation-modal-footer";
import { AnnotationModalHeader } from "@/features/annotation/components/annotation-modal-header";
import { HIDE_SAVE_CONFIRMATION } from "@/lib/constants";

/**
 * Defines the props for the save confirmation modal component.
 */
interface SaveConfirmationModalProps {
  /** The name of the image being saved. */
  imageName: string | null;
  /** Controls whether the modal is open or closed. */
  isOpen: boolean;
  /** Function to call when the modal's open state changes. */
  onOpenChange: (isOpen: boolean) => void;
  /** Function to call when save is confirmed. */
  onConfirm: () => void;
}

/**
 * A modal to confirm saving changes to detections.
 */
export const SaveConfirmationModal = memo(
  ({ imageName, isOpen, onOpenChange, onConfirm }: SaveConfirmationModalProps) => {
    const [doNotShowAgain, setDoNotShowAgain] = useState(false);

    /**
     * Handles the save confirmation.
     */
    const handleSave = () => {
      // Store preference in localStorage if checkbox is checked
      if (doNotShowAgain) {
        localStorage.setItem(HIDE_SAVE_CONFIRMATION, "true");
      }

      onConfirm();
      onOpenChange(false);
    };

    /**
     * Handles the modal close action.
     */
    const handleModalClose = (open: boolean) => {
      if (!open) {
        setDoNotShowAgain(false);
      }
      onOpenChange(open);
    };

    return (
      <AnnotationModalContainer isOpen={isOpen} onOpenChange={handleModalClose}>
        <AnnotationModalHeader
          title="Save Changes"
          colorVariant="emerald"
          description={
            <>
              <p>
                Are you sure you want to save all changes to the image named{" "}
                <strong className="font-semibold break-all text-slate-800">{imageName}</strong>?
              </p>

              <div className="mt-4 flex items-start gap-3 rounded-2xl border-2 border-emerald-400 bg-emerald-100 p-4 text-left">
                <PiInfo className="h-5 w-5 flex-shrink-0 text-emerald-600" />
                <p className="flex-1 text-slate-700">
                  <strong className="font-semibold text-emerald-600">Note:</strong> This will save
                  all your edits including{" "}
                  <strong className="font-semibold text-slate-800">added</strong>,{" "}
                  <strong className="font-semibold text-slate-800">deleted</strong>, and{" "}
                  <strong className="font-semibold text-slate-800">modified</strong> detections. The
                  state before won&apos;t be recovered anymore after saving.
                </p>
              </div>

              {/* Do not show again checkbox */}
              <div className="mt-4 flex items-center space-x-2">
                <Checkbox
                  id="do-not-show-again"
                  checked={doNotShowAgain}
                  onCheckedChange={(checked) => setDoNotShowAgain(!!checked)}
                  className="cursor-pointer data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600"
                />
                <Label
                  htmlFor="do-not-show-again"
                  className="font-inter cursor-pointer text-sm font-normal text-slate-700"
                >
                  Do not show this message again
                </Label>
              </div>
            </>
          }
        />
        <AnnotationModalFooter
          onCancel={() => handleModalClose(false)}
          onConfirm={handleSave}
          cancelText="Cancel"
          confirmText="Save"
          buttonVariant="success"
        />
      </AnnotationModalContainer>
    );
  }
);

SaveConfirmationModal.displayName = "SaveConfirmationModal";

/**
 * Helper function to check if the user has opted to hide the save confirmation modal.
 */
export const shouldShowSaveConfirmation = (): boolean => {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(HIDE_SAVE_CONFIRMATION) !== "true";
};
