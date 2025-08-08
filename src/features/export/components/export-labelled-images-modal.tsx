"use client";

import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { requestResultsExport } from "@/features/export/actions/request-results-export";
import { ExportLabelledImagesBody } from "@/features/export/components/export-labelled-images-body";
import { ExportModalFooter } from "@/features/export/components/export-modal-footer";
import { ExportModalHeader } from "@/features/export/components/export-modal-header";
import { ExportPasswordProtection } from "@/features/export/components/export-password-protection";
import { useExportStatus } from "@/features/export/hooks/use-export-status";
import type { RequestResultsExportInput } from "@/features/export/schemas/export";
import { validatePasswordProtection } from "@/features/export/schemas/export";
import { cn } from "@/lib/utils";

/**
 * Framer Motion variants for the main modal content container.
 */
const modalContentVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { delayChildren: 0.2, staggerChildren: 0.2 } },
};

/**
 * Defines the possible resolution options for the image export.
 */
type ExportResolution = "1280x720" | "1920x1080" | "3840x2160";

/**
 * Defines the props for the `ExportLabelledImagesModal` component.
 */
interface ExportLabelledImagesModalProps {
  /** The unique identifier of the case to be exported. */
  caseId: string | null;
  /** A boolean to control the visibility of the modal. */
  isOpen: boolean;
  /** A callback function to handle changes to the modal's open state. */
  onOpenChange: (isOpen: boolean) => void;
}

/**
 * A smart modal component that orchestrates the entire process of exporting labelled images.
 * It handles user input, the initial export request, and polls for the result using a custom hook.
 */
export const ExportLabelledImagesModal = ({
  caseId,
  isOpen,
  onOpenChange,
}: ExportLabelledImagesModalProps) => {
  /** Local state to store the unique ID of the export job, received from the server. */
  const [exportId, setExportId] = useState<string | null>(null);
  /** Local state for the user-selected export resolution, with a sensible default. */
  const [resolution, setResolution] = useState<ExportResolution>("1920x1080");

  /** Password protection state */
  const [password, setPassword] = useState("");
  const [isPasswordEnabled, setIsPasswordEnabled] = useState(false);

  /**
   * Initializes a mutation with Tanstack Query to trigger the server-side export process.
   * On success, it sets the `exportId` to begin the polling process.
   */
  const { mutate: startExport, isPending: isStarting } = useMutation({
    mutationFn: requestResultsExport,
    onSuccess: (data) => {
      if (data.success) {
        if (data.data?.exportId) {
          toast.success("Export started successfully.");
          // Setting the exportId triggers the `useExportStatus` hook to start polling.
          setExportId(data.data.exportId);
        }
      } else {
        toast.error(data.error || "Failed to start export.");
        onOpenChange(false);
      }
    },
    onError: () => {
      toast.error("An unexpected error occurred.");
      onOpenChange(false);
    },
  });

  /**
   * A custom hook that polls the server for the export status. It is only active when
   * `exportId` has a value. `isPolling` will be true while it's actively checking.
   */
  const isPolling = useExportStatus({ exportId, onClose: () => onOpenChange(false) });
  /** A derived boolean to represent the overall pending state of the export process. */
  const isPending = isStarting || isPolling;

  /**
   * The main handler for the export button. It constructs the payload with the selected
   * resolution and triggers the `startExport` mutation.
   */
  const handleExport = () => {
    if (caseId && !isPending) {
      const passwordProtection = isPasswordEnabled
        ? { enabled: true, password }
        : { enabled: false };

      const payload: RequestResultsExportInput = {
        caseId,
        format: "labelled_images",
        resolution,
        passwordProtection,
      };

      startExport(payload);
    }
  };

  /**
   * A wrapper for `onOpenChange` that ensures all local state is reset when the modal is closed.
   * It is to stop polling and ensure a clean state for the next time the modal is opened.
   */
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setExportId(null);
      setResolution("1920x1080");
      setPassword("");
      setIsPasswordEnabled(false);
    }
    onOpenChange(open);
  };

  // Check if password protection is valid for enabling the export button
  const isPasswordValid = validatePasswordProtection(isPasswordEnabled, password);
  const isExportDisabled = !isPasswordValid;

  /**
   * Handler for toggling password protection. Clears the password when disabled.
   */
  const handleTogglePasswordProtection = (enabled: boolean) => {
    setIsPasswordEnabled(enabled);
    if (!enabled) {
      setPassword(""); // Clear password when protection is disabled
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="flex flex-col rounded-2xl bg-white p-0 shadow-2xl sm:max-w-md md:rounded-3xl">
        {/* The main animated container for the modal's content. */}
        <motion.div
          className="contents"
          variants={modalContentVariants}
          initial="hidden"
          animate="show"
        >
          <ExportModalHeader title="Export as Labelled Images" />
          <ExportLabelledImagesBody
            selectedResolution={resolution}
            onResolutionChange={setResolution}
            isExporting={isPending}
          />
          <div className="px-6">
            <ExportPasswordProtection
              password={password}
              onPasswordChange={(e) => setPassword(e.target.value)}
              isEnabled={isPasswordEnabled}
              onToggleEnabled={handleTogglePasswordProtection}
              disabled={isPending}
            />
          </div>
          <div className={cn({ "cursor-not-allowed": isExportDisabled })}>
            <ExportModalFooter
              isPending={isPending}
              onCancel={() => handleOpenChange(false)}
              onExport={handleExport}
              disabled={isExportDisabled}
            />
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

ExportLabelledImagesModal.displayName = "ExportLabelledImagesModal";
