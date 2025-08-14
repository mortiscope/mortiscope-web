"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion, type Variants } from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { HiOutlineLockClosed, HiOutlineLockOpen } from "react-icons/hi2";
import { LuLoaderCircle } from "react-icons/lu";
import { PiEye, PiEyeSlash, PiFloppyDiskBack, PiPaperPlaneRight } from "react-icons/pi";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Dynamically imported two-factor authentication modal component.
 */
const TwoFactorEnableModal = dynamic(
  () =>
    import("@/features/account/components/two-factor-enable-modal").then(
      (module) => module.TwoFactorEnableModal
    ),
  { ssr: false }
);
import { useAccountMutation } from "@/features/account/hooks/use-account-mutation";
import { useAccountSecurity } from "@/features/account/hooks/use-account-security";
import { useFormChange } from "@/features/account/hooks/use-form-change";
import { useSocialProvider } from "@/features/account/hooks/use-social-provider";
import {
  type AccountSecurityFormValues,
  AccountSecuritySchema,
} from "@/features/account/schemas/account";
import { sectionTitle, uniformInputStyles } from "@/features/cases/constants/styles";
import { cn } from "@/lib/utils";

/**
 * Framer Motion variants for the main content container.
 */
const contentVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
      delayChildren: 0.1,
      staggerChildren: 0.1,
    },
  },
};

/**
 * Framer Motion variants for individual items.
 */
