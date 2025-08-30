"use client";

import { memo } from "react";

import { AnnotationModalContainer } from "@/features/annotation/components/annotation-modal-container";
import { AnnotationModalFooter } from "@/features/annotation/components/annotation-modal-footer";
import { AnnotationModalHeader } from "@/features/annotation/components/annotation-modal-header";

/**
 * Defines the props for the unverified status modal component.
 */
interface UnverifiedStatusModalProps {
  /** Controls whether the modal is open or closed. */
  isOpen: boolean;
  /** Function to call when the modal's open state changes. */
  onOpenChange: (isOpen: boolean) => void;
}

/**
 * An informational modal that explains what the unverified status means.
 * This modal provides details about unverified detections in an image.
 *
 * @param {UnverifiedStatusModalProps} props The props for controlling the modal's state.
 */
export const UnverifiedStatusModal = memo(
  ({ isOpen, onOpenChange }: UnverifiedStatusModalProps) => {
    /**
     * Handles the modal close action
     */
    const handleModalClose = (open: boolean) => {
      onOpenChange(open);
    };

    return (
      <AnnotationModalContainer isOpen={isOpen} onOpenChange={handleModalClose}>
        <AnnotationModalHeader
          title="Unverified"
          colorVariant="amber"
          description={
            <div className="text-left">
              <p className="mb-3">
                This status indicates that some detections in the current image have not been
                reviewed or confirmed.
              </p>
              <ul className="space-y-1 text-slate-600">
                <li className="flex items-start">
                  <span className="mt-1.5 mr-3 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                  <p>
                    <strong className="font-medium text-slate-700">Pending Review:</strong> Some
                    detections have not been manually inspected yet.
                  </p>
                </li>
                <li className="flex items-start">
                  <span className="mt-1.5 mr-3 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                  <p>
                    <strong className="font-medium text-slate-700">Needs Verification:</strong>{" "}
                    Unverified detections may require confirmation or correction.
                  </p>
                </li>
                <li className="flex items-start">
                  <span className="mt-1.5 mr-3 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                  <p>
                    <strong className="font-medium text-slate-700">Action Required:</strong> Review
                    and verify all detections to make it verified.
                  </p>
                </li>
              </ul>
            </div>
          }
        />
        <AnnotationModalFooter
          onConfirm={() => handleModalClose(false)}
          confirmText="Understood"
          buttonVariant="warning"
          singleButton
        />
      </AnnotationModalContainer>
    );
  }
);

UnverifiedStatusModal.displayName = "UnverifiedStatusModal";
