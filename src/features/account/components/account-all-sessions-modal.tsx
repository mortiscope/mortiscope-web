"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion, type Variants } from "framer-motion";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { PiEye, PiEyeSlash } from "react-icons/pi";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { revokeAllSessions } from "@/features/account/actions/revoke-all-sessions";
import { verifyCurrentPassword } from "@/features/account/actions/verify-current-password";
import { AccountModalFooter } from "@/features/account/components/account-modal-footer";
import { AccountModalHeader } from "@/features/account/components/account-modal-header";
import {
  type AccountAllSessionsModalFormValues,
  AccountAllSessionsModalSchema,
} from "@/features/account/schemas/account";
import { uniformInputStyles } from "@/features/cases/constants/styles";
import { cn } from "@/lib/utils";

/**
 * Framer Motion variants for the main modal content container.
 */
const modalContentVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { delayChildren: 0.2, staggerChildren: 0.2 } },
};

/**
 * Framer Motion variants for individual animated items in the modal.
 */
const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring" as const, damping: 20, stiffness: 150 } },
};

/**
 * A configuration array that defines the sign-out options for the interface.
 * This approach centralizes the options, making them easy to manage and map over.
 */
const signOutOptions = [
  {
    value: "exclude_current" as const,
    label: "Keep current device signed in",
    description: "Sign out all other devices but keep this session active.",
  },
  {
    value: "include_current" as const,
    label: "Sign out all devices",
    description: "Sign out everywhere including this device. You will be redirected to sign in.",
  },
];

/**
 * Defines the props for the account all sessions modal component.
 */
interface AccountAllSessionsModalProps {
  /** A boolean to control the visibility of the modal. */
  isOpen: boolean;
  /** A callback function to handle changes to the modal's open state. */
  onOpenChange: (isOpen: boolean) => void;
  /** The unique ID of the user whose sessions will be revoked. */
  userId: string;
  /** The optional session token of the current device, used to exclude it from revocation. */
  currentSessionToken?: string;
  /** An optional callback function invoked after a successful "sign out other devices" operation. */
  onSuccess?: () => void;
}

/**
 * A smart modal component that provides a secure way for users to sign out of all their active sessions.
 * It requires password re-authentication and orchestrates multiple server actions to complete the process.
 */
