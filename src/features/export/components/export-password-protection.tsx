"use client";

import { motion, type Variants } from "framer-motion";

import { Switch } from "@/components/ui/switch";
import { PdfPasswordInput } from "@/features/export/components/pdf-password-input";
import { cn } from "@/lib/utils";

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring", damping: 20, stiffness: 150 } },
};

/**
 * Defines the props for the export password protection component.
 */
interface ExportPasswordProtectionProps {
  /** The current value of the password input, making it a controlled component. */
  password: string;
  /** A callback function to handle changes to the password input's value. */
  onPasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** A boolean to control whether password protection is enabled. */
  isEnabled: boolean;
  /** A callback function to handle changes to the password protection toggle. */
  onToggleEnabled: (enabled: boolean) => void;
  /** A boolean to disable the entire component. */
  disabled?: boolean;
}

/**
 * A reusable component that provides password protection functionality for export operations.
 * It includes a toggle switch to enable/disable password protection and a password input field
 * that is only active when protection is enabled. Includes built-in validation requiring
 * a minimum of 8 characters when password protection is enabled.
 *
 * @param {ExportPasswordProtectionProps} props The props for the component.
 * @returns A React component representing the password protection interface.
 */
export const ExportPasswordProtection = ({
  password,
  onPasswordChange,
  isEnabled,
  onToggleEnabled,
  disabled = false,
}: ExportPasswordProtectionProps) => {
  /** Simple client-side validation to check if the password meets the minimum length requirement. */
  const hasPasswordError = isEnabled && password.length > 0 && password.length < 8;
  const passwordErrorMessage = hasPasswordError
    ? "Password must be at least 8 characters."
    : undefined;

  return (
    <motion.div variants={itemVariants} className="space-y-3">
      {/* Description paragraph */}
      <p className="font-inter text-sm text-slate-600">
        Enable password protection to secure the exported file with a custom password.
      </p>

      {/* Password protection toggle and input container */}
      <div className="flex gap-3">
        {/* Password input field */}
        <div className={cn("flex-1", { "cursor-not-allowed": !isEnabled || disabled })}>
          <PdfPasswordInput
            value={password}
            onChange={onPasswordChange}
            disabled={!isEnabled || disabled}
            placeholder="Enter password"
            hasError={hasPasswordError}
            errorMessage={passwordErrorMessage}
          />
        </div>

        {/* Switch centered with the input field */}
        <div className="flex items-center">
          <div className="flex h-9 items-center md:h-10">
            <Switch
              checked={isEnabled}
              onCheckedChange={onToggleEnabled}
              disabled={disabled}
              className="cursor-pointer data-[state=checked]:bg-emerald-600"
              aria-label="Toggle password protection"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

ExportPasswordProtection.displayName = "ExportPasswordProtection";
