"use client";

import { memo } from "react";

import { AnnotationModalContainer } from "@/features/annotation/components/annotation-modal-container";
import { AnnotationModalFooter } from "@/features/annotation/components/annotation-modal-footer";
import { AnnotationModalHeader } from "@/features/annotation/components/annotation-modal-header";

/**
 * Defines the props for the in-progress status modal component.
 */
interface InProgressStatusModalProps {
  /** Controls whether the modal is open or closed. */
  isOpen: boolean;
  /** Function to call when the modal's open state changes. */
  onOpenChange: (isOpen: boolean) => void;
}

/**
 * An informational modal that explains what the in-progress status means.
 * This modal provides details about partially verified detections in an image.
 *
 * @param {InProgressStatusModalProps} props The props for controlling the modal's state.
 */
export const InProgressStatusModal = memo(
  ({ isOpen, onOpenChange }: InProgressStatusModalProps) => {
    /**
     * Handles the modal close action
     */
    const handleModalClose = (open: boolean) => {
      onOpenChange(open);
    };

    return (
      <AnnotationModalContainer isOpen={isOpen} onOpenChange={handleModalClose}>
        <AnnotationModalHeader
          title="In Progress"
          colorVariant="sky"
          description={
            <div className="text-left">
              <p className="mb-3">
                This status indicates that some detections in the current image have been verified,
                but others still require review.
              </p>
              <ul className="space-y-1 text-slate-600">
                <li className="flex items-start">
                  <span className="mt-1.5 mr-3 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                  <p>
                    <strong className="font-medium text-slate-700">Partial Progress:</strong> Some
                    detections have been verified, but not all.
                  </p>
                </li>
                <li className="flex items-start">
                  <span className="mt-1.5 mr-3 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                  <p>
                    <strong className="font-medium text-slate-700">Ongoing Review:</strong> Continue
                    verifying remaining detections to complete the image.
                  </p>
                </li>
                <li className="flex items-start">
                  <span className="mt-1.5 mr-3 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                  <p>
                    <strong className="font-medium text-slate-700">Action Required:</strong> Review
                    and verify all remaining detections to mark it as fully verified.
                  </p>
                </li>
              </ul>
            </div>
          }
        />
        <AnnotationModalFooter
          onConfirm={() => handleModalClose(false)}
          confirmText="Understood"
          buttonVariant="info"
          singleButton
        />
      </AnnotationModalContainer>
    );
  }
);

InProgressStatusModal.displayName = "InProgressStatusModal";
