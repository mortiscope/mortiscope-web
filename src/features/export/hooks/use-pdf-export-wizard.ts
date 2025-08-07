import { useState } from "react";

import {
  defaultPdfPermissions,
  type PageSize,
  type PdfExportStep,
  type PdfPermissions,
  type SecurityLevel,
} from "@/features/export/constants/pdf-options";

/**
 * A custom hook that encapsulates the state and navigation logic for the multi-step PDF export wizard.
 * It manages the current step, user selections for security, page size, password, and permissions,
 * and provides functions to move between steps or reset the entire process.
 *
 * @returns An object containing the wizard's current state and action handlers.
 */
export const usePdfExportWizard = () => {
  /** Tracks the current active step of the wizard. */
  const [step, setStep] = useState<PdfExportStep>("introduction");
  /** Stores the user-selected security level. */
  const [securityLevel, setSecurityLevel] = useState<SecurityLevel>(null);
  /** Stores the user-selected page size for the PDF document. */
  const [pageSize, setPageSize] = useState<PageSize>(null);
  /** Stores the password for view-protected PDFs. */
  const [password, setPassword] = useState("");
  /** Stores the user-configured permissions for the PDF. */
  const [permissions, setPermissions] = useState<PdfPermissions>(defaultPdfPermissions);

  /**
   * Handles the logic for transitioning to the next step in the wizard. The destination
   * step is conditional based on the current step and the selected security level.
   */
  const handleNext = () => {
    // From the introduction, the next step is always security settings.
    if (step === "introduction") {
      setStep("security");
      return;
    }

    // From the security step, the next step depends on the chosen level.
    if (securityLevel === "view_protected") {
      setStep("password");
    } else if (securityLevel === "permissions_protected") {
      setStep("permissions");
    }
  };

  /**
   * Handles the logic for transitioning to the previous step. It also clears
   * the password state when navigating away from a password-related step.
   */
  const handleBack = () => {
    // If on the security step, go back to the beginning.
    if (step === "security") {
      setStep("introduction");
    } else {
      // From any subsequent step, go back to the security step.
      setStep("security");
      // Clear the password to ensure it's not unintentionally retained.
      setPassword("");
    }
  };

  /**
   * Resets the entire wizard state to its initial default values.
   */
  const resetState = () => {
    setStep("introduction");
    setSecurityLevel(null);
    setPageSize(null);
    setPassword("");
    setPermissions(defaultPdfPermissions);
  };

  // Exposes the public API of the hook.
  return {
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
  };
};