const itemVariants: Variants = {
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
 * The security tab content component for the account settings page.
 */
export const AccountSecurity = () => {
  const [isEmailLocked, setIsEmailLocked] = useState(true);
  const [isPasswordLocked, setIsPasswordLocked] = useState(true);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(false);
  const [isTwoFactorModalOpen, setIsTwoFactorModalOpen] = useState(false);

  // Fetch security data
  const { data: securityData, error, isLoading: isSecurityLoading } = useAccountSecurity();

  // Check if user is using social providers
  const { isSocialUser, isLoading: isSocialProviderLoading } = useSocialProvider();

  // Wait for all data to be ready before showing animations
  const isDataReady = !isSecurityLoading && !isSocialProviderLoading;

  // Account mutations
  const { verifyPassword, updatePassword, updateEmail } = useAccountMutation();

  // Form setup with validation
  const form = useForm<AccountSecurityFormValues>({
    resolver: zodResolver(AccountSecuritySchema),
    defaultValues: {
      email: "",
      currentPassword: "",
      newPassword: "",
      repeatPassword: "",
    },
    mode: "onChange",
  });

  // Show toast notification for errors
  useEffect(() => {
    if (error) {
      toast.error("Failed to load security data.", {
        className: "font-inter",
      });
    }
  }, [error]);

  // Initial values for change detection
  const [initialValues, setInitialValues] = useState<AccountSecurityFormValues | null>(null);

  // Form change detection
  const { isFieldChanged } = useFormChange(form, initialValues);

  // Update form when security data is loaded
  useEffect(() => {
    if (securityData) {
      const formData = {
        email: securityData.email || "",
        currentPassword: "",
        newPassword: "",
        repeatPassword: "",
      };
      form.reset(formData);
      setInitialValues(formData);
    }
  }, [securityData, form]);

  // Combined error messages for responsive validation
  const emailPasswordFieldsError =
    form.formState.errors.email?.message || form.formState.errors.currentPassword?.message;

  const newPasswordFieldsError =
    form.formState.errors.newPassword?.message || form.formState.errors.repeatPassword?.message;

  // Button state logic
  const isEmailSaveEnabled =
    !isEmailLocked &&
    isFieldChanged("email") &&
    !form.formState.errors.email &&
    !updateEmail.isPending;

  const isPasswordSubmitEnabled =
    !isPasswordLocked &&
    form.watch("currentPassword") &&
    !form.formState.errors.currentPassword &&
    !verifyPassword.isPending;

  const isNewPasswordSaveEnabled =
    isPasswordVerified &&
    form.watch("newPassword") &&
    form.watch("repeatPassword") &&
    !form.formState.errors.newPassword &&
    !form.formState.errors.repeatPassword &&
    !updatePassword.isPending;

  // Handle password verification
  const handlePasswordVerification = () => {
    const currentPassword = form.getValues("currentPassword");
    verifyPassword.mutate(
      { currentPassword },
      {
        onSuccess: (data) => {
          if (data?.success) {
            setIsPasswordVerified(true);
          }
        },
      }
    );
  };

  // Handle current password change to reset verification
  const handleCurrentPasswordChange = (value: string) => {
    if (isPasswordVerified) {
      setIsPasswordVerified(false);
    }
    return value;
  };

  // Handle password update
  const handlePasswordUpdate = () => {
    const { currentPassword, newPassword, repeatPassword } = form.getValues();
    updatePassword.mutate({
      currentPassword,
      newPassword,
      repeatPassword,
    });
  };

  // Handle email update
  const handleEmailUpdate = () => {
    const { email, currentPassword } = form.getValues();
    updateEmail.mutate({
      email,
      currentPassword: currentPassword || "",
    });
  };

  // Handle lock/unlock with field reset
  const handleEmailLockToggle = () => {
    if (!isEmailLocked) {
      // If locking, reset to original value
      if (initialValues) {
        form.setValue("email", initialValues.email);
        form.clearErrors("email");
      }
    }
    setIsEmailLocked(!isEmailLocked);
  };

  const handlePasswordLockToggle = () => {
    if (!isPasswordLocked) {
      // If locking, reset password fields and verification state
      form.setValue("currentPassword", "");
      form.setValue("newPassword", "");
      form.setValue("repeatPassword", "");
      form.clearErrors("currentPassword");
      form.clearErrors("newPassword");
      form.clearErrors("repeatPassword");
      setIsPasswordVerified(false);
    }
    setIsPasswordLocked(!isPasswordLocked);
  };

  // Handle two-factor authentication toggle
  const handleTwoFactorToggle = (checked: boolean) => {
    if (checked && !isTwoFactorEnabled) {
      // If enabling 2FA, open the setup modal
      setIsTwoFactorModalOpen(true);
    } else if (!checked && isTwoFactorEnabled) {
      setIsTwoFactorEnabled(false);
    }
  };

  // Handle successful two-factor setup
  const handleTwoFactorSuccess = () => {
    setIsTwoFactorEnabled(true);
  };

  // Don't render anything until all data is ready
  if (!isDataReady) {
    return <div className="w-full" />;
  }

  return (
    <motion.div className="w-full" variants={contentVariants} initial="hidden" animate="show">
      {/* Security Header */}
      <motion.div variants={itemVariants} className="text-center lg:text-left">
        <h1 className="font-plus-jakarta-sans text-2xl font-semibold text-slate-800 uppercase md:text-3xl">
          Security
        </h1>
        <p className="font-inter mt-2 text-sm text-slate-600">
          Change your password or enable extra security measures.
        </p>
      </motion.div>

      {/* Security Form */}
      <motion.div variants={itemVariants}>
        <Form {...form}>
          <form className="mt-8 space-y-4">
            {/* Email and Change Password */}
            <div>
              {!isSocialProviderLoading &&
                (isSocialUser ? (
                  /* Email Field for Social Users - Full Width and Disabled */
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel className={`${sectionTitle} font-inter`}>Email</FormLabel>
                        <div className="mt-2">
                          <div className="cursor-not-allowed">
                            <FormControl>
                              <Input
                                placeholder="Enter email"
                                className={cn(
                                  uniformInputStyles,
                                  "w-full shadow-none",
                                  "border-slate-200 disabled:opacity-100"
                                )}
                                disabled={true}
                                {...field}
                              />
                            </FormControl>
                          </div>
                        </div>
                        <FormMessage className="font-inter text-xs" />
                      </FormItem>
                    )}
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* Email Field */}
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className={`${sectionTitle} font-inter`}>Email</FormLabel>
                          <div className="mt-2 flex items-start gap-2">
                            <div
                              className={cn("flex-grow", { "cursor-not-allowed": isEmailLocked })}
                            >
                              <FormControl>
                                <Input
                                  placeholder="Enter email"
                                  className={cn(
                                    uniformInputStyles,
                                    "w-full shadow-none",
                                    form.formState.errors.email &&
                                      "border-red-500 focus-visible:border-red-500",
                                    {
                                      "border-slate-200 disabled:opacity-100":
                                        isEmailLocked && !form.formState.errors.email,
                                    }
                                  )}
                                  disabled={isEmailLocked}
                                  {...field}
                                />
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
                                        "h-9 w-9 flex-shrink-0 cursor-pointer border-2 text-slate-400 shadow-none transition-colors ease-in-out hover:border-green-600 hover:bg-green-100 hover:text-green-600 md:h-10 md:w-10",
                                        "border-slate-200 shadow-none disabled:opacity-100"
                                      )}
                                      onClick={handleEmailLockToggle}
                                      aria-label={isEmailLocked ? "Unlock" : "Lock"}
                                      disabled={false}
                                    >
                                      {isEmailLocked ? (
                                        <HiOutlineLockClosed className="h-5 w-5" />
                                      ) : (
                                        <HiOutlineLockOpen className="h-5 w-5" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="font-inter">
                                    <p>{isEmailLocked ? "Unlock" : "Lock"}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <div className={cn({ "cursor-not-allowed": !isEmailSaveEnabled })}>
                                <TooltipProvider delayDuration={100}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className={cn(
                                          "h-9 w-9 flex-shrink-0 border-2 text-slate-400 shadow-none transition-colors ease-in-out disabled:opacity-100 md:h-10 md:w-10",
                                          isEmailSaveEnabled
                                            ? "cursor-pointer border-slate-200 hover:border-green-600 hover:bg-green-100 hover:text-green-600"
                                            : "cursor-not-allowed border-slate-200"
                                        )}
                                        disabled={!isEmailSaveEnabled}
                                        onClick={handleEmailUpdate}
                                        aria-label="Save"
                                      >
                                        {updateEmail.isPending ? (
                                          <LuLoaderCircle className="h-5 w-5 animate-spin" />
                                        ) : (
                                          <PiFloppyDiskBack className="h-5 w-5" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="font-inter">
                                      <p>Save</p>
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

                    {/* Current Password Field */}
                    <FormField
                      control={form.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className={`${sectionTitle} font-inter`}>
                            Change Password
                          </FormLabel>
                          <div className="mt-2 flex items-start gap-2">
                            <div
                              className={cn("flex-grow", {
                                "cursor-not-allowed": isPasswordLocked,
                              })}
                            >
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    type={showCurrentPassword ? "text" : "password"}
                                    placeholder="Enter current password"
                                    className={cn(
                                      uniformInputStyles,
                                      "w-full pr-10 shadow-none",
                                      form.formState.errors.currentPassword &&
                                        "border-red-500 focus-visible:border-red-500",
                                      {
                                        "border-slate-200 disabled:opacity-100":
                                          isPasswordLocked &&
                                          !form.formState.errors.currentPassword,
                                      }
                                    )}
                                    disabled={isPasswordLocked}
                                    {...field}
                                    onChange={(e) => {
                                      field.onChange(e);
                                      handleCurrentPasswordChange(e.target.value);
                                    }}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 transform cursor-pointer text-slate-500 shadow-none hover:bg-transparent hover:text-slate-700 md:right-2"
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    aria-label={
                                      showCurrentPassword ? "Hide password" : "Show password"
                                    }
                                    tabIndex={-1}
                                    disabled={isPasswordLocked}
                                  >
                                    {showCurrentPassword ? (
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
                                        "h-9 w-9 flex-shrink-0 cursor-pointer border-2 text-slate-400 shadow-none transition-colors ease-in-out hover:border-green-600 hover:bg-green-100 hover:text-green-600 md:h-10 md:w-10",
                                        "border-slate-200 disabled:opacity-100"
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
                              <div
                                className={cn({ "cursor-not-allowed": !isPasswordSubmitEnabled })}
                              >
                                <TooltipProvider delayDuration={100}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className={cn(
                                          "h-9 w-9 flex-shrink-0 border-2 text-slate-400 shadow-none transition-colors ease-in-out disabled:opacity-100 md:h-10 md:w-10",
                                          isPasswordSubmitEnabled
                                            ? "cursor-pointer border-slate-200 hover:border-green-600 hover:bg-green-100 hover:text-green-600"
                                            : "cursor-not-allowed border-slate-200"
                                        )}
                                        disabled={!isPasswordSubmitEnabled}
                                        onClick={handlePasswordVerification}
                                        aria-label="Submit"
                                      >
                                        {verifyPassword.isPending ? (
                                          <LuLoaderCircle className="h-5 w-5 animate-spin" />
                                        ) : (
                                          <PiPaperPlaneRight className="h-5 w-5" />
                                        )}
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
                  </div>
                ))}
              {/* Combined validation message for medium screens */}
              {!isSocialProviderLoading && !isSocialUser && emailPasswordFieldsError && (
                <div className="text-destructive font-inter mt-1 hidden text-xs md:block">
                  <p>{emailPasswordFieldsError}</p>
                </div>
              )}
            </div>

            {/* New Password and Repeat Password - Hidden for Social Users */}
            {!isSocialProviderLoading && !isSocialUser && (
              <div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* New Password Field */}
                  <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <div
                          className={cn("w-full shadow-none", {
                            "cursor-not-allowed": !isPasswordVerified,
                          })}
                        >
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Enter new password"
                              className={cn(
                                uniformInputStyles,
                                "w-full shadow-none",
                                form.formState.errors.newPassword &&
                                  "border-red-500 focus-visible:border-red-500",
                                {
                                  "border-slate-200 disabled:opacity-100":
                                    !isPasswordVerified && !form.formState.errors.newPassword,
                                }
                              )}
                              disabled={!isPasswordVerified}
                              {...field}
                            />
                          </FormControl>
                        </div>
                        {/* Individual validation message for small screens */}
                        <FormMessage className="font-inter text-xs md:hidden" />
                      </FormItem>
                    )}
                  />

                  {/* Repeat Password Field */}
                  <FormField
                    control={form.control}
                    name="repeatPassword"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <div className="flex items-start gap-2">
                          <div
                            className={cn("flex-grow", {
                              "cursor-not-allowed": !isPasswordVerified,
                            })}
                          >
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Repeat new password"
                                className={cn(
                                  uniformInputStyles,
                                  "w-full shadow-none",
                                  form.formState.errors.repeatPassword &&
                                    "border-red-500 focus-visible:border-red-500",
                                  {
                                    "border-slate-200 disabled:opacity-100":
                                      !isPasswordVerified && !form.formState.errors.repeatPassword,
                                  }
                                )}
                                disabled={!isPasswordVerified}
                                {...field}
                              />
                            </FormControl>
                          </div>
                          <div className={cn({ "cursor-not-allowed": !isNewPasswordSaveEnabled })}>
                            <TooltipProvider delayDuration={100}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className={cn(
                                      "h-9 w-9 flex-shrink-0 border-2 text-slate-400 shadow-none transition-colors ease-in-out disabled:opacity-100 md:h-10 md:w-10",
                                      isNewPasswordSaveEnabled
                                        ? "cursor-pointer border-slate-200 hover:border-green-600 hover:bg-green-100 hover:text-green-600"
                                        : "cursor-not-allowed border-slate-200"
                                    )}
                                    disabled={!isNewPasswordSaveEnabled}
                                    onClick={handlePasswordUpdate}
                                    aria-label="Save"
                                  >
                                    {updatePassword.isPending ? (
                                      <LuLoaderCircle className="h-5 w-5 animate-spin" />
                                    ) : (
                                      <PiFloppyDiskBack className="h-5 w-5" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="font-inter">
                                  <p>Save</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                        {/* Individual validation message for small screens */}
                        <FormMessage className="font-inter text-xs md:hidden" />
                      </FormItem>
                    )}
                  />
                </div>
                {/* Combined validation message for medium screens */}
                {newPasswordFieldsError && (
                  <div className="text-destructive font-inter mt-1 hidden text-xs md:block">
                    <p>{newPasswordFieldsError}</p>
                  </div>
                )}
              </div>
            )}

            {/* Two-Factor Authentication */}
            <div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="w-full">
                  <div
                    className={cn(
                      uniformInputStyles,
                      "flex w-full items-center justify-between rounded-md px-3 py-2 shadow-none"
                    )}
                  >
                    <span className="font-inter text-sm text-slate-700">
                      Two-Factor Authentication
                    </span>
                    <Switch
                      id="two-factor-toggle"
                      className="cursor-pointer data-[state=checked]:bg-emerald-600"
                      checked={isTwoFactorEnabled}
                      onCheckedChange={handleTwoFactorToggle}
                    />
                  </div>
                </div>
              </div>
            </div>
          </form>
        </Form>
      </motion.div>

      {/* Two-Factor Authentication Modal */}
      <TwoFactorEnableModal
        isOpen={isTwoFactorModalOpen}
        onOpenChange={setIsTwoFactorModalOpen}
        onSuccess={handleTwoFactorSuccess}
      />
    </motion.div>
  );
};

AccountSecurity.displayName = "AccountSecurity";
