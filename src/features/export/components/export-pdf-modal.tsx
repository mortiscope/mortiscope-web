"use client";

import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { requestResultsExport } from "@/features/export/actions/request-results-export";
import { ExportModalFooter } from "@/features/export/components/export-modal-footer";
import { ExportModalHeader } from "@/features/export/components/export-modal-header";
import { PdfExportIntroductionStep } from "@/features/export/components/pdf-export-introduction-step";
import { PdfExportPasswordStep } from "@/features/export/components/pdf-export-password-step";
import { PdfExportPermissionsStep } from "@/features/export/components/pdf-export-permissions-step";
import { PdfExportSecurityStep } from "@/features/export/components/pdf-export-security-step";
import type { SecurityLevel } from "@/features/export/constants/pdf-options";
import { useExportStatus } from "@/features/export/hooks/use-export-status";
import { usePdfExportWizard } from "@/features/export/hooks/use-pdf-export-wizard";
import type { RequestResultsExportInput } from "@/features/export/schemas/export";
import { validatePasswordProtection } from "@/features/export/schemas/export";
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
 * Framer Motion variants for the main component body, creating a slide-up and fade-in effect.
 */
const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring" as const, damping: 20, stiffness: 150 } },
};

/**
 * Defines the props for the `ExportPdfModal` component.
 */
interface ExportPdfModalProps {
  /** The unique identifier of the case to be exported. */
  caseId: string | null;
  /** A boolean to control the visibility of the modal. */
  isOpen: boolean;
  /** A callback function to handle changes to the modal's open state. */
  onOpenChange: (isOpen: boolean) => void;
}

/**
 * A smart modal component that orchestrates a multi-step wizard for PDF export.
 * It uses the `usePdfExportWizard` hook to manage wizard state and the `useExportStatus`
 * hook to handle the asynchronous export process (request, poll, download).
 */
export const ExportPdfModal = ({ caseId, isOpen, onOpenChange }: ExportPdfModalProps) => {
  // A custom hook that manages the state and navigation logic for the wizard.
  const {
    step,
    securityLevel,
    pageSize,
    password,
    permissions,
    setSecurityLevel,
    setPageSize,
    setPassword,
    setPermissions,
    handleNext,
    handleBack,
    resetState,
  } = usePdfExportWizard();

  // Initializes a mutation with Tanstack Query to trigger the server-side export process.
  const { mutate: startExport, isPending: isStarting } = useMutation({
    mutationFn: requestResultsExport,
    onSuccess: (data) => {
      if (data.success) {
        if (data.data?.exportId) {
          toast.success("Export started successfully.");
          // Setting the exportId triggers the `useExportStatus` polling hook.
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

  const [exportId, setExportId] = useState<string | null>(null);
  // A custom hook that polls the server for the export status, active only when `exportId` is set.
  const isPolling = useExportStatus({ exportId, onClose: () => onOpenChange(false) });
  // A derived boolean for the overall pending state of the export.
  const isPending = isStarting || isPolling;

  // Password validation for steps that require password protection
  const isPasswordRequired =
    securityLevel === "view_protected" || securityLevel === "permissions_protected";
  const isPasswordValid = !isPasswordRequired || validatePasswordProtection(true, password);
  const isPasswordStepDisabled =
    (step === "password" || step === "permissions") && !isPasswordValid;

  /**
   * The main handler for the final export action. It validates the wizard state,
   * constructs the payload, and triggers the `startExport` mutation.
   */
  const handleExport = () => {
    if (caseId && !isPending && pageSize && securityLevel) {
      const payload: RequestResultsExportInput = {
        caseId,
        format: "pdf",
        pageSize,
        securityLevel,
        // Conditionally include the password in the payload if relevant.
        ...(password &&
          (securityLevel === "view_protected" || securityLevel === "permissions_protected") && {
            password,
          }),
        // Conditionally include permissions in the payload.
        ...(securityLevel === "permissions_protected" && { permissions }),
      };

      startExport(payload);
    }
  };

  /**
   * Enhanced security level handler that clears password when switching to standard security.
   */
  const handleSecurityLevelChange = (newSecurityLevel: SecurityLevel) => {
    // Clear password when switching to standard security (no password needed)
    if (newSecurityLevel === "standard" && password) {
      setPassword("");
    }
    setSecurityLevel(newSecurityLevel);
  };

  /**
   * A wrapper for `onOpenChange` that ensures all wizard state is reset when the modal is closed.
   */
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setExportId(null);
      resetState();
    }
    onOpenChange(open);
  };

  /**
   * A function that conditionally renders the correct footer component with the
   * appropriate actions and text based on the current wizard step.
   */
  const renderFooter = () => {
    switch (step) {
      case "introduction":
        return (
          <ExportModalFooter
            isPending={isPending}
            onCancel={() => handleOpenChange(false)}
            onExport={handleNext}
            exportButtonText="Next"
          />
        );

      case "security": {
        const isStandardSelected = securityLevel === "standard";
        const primaryAction = isStandardSelected ? handleExport : handleNext;
        const primaryButtonText = isStandardSelected ? "Export" : "Next";
        const isButtonDisabled = !securityLevel || !pageSize;

        return (
          <ExportModalFooter
            isPending={isPending}
            disabled={isButtonDisabled}
            onCancel={handleBack}
            onExport={primaryAction}
            exportButtonText={primaryButtonText}
            showBackButton
          />
        );
      }

      case "password":
      case "permissions":
        return (
          <div className={cn({ "cursor-not-allowed": isPasswordStepDisabled })}>
            <ExportModalFooter
              isPending={isPending}
              onCancel={handleBack}
              onExport={handleExport}
              exportButtonText="Export"
              showBackButton
              disabled={isPasswordStepDisabled}
            />
          </div>
        );

      default:
        return null;
    }
  };

  /**
   * A function that conditionally renders the main content component for the current wizard step.
   */
  const renderStep = () => {
    switch (step) {
      case "introduction":
        return <PdfExportIntroductionStep />;
      case "security":
        return (
          <PdfExportSecurityStep
            securityLevel={securityLevel}
            onSecurityLevelChange={handleSecurityLevelChange}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            isPending={isPending}
          />
        );
      case "password":
        return (
          <PdfExportPasswordStep
            password={password}
            onPasswordChange={setPassword}
            isPending={isPending}
          />
        );
      case "permissions":
        return (
          <PdfExportPermissionsStep
            permissions={permissions}
            onPermissionsChange={setPermissions}
            password={password}
            onPasswordChange={setPassword}
            isPending={isPending}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="flex flex-col rounded-2xl bg-white p-0 shadow-2xl sm:max-w-md md:rounded-3xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            className="contents"
            variants={modalContentVariants}
            initial="hidden"
            animate="show"
            exit="hidden"
          >
            <ExportModalHeader title="Export as PDF" />
            <motion.div variants={itemVariants} className="shrink-0 overflow-hidden px-6 pt-2">
              {renderStep()}
            </motion.div>
            {renderFooter()}
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

ExportPdfModal.displayName = "ExportPdfModal";
