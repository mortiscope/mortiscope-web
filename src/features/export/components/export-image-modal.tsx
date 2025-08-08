"use client";

import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import type { z } from "zod";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { requestImageExport } from "@/features/export/actions/request-image-export";
import { ExportImageBody } from "@/features/export/components/export-image-body";
import { ExportModalFooter } from "@/features/export/components/export-modal-footer";
import { ExportModalHeader } from "@/features/export/components/export-modal-header";
import { ExportPasswordProtection } from "@/features/export/components/export-password-protection";
import { useExportStatus } from "@/features/export/hooks/use-export-status";
import {
  requestImageExportSchema,
  validatePasswordProtection,
} from "@/features/export/schemas/export";
import { cn } from "@/lib/utils";

/**
 * Framer Motion variants for the main modal content container.
 */
const modalContentVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { delayChildren: 0.1, staggerChildren: 0.1 } },
};

type Resolution = z.infer<(typeof requestImageExportSchema.options)[1]["shape"]["resolution"]>;

interface ExportImageModalProps {
  image: { id: string; name: string } | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

/**
 * A modal to configure and confirm the export of a single image. This smart
 * component manages state and orchestrates the UI.
 */
export const ExportImageModal = ({ image, isOpen, onOpenChange }: ExportImageModalProps) => {
  // State for the multi-step interface flow.
  const [step, setStep] = useState<"format" | "resolution">("format");
  const [exportOption, setExportOption] = useState<"raw_data" | "labelled_image">("raw_data");
  const [resolution, setResolution] = useState<Resolution>("1920x1080");
  const [exportId, setExportId] = useState<string | null>(null);

  // Password protection state
  const [password, setPassword] = useState("");
  const [isPasswordEnabled, setIsPasswordEnabled] = useState(false);

  const { mutate: startExport, isPending: isStarting } = useMutation({
    mutationFn: requestImageExport,
    onSuccess: (data) => {
      // Correctly handle the discriminated union from the server action.
      if (data.success) {
        if (data.data?.exportId) {
          toast.success("Export started successfully.");
          setExportId(data.data.exportId);
        }
      } else {
        // If success is false, we can safely access the error property.
        toast.error(data.error || "Failed to start export.");
        onOpenChange(false);
      }
    },
    onError: () => {
      toast.error("An unexpected error occurred.");
      onOpenChange(false);
    },
  });

  // Handles polling and side-effects. Closes modal on completion.
  const isPolling = useExportStatus({ exportId, onClose: () => onOpenChange(false) });

  const isPending = isStarting || isPolling;

  const handlePrimaryAction = () => {
    if (!image || isPending) return;

    const passwordProtection = isPasswordEnabled ? { enabled: true, password } : { enabled: false };

    if (exportOption === "raw_data") {
      startExport({
        uploadId: image.id,
        format: "raw_data",
        passwordProtection,
      });
    } else if (exportOption === "labelled_image") {
      if (step === "format") {
        setStep("resolution");
      } else if (step === "resolution" && resolution) {
        startExport({
          uploadId: image.id,
          format: "labelled_images",
          resolution,
          passwordProtection,
        });
      }
    }
  };

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    // Reset state when the modal is closed to ensure it starts fresh.
    if (!open) {
      setTimeout(() => {
        setStep("format");
        setExportOption("raw_data");
        setResolution("1920x1080");
        setExportId(null);
        setPassword("");
        setIsPasswordEnabled(false);
      }, 300);
    }
  };

  const handleBack = () => {
    if (step === "resolution") {
      setStep("format");
    }
  };

  const handleCancelOrBack = () => {
    if (step === "resolution") {
      handleBack();
    } else {
      handleOpenChange(false);
    }
  };

  // Determine the text for the action buttons based on the current step.
  const exportButtonText =
    exportOption === "labelled_image" && step === "format" ? "Next" : "Download";
  const cancelButtonText = step === "resolution" ? "Back" : "Cancel";

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
      <DialogContent className="flex flex-col overflow-hidden rounded-2xl bg-white p-0 shadow-2xl sm:max-w-md md:rounded-3xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            className="contents"
            variants={modalContentVariants}
            initial="hidden"
            animate="show"
            exit="hidden"
          >
            <ExportModalHeader
              title={step === "format" ? "Download Image" : "Select Resolution"}
              description={
                step === "format" ? (
                  <>
                    Choose a download option for{" "}
                    <strong className="font-semibold text-slate-800">{image?.name}</strong>.
                  </>
                ) : (
                  "Select a resolution for the labelled image."
                )
              }
            />
            <ExportImageBody
              step={step}
              exportOption={exportOption}
              onExportOptionChange={setExportOption}
              resolution={resolution}
              onResolutionChange={setResolution}
              isPending={isPending}
            />
            {step === "format" && (
              <div className="px-6">
                <ExportPasswordProtection
                  password={password}
                  onPasswordChange={(e) => setPassword(e.target.value)}
                  isEnabled={isPasswordEnabled}
                  onToggleEnabled={handleTogglePasswordProtection}
                  disabled={isPending}
                />
              </div>
            )}
            <div className={cn({ "cursor-not-allowed": isExportDisabled })}>
              <ExportModalFooter
                isPending={isPending}
                onCancel={handleCancelOrBack}
                onExport={handlePrimaryAction}
                exportButtonText={exportButtonText}
                cancelButtonText={cancelButtonText}
                pendingButtonText="Downloading..."
                disabled={isExportDisabled}
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

ExportImageModal.displayName = "ExportImageModal";
