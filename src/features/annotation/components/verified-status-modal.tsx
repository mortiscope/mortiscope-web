"use client";

import { memo } from "react";

import { AnnotationModalContainer } from "@/features/annotation/components/annotation-modal-container";
import { AnnotationModalFooter } from "@/features/annotation/components/annotation-modal-footer";
import { AnnotationModalHeader } from "@/features/annotation/components/annotation-modal-header";

/**
 * Defines the props for the verified status modal component.
 */
interface VerifiedStatusModalProps {
  /** Controls whether the modal is open or closed. */
  isOpen: boolean;
  /** Function to call when the modal's open state changes. */
  onOpenChange: (isOpen: boolean) => void;
}

/**
 * An informational modal that explains what the verified status means.
 * This modal provides details about verified detections in an image.
 *
 * @param {VerifiedStatusModalProps} props The props for controlling the modal's state.
 */
export const VerifiedStatusModal = memo(({ isOpen, onOpenChange }: VerifiedStatusModalProps) => {
  /**
   * Handles the modal close action
   */
  const handleModalClose = (open: boolean) => {
    onOpenChange(open);
  };

  return (
    <AnnotationModalContainer isOpen={isOpen} onOpenChange={handleModalClose}>
      <AnnotationModalHeader
        title="Verified"
        colorVariant="emerald"
        description={
          <div className="text-left">
            <p className="mb-3">
              This status indicates that all detections in the current image have been verified and
              confirmed as accurate.
            </p>
            <ul className="space-y-1 text-slate-600">
              <li className="flex items-start">
                <span className="mt-1.5 mr-3 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <p>
                  <strong className="font-medium text-slate-700">Fully Reviewed:</strong> Every
                  detection has been manually inspected and verified.
                </p>
              </li>
              <li className="flex items-start">
                <span className="mt-1.5 mr-3 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <p>
                  <strong className="font-medium text-slate-700">Complete:</strong> This image is
                  ready and all annotations have been confirmed.
                </p>
              </li>
              <li className="flex items-start">
                <span className="mt-1.5 mr-3 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <p>
                  <strong className="font-medium text-slate-700">Still Editable:</strong> You can
                  modify detections if you notice any missed or incorrect annotations.
                </p>
              </li>
            </ul>
          </div>
        }
      />
      <AnnotationModalFooter
        onConfirm={() => handleModalClose(false)}
        confirmText="Understood"
        buttonVariant="success"
        singleButton
      />
    </AnnotationModalContainer>
  );
});

VerifiedStatusModal.displayName = "VerifiedStatusModal";
