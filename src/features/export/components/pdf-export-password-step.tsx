"use client";

import { Label } from "@/components/ui/label";
import { PdfPasswordInput } from "@/features/export/components/pdf-password-input";
import { cn } from "@/lib/utils";

/**
 * Defines the props for the PDF export password step component.
 */
interface PdfExportPasswordStepProps {
  /** The current value of the password input, making it a controlled component. */
  password: string;
  /** A callback function to update the password state in the parent hook/component. */
  onPasswordChange: (value: string) => void;
  /** A boolean to indicate if an action is pending, which disables the input. */
  isPending: boolean;
  /** An optional placeholder text for the password input field. */
  placeholder?: string;
}

/**
 * Renders the interface for the password step of the PDF export wizard. This component
 * allows the user to set a password for a view-protected document. It is a fully
 * controlled component and includes basic client-side validation for the password length.
 *
 * @param {PdfExportPasswordStepProps} props The props for the component.
 * @returns A React component representing the password input step.
 */
export const PdfExportPasswordStep = ({
  password,
  onPasswordChange,
  isPending,
  placeholder = "Enter viewer password",
}: PdfExportPasswordStepProps) => {
  /** A derived boolean to check if the password fails the minimum length requirement. */
  const hasPasswordError = password.length > 0 && password.length < 8;
  /** The error message to display if the password validation fails. */
  const passwordErrorMessage = hasPasswordError
    ? "Password must be at least 8 characters."
    : undefined;

  return (
    // The main container is visually disabled when a pending action is in progress.
    <div className={cn("space-y-3", isPending && "pointer-events-none opacity-50")}>
      <Label className="font-inter text-sm font-normal text-slate-700">
        Enter a password to protect access to this document.
      </Label>
      {/* Renders the reusable, controlled password input component. */}
      <PdfPasswordInput
        value={password}
        onChange={(e) => onPasswordChange(e.target.value)}
        disabled={isPending}
        placeholder={placeholder}
        hasError={hasPasswordError}
        errorMessage={passwordErrorMessage}
      />
    </div>
  );
};

PdfExportPasswordStep.displayName = "PdfExportPasswordStep";