export const AccountAllSessionsModal = ({
  isOpen,
  onOpenChange,
  userId,
  currentSessionToken,
  onSuccess,
}: AccountAllSessionsModalProps) => {
  /** A local state to track the pending state of the entire sign-out process. */
  const [isSigningOut, setIsSigningOut] = useState(false);
  /** A local state to manage the visibility of the password input. */
  const [showPassword, setShowPassword] = useState(false);

  // Initializes `react-hook-form` with Zod for schema validation.
  const form = useForm<AccountAllSessionsModalFormValues>({
    resolver: zodResolver(AccountAllSessionsModalSchema),
    defaultValues: {
      password: "",
      signOutOption: "exclude_current",
    },
    mode: "onChange",
  });

  /**
   * A wrapper for `onOpenChange` that ensures all local form state is reset when the modal is closed.
   */
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
      setIsSigningOut(false);
      setShowPassword(false);
    }
    onOpenChange(open);
  };

  /**
   * The main submission handler. It orchestrates a sequence of server actions.
   * 1. Verify the user's password.
   * 2. Revoke the targeted sessions.
   * 3. If necessary, sign the current user out.
   */
  const handleSubmit = async (values: AccountAllSessionsModalFormValues) => {
    setIsSigningOut(true);

    try {
      // Re-authenticate the user by verifying their password.
      const passwordResult = await verifyCurrentPassword({
        currentPassword: values.password,
      });

      if (!passwordResult.success) {
        toast.error(passwordResult.error || "Password verification failed.", {
          className: "font-inter",
        });
        setIsSigningOut(false);
        return;
      }

      // Call the server action to revoke the sessions.
      const revokeResult = await revokeAllSessions(
        userId,
        // Conditionally pass the current session token to exclude it from revocation.
        values.signOutOption === "exclude_current" ? currentSessionToken : undefined
      );

      if (revokeResult.success) {
        const count = revokeResult.revokedCount || 0;
        const sessionPlural = count === 1 ? "" : "s";

        // Handle the outcome based on the chosen sign-out option.
        if (values.signOutOption === "include_current") {
          // If signing out everywhere, show a toast, close the modal, and then perform a client-side sign-out.
          toast.success(`${count} session${sessionPlural} revoked.`, {
            className: "font-inter",
          });
          handleOpenChange(false);
          // A delay allows the user to see the success message before being redirected.
          setTimeout(async () => {
            await signOut({ redirect: false });
            window.location.href = "/signin";
          }, 1500);
        } else {
          // If only signing out other devices, show a success message and call the `onSuccess` callback.
          toast.success(`${count} session${sessionPlural} revoked successfully.`, {
            className: "font-inter",
          });
          handleOpenChange(false);
          onSuccess?.();
        }
      } else {
        toast.error(revokeResult.error || "Failed to revoke sessions.", {
          className: "font-inter",
        });
      }
    } catch {
      toast.error("An unexpected error occurred.", {
        className: "font-inter",
      });
    } finally {
      setIsSigningOut(false);
    }
  };

  // Watch is used to get the current values of form fields for real-time validation checks.
  const password = form.watch("password");
  const signOutOption = form.watch("signOutOption");
  // A derived boolean to control the disabled state of the submit button.
  const isFormValid = password.length >= 8 && signOutOption && !isSigningOut;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="flex flex-col rounded-2xl bg-white p-0 shadow-2xl sm:max-w-md md:rounded-3xl">
        <motion.div
          className="contents"
          variants={modalContentVariants}
          initial="hidden"
          animate="show"
        >
          {/* Header Section */}
          <AccountModalHeader
            title="Sign Out All Devices"
            description="Revoke access to your account from all the available devices."
            variant="rose"
          />

          {/* Form Content Section */}
          <motion.div variants={itemVariants} className="px-6 py-0">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {/* Radio group for selecting the sign-out scope. */}
                <FormField
                  control={form.control}
                  name="signOutOption"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="gap-1.5 space-y-2"
                          disabled={isSigningOut}
                        >
                          {signOutOptions.map((option) => (
                            <Label
                              key={option.value}
                              htmlFor={option.value}
                              className={cn(
                                "flex items-start rounded-2xl border-2 p-4 text-left transition-all duration-600 ease-in-out",
                                isSigningOut ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                                field.value === option.value
                                  ? "border-rose-400 bg-rose-50 shadow-sm"
                                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                              )}
                            >
                              <RadioGroupItem
                                value={option.value}
                                id={option.value}
                                disabled={isSigningOut}
                                className={cn(
                                  "mt-1 mr-3 shrink-0 transition-all duration-300 ease-in-out",
                                  "focus-visible:ring-rose-500/50",
                                  field.value === option.value &&
                                    "border-rose-600 text-rose-600 [&_svg]:fill-rose-600"
                                )}
                              />
                              <div className="flex-1">
                                <div className="font-inter font-medium text-slate-800">
                                  <span>{option.label}</span>
                                </div>
                                <p className="font-inter mt-1.5 text-sm font-normal text-slate-600">
                                  {option.description}
                                </p>
                              </div>
                            </Label>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage className="font-inter text-xs" />
                    </FormItem>
                  )}
                />

                {/* Password input for re-authentication. */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <Label className="font-inter text-sm font-normal text-slate-700">
                        Enter your password to confirm:
                      </Label>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            disabled={isSigningOut}
                            className={cn(
                              uniformInputStyles,
                              "w-full pr-10 focus-visible:!border-rose-600 data-[state=open]:!border-rose-600",
                              form.formState.errors.password &&
                                "border-red-500 focus-visible:!border-red-500"
                            )}
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={isSigningOut}
                            className="absolute top-1/2 right-2 h-7 w-7 -translate-y-1/2 cursor-pointer text-slate-500 hover:bg-transparent hover:text-slate-700"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            tabIndex={-1}
                          >
                            {showPassword ? (
                              <PiEyeSlash size={18} className="h-5 w-5" />
                            ) : (
                              <PiEye size={18} className="h-5 w-5" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage className="font-inter text-xs" />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </motion.div>

          {/* Footer/Actions Section */}
          <AccountModalFooter
            isPending={isSigningOut}
            onCancel={() => handleOpenChange(false)}
            onAction={form.handleSubmit(handleSubmit)}
            actionButtonText="Sign Out"
            pendingButtonText="Signing out..."
            disabled={!isFormValid}
            variant="rose"
          />
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

AccountAllSessionsModal.displayName = "AccountAllSessionsModal";
