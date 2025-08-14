"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { HiOutlineLockClosed, HiOutlineLockOpen } from "react-icons/hi2";
import { PiEye, PiEyeSlash, PiPaperPlaneRight, PiWarning } from "react-icons/pi";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Dynamically imported account deletion modal component.
 */
const AccountDeletionModal = dynamic(
  () =>
    import("@/features/account/components/account-deletion-modal").then(
      (module) => module.AccountDeletionModal
    ),
  { ssr: false }
);
import { useAccountMutation } from "@/features/account/hooks/use-account-mutation";
import { uniformInputStyles } from "@/features/cases/constants/styles";
import { cn } from "@/lib/utils";

/**
 * Schema for the account deletion password form.
 * Uses the same password validation as the account security form.
 */
const AccountDeletionPasswordSchema = z.object({
  password: z.string().min(1, { message: "Current password is required." }),
});

type AccountDeletionPasswordFormValues = z.infer<typeof AccountDeletionPasswordSchema>;

/**
 * The deletion tab content component for the account settings page.
 */
export const AccountDeletion = () => {
  const [isPasswordLocked, setIsPasswordLocked] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);

  // Account mutations
  const { verifyPassword } = useAccountMutation();

  // Form setup with validation
  const form = useForm<AccountDeletionPasswordFormValues>({
    resolver: zodResolver(AccountDeletionPasswordSchema),
    defaultValues: {
      password: "",
    },
    mode: "onChange",
  });

  /**
   * Handle password verification
   */
  const handlePasswordVerification = () => {
    const password = form.getValues("password");
    verifyPassword.mutate(
      { currentPassword: password },
      {
        onSuccess: (data) => {
          if (data?.success) {
            setIsPasswordVerified(true);
          }
        },
      }
    );
  };

  /**
   * Handle current password change to reset verification
   */
  const handlePasswordChange = (value: string) => {
    if (isPasswordVerified) {
      setIsPasswordVerified(false);
    }
    return value;
  };

  /**
   * Handle lock/unlock with field reset
   */
  const handlePasswordLockToggle = () => {
    if (!isPasswordLocked) {
      // If locking, reset password field and verification state
      form.setValue("password", "");
      form.clearErrors("password");
      setIsPasswordVerified(false);
    }
    setIsPasswordLocked(!isPasswordLocked);
  };

  /**
   * Button state logic
   */
  const isPasswordSubmitEnabled =
    !isPasswordLocked &&
    form.watch("password") &&
    !form.formState.errors.password &&
    !verifyPassword.isPending &&
    !isPasswordVerified;

  const isDeleteEnabled = isPasswordVerified;

  return (
    <div className="w-full">
      {/* Deletion Header */}
      <div className="text-center lg:text-left">
        <h1 className="font-plus-jakarta-sans text-2xl font-semibold text-slate-800 uppercase md:text-3xl">
          Deletion
        </h1>
        <p className="font-inter mt-2 text-sm text-slate-600">
          Permanently delete your account and all of its associated data.
        </p>
      </div>

      {/* Deletion Form */}
      <div className="mt-8 space-y-4">
        <div className="flex items-start gap-3 rounded-lg border-2 border-rose-400 bg-rose-50 p-3">
          <PiWarning className="h-5 w-5 flex-shrink-0 text-rose-500" />
          <p className="font-inter flex-1 text-sm text-rose-400">
            <strong className="font-semibold text-rose-500">Note:</strong> Actions here may result
            in irreversible data loss. Proceed with extreme caution.
          </p>
        </div>

        {/* Input and Button Grid */}
        <div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="order-1">
              <Form {...form}>
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <div className="flex items-start gap-2">
                        <div
                          className={cn("flex-grow", { "cursor-not-allowed": isPasswordLocked })}
                        >
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter password"
                                disabled={isPasswordLocked}
                                className={cn(
                                  uniformInputStyles,
                                  "w-full pr-10",
                                  form.formState.errors.password &&
                                    "border-red-500 focus-visible:border-red-500"
                                )}
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  handlePasswordChange(e.target.value);
                                }}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 transform cursor-pointer text-slate-500 hover:bg-transparent hover:text-slate-700 md:right-2"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                tabIndex={-1}
                                disabled={isPasswordLocked}
                              >
                                {showPassword ? (
                                  <PiEye size={18} className="md:h-5 md:w-5" />
                                ) : (
                                  <PiEyeSlash size={18} className="md:h-5 md:w-5" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                        </div>
                        <div className="flex gap-2">
                          <TooltipProvider delayDuration={100}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className={cn(
                                    "h-9 w-9 flex-shrink-0 cursor-pointer border-2 text-slate-400 transition-colors ease-in-out hover:border-green-600 hover:bg-green-100 hover:text-green-600 md:h-10 md:w-10",
                                    {
                                      "border-slate-100": isPasswordLocked,
                                      "border-slate-200": !isPasswordLocked,
                                    }
                                  )}
                                  onClick={handlePasswordLockToggle}
                                  aria-label={isPasswordLocked ? "Unlock" : "Lock"}
                                >
                                  {isPasswordLocked ? (
                                    <HiOutlineLockClosed className="h-5 w-5" />
                                  ) : (
                                    <HiOutlineLockOpen className="h-5 w-5" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="font-inter">
                                <p>{isPasswordLocked ? "Unlock" : "Lock"}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <div className={cn({ "cursor-not-allowed": !isPasswordSubmitEnabled })}>
                            <TooltipProvider delayDuration={100}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className={cn(
                                      "h-9 w-9 flex-shrink-0 border-2 text-slate-400 transition-colors ease-in-out md:h-10 md:w-10",
                                      isPasswordSubmitEnabled
                                        ? "cursor-pointer border-slate-200 hover:border-green-600 hover:bg-green-100 hover:text-green-600"
                                        : "cursor-not-allowed border-slate-100 opacity-50"
                                    )}
                                    disabled={!isPasswordSubmitEnabled}
                                    onClick={handlePasswordVerification}
                                    aria-label="Submit"
                                  >
                                    <PiPaperPlaneRight className="h-5 w-5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="font-inter">
                                  <p>Submit</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      </div>
                      {/* Individual validation message for small screens */}
                      <FormMessage className="font-inter text-xs md:hidden" />
                    </FormItem>
                  )}
                />
              </Form>
            </div>

            <div className={cn("order-2", { "cursor-not-allowed": !isDeleteEnabled })}>
              <Button
                disabled={!isDeleteEnabled}
                className={cn(
                  "font-inter h-9 w-full transition-all duration-300 ease-in-out md:h-10",
                  isDeleteEnabled
                    ? "cursor-pointer bg-rose-600 text-white hover:bg-rose-500 hover:shadow-lg hover:shadow-rose-500/20"
                    : "cursor-not-allowed bg-rose-400 text-rose-100 hover:bg-rose-400"
                )}
                onClick={() => setIsModalOpen(true)}
              >
                Delete Account
              </Button>
            </div>
          </div>
          {/* Combined validation message for medium+ screens */}
          {form.formState.errors.password?.message && (
            <div className="text-destructive font-inter mt-1 hidden text-xs md:block">
              <p>{form.formState.errors.password.message}</p>
            </div>
          )}
        </div>
      </div>

      {/* Account Deletion Modal */}
      <AccountDeletionModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        verifiedPassword={isPasswordVerified ? form.getValues("password") : undefined}
      />
    </div>
  );
};

AccountDeletion.displayName = "AccountDeletion";
