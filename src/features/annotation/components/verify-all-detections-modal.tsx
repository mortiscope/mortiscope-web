"use client";

import { memo } from "react";
import { PiInfo } from "react-icons/pi";

import { AnnotationModalContainer } from "@/features/annotation/components/annotation-modal-container";
import { AnnotationModalFooter } from "@/features/annotation/components/annotation-modal-footer";
import { AnnotationModalHeader } from "@/features/annotation/components/annotation-modal-header";
import { useAnnotationStore } from "@/features/annotation/store/annotation-store";

/**
 * Defines the props for the verify all detections modal component.
 */
interface VerifyAllDetectionsModalProps {
  /** The name of the image, displayed for confirmation. */
  imageName: string | null;
  /** Controls whether the modal is open or closed. */
  isOpen: boolean;
  /** Function to call when the modal's open state changes. */
  onOpenChange: (isOpen: boolean) => void;
}

/**
 * A modal to confirm the verification of all detections in the current image.
 * It informs the user about the action and handles the verification logic.
 *
 * @param {VerifyAllDetectionsModalProps} props The props for controlling the modal's state.
 */
export const VerifyAllDetectionsModal = memo(
  ({ imageName, isOpen, onOpenChange }: VerifyAllDetectionsModalProps) => {
    const verifyAllDetections = useAnnotationStore((state) => state.verifyAllDetections);

    /**
     * Handles the click event for the verify confirmation button.
     */
    const handleVerify = () => {
      verifyAllDetections();
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
          title="Verify All Detections"
          colorVariant="emerald"
          description={
            <>
              <p>
                Are you sure you want to mark all detections as verified in the image named{" "}
                <strong className="font-semibold break-all text-slate-800">{imageName}</strong>?
                This action is irreversible.
              </p>

              <div className="mt-4 flex items-start gap-3 rounded-2xl border-2 border-emerald-400 bg-emerald-100 p-4 text-left">
                <PiInfo className="h-5 w-5 flex-shrink-0 text-emerald-600" />
                <p className="flex-1 text-slate-700">
                  <strong className="font-semibold text-emerald-600">Note:</strong> Please make sure
                  that all detections are{" "}
                  <strong className="font-semibold text-slate-800">accurate</strong> and have been
                  thoroughly <strong className="font-semibold text-slate-800">assessed</strong>{" "}
                  before proceeding with this action.
                </p>
              </div>
            </>
          }
        />
        <AnnotationModalFooter
          onCancel={() => handleModalClose(false)}
          onConfirm={handleVerify}
          cancelText="Cancel"
          confirmText="Verify"
          buttonVariant="success"
        />
      </AnnotationModalContainer>
    );
  }
);

VerifyAllDetectionsModal.displayName = "VerifyAllDetectionsModal";
