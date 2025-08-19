"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { PiEye, PiEyeSlash, PiWarning } from "react-icons/pi";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AccountModalFooter } from "@/features/account/components/account-modal-footer";
import { AccountModalHeader } from "@/features/account/components/account-modal-header";
import { useAccountMutation } from "@/features/account/hooks/use-account-mutation";
import {
  type DisableTwoFactorFormValues,
  DisableTwoFactorSchema,
} from "@/features/account/schemas/account";
import { uniformInputStyles } from "@/features/cases/constants/styles";
import { cn } from "@/lib/utils";

/**
 * Framer Motion variants for the main modal content container.
 */
const modalContentVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { delayChildren: 0.2, staggerChildren: 0.2 } },
};

/**
 * Framer Motion variants for individual items.
 */
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      damping: 20,
      stiffness: 150,
    },
  },
};

/**
 * Props for the two factor disable modal component.
 */
interface TwoFactorDisableModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to handle modal open state changes */
  onOpenChange: (isOpen: boolean) => void;
  /** Callback when two-factor authentication is successfully disabled */
  onSuccess: () => void;
}

/**
 * A smart modal component for disabling two-factor authentication (2FA).
 * It displays a warning, requires the user's current password for re-authentication,
 * and handles the server-side mutation to disable 2FA.
 */
export const TwoFactorDisableModal = ({
  isOpen,
  onOpenChange,
  onSuccess,
}: TwoFactorDisableModalProps) => {
  /** Local state to manage the visibility of the password input. */
  const [showPassword, setShowPassword] = useState(false);
  /** A custom hook that provides the server action mutation for disabling 2FA. */
  const { disableTwoFactor } = useAccountMutation();

  // Initializes `react-hook-form` with Zod for schema validation.
  const form = useForm<DisableTwoFactorFormValues>({
    resolver: zodResolver(DisableTwoFactorSchema),
    defaultValues: {
      currentPassword: "",
    },
    mode: "onChange",
  });

  /** A derived boolean indicating if the form is valid according to the Zod schema. */
  const isFormValid = form.formState.isValid && !form.formState.errors.currentPassword;

  /** Toggles the visibility of the password input. */
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  /**
   * The submission handler passed to `react-hook-form`. It triggers the server mutation
   * and handles both success and specific error responses from the server.
   */
  const onSubmit = (data: DisableTwoFactorFormValues) => {
    if (!isFormValid) return;

    disableTwoFactor.mutate(data, {
      onSuccess: (result) => {
        if (result.success) {
          toast.success("Two-factor authentication disabled successfully.", {
            className: "font-inter",
          });
          onSuccess();
          handleClose();
        } else {
          // If the server returns an error, set it on the form field for user feedback.
          if (result.error?.includes("password")) {
            form.setError("currentPassword", {
              type: "manual",
              message: "Invalid password.",
            });
          } else {
            form.setError("currentPassword", {
              type: "manual",
              message: result.error || "Failed to disable two-factor authentication.",
            });
          }
        }
      },
      onError: () => {
        toast.error("An unexpected error occurred.", {
          className: "font-inter",
        });
        form.setError("currentPassword", {
          type: "manual",
          message: "An unexpected error occurred.",
        });
      },
    });
  };

  /**
   * A wrapper for `onOpenChange` that ensures all local form state is reset when the modal is closed.
   */
  const handleClose = () => {
    form.reset();
    setShowPassword(false);
    onOpenChange(false);
  };

  /** A derived boolean to control the disabled state of the submit button. */
  const isDisableEnabled = isFormValid && !disableTwoFactor.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="flex flex-col rounded-2xl bg-white p-0 shadow-2xl sm:max-w-md md:rounded-3xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="contents">
            <motion.div
              className="contents"
              variants={modalContentVariants}
              initial="hidden"
              animate="show"
            >
              {/* Header Section */}
              <AccountModalHeader
                title="Disable Two-Factor"
                description="Enter your password to confirm disabling two-factor authentication for your account."
                variant="rose"
              />

              {/* Warning Message Section */}
              <motion.div variants={itemVariants} className="px-6">
                <div className="flex items-start gap-3 rounded-lg border-2 border-rose-400 bg-rose-50 p-4">
                  <PiWarning className="h-5 w-5 flex-shrink-0 text-rose-500" />
                  <p className="font-inter flex-1 text-sm text-rose-700">
                    <strong className="font-semibold text-rose-600">Warning:</strong> Disabling
                    two-factor authentication will make your account less secure. All recovery codes
                    will be permanently deleted and cannot be recovered.
                  </p>
                </div>
              </motion.div>

              {/* Password Input Section */}
              <motion.div variants={itemVariants} className="px-6">
                <FormField
                  control={form.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <label className="font-inter text-sm font-medium text-slate-700">
                        Current Password
                      </label>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            disabled={disableTwoFactor.isPending}
                            placeholder="Enter your password"
                            className={cn(
                              uniformInputStyles,
                              "pr-10 focus-visible:!border-rose-600",
                              form.formState.errors.currentPassword &&
                                "border-red-500 focus-visible:!border-red-500"
                            )}
                            autoComplete="current-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={togglePasswordVisibility}
                            disabled={disableTwoFactor.isPending}
                            className="absolute top-1/2 right-2 h-7 w-7 -translate-y-1/2 cursor-pointer text-slate-500 hover:bg-transparent hover:text-slate-700"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            tabIndex={-1}
                          >
                            {showPassword ? (
                              <PiEye size={18} className="h-5 w-5" />
                            ) : (
                              <PiEyeSlash size={18} className="h-5 w-5" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage className="font-inter text-xs" />
                    </FormItem>
                  )}
                />
              </motion.div>

              {/* Footer/Actions Section */}
              <AccountModalFooter
                isPending={disableTwoFactor.isPending}
                onCancel={handleClose}
                onAction={form.handleSubmit(onSubmit)}
                actionButtonText="Disable"
                pendingButtonText="Disabling..."
                disabled={!isDisableEnabled}
                variant="rose"
              />
            </motion.div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

TwoFactorDisableModal.displayName = "TwoFactorDisableModal";
