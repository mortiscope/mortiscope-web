"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { HiOutlineLockClosed, HiOutlineLockOpen } from "react-icons/hi2";
import { PiEye, PiEyeSlash, PiFloppyDiskBack } from "react-icons/pi";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { sectionTitle, uniformInputStyles } from "@/features/cases/constants/styles";
import { cn } from "@/lib/utils";

// Form data type for account security
type AccountSecurityForm = {
  email: string;
  currentPassword: string;
  newPassword: string;
  repeatPassword: string;
};

/**
 * The security tab content component for the account settings page.
 */
export const AccountSecurity = () => {
  const [isEmailLocked, setIsEmailLocked] = useState(true);
  const [isPasswordLocked, setIsPasswordLocked] = useState(true);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);

  // Form setup
  const form = useForm<AccountSecurityForm>({
    defaultValues: {
      email: "",
      currentPassword: "",
      newPassword: "",
      repeatPassword: "",
    },
  });

  return (
    <div className="w-full">
      {/* Security Header */}
      <div className="text-center lg:text-left">
        <h1 className="font-plus-jakarta-sans text-2xl font-semibold text-slate-800 uppercase md:text-3xl">
          Security
        </h1>
        <p className="font-inter mt-2 text-sm text-slate-600">
          Change your password or enable extra security measures.
        </p>
      </div>

      {/* Security Form */}
      <Form {...form}>
        <form className="mt-8 space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="w-full">
              <Label className={sectionTitle}>Email</Label>
              <div className="mt-2 flex items-start gap-2">
                <div className={cn("flex-grow", { "cursor-not-allowed": isEmailLocked })}>
                  <Input
                    placeholder="Enter email"
                    className={cn(uniformInputStyles, "w-full")}
                    disabled={isEmailLocked}
                    {...form.register("email")}
                  />
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
                              "border-slate-100": isEmailLocked,
                              "border-slate-200": !isEmailLocked,
                            }
                          )}
                          onClick={() => setIsEmailLocked(!isEmailLocked)}
                          aria-label={isEmailLocked ? "Unlock" : "Lock"}
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
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 flex-shrink-0 cursor-pointer border-2 border-slate-200 text-slate-400 transition-colors ease-in-out hover:border-green-600 hover:bg-green-100 hover:text-green-600 md:h-10 md:w-10"
                          aria-label="Save"
                        >
                          <PiFloppyDiskBack className="h-5 w-5" />
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

            <div className="w-full">
              <Label className={sectionTitle}>Change Password</Label>
              <div className="mt-2 flex items-start gap-2">
                <div className={cn("flex-grow", { "cursor-not-allowed": isPasswordLocked })}>
                  <div className="relative">
                    <Input
                      type={showCurrentPassword ? "text" : "password"}
                      placeholder="Enter current password"
                      className={cn(uniformInputStyles, "w-full pr-10")}
                      disabled={isPasswordLocked}
                      {...form.register("currentPassword")}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 transform cursor-pointer text-slate-500 hover:bg-transparent hover:text-slate-700 md:right-2"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      aria-label={showCurrentPassword ? "Hide password" : "Show password"}
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
                </div>
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
                        onClick={() => setIsPasswordLocked(!isPasswordLocked)}
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
              </div>
            </div>

            <div className="w-full">
              <div className={cn("w-full", { "cursor-not-allowed": isPasswordLocked })}>
                <Input
                  type="password"
                  placeholder="Enter new password"
                  className={cn(uniformInputStyles, "w-full")}
                  disabled={isPasswordLocked}
                  {...form.register("newPassword")}
                />
              </div>
            </div>

            <div className="w-full">
              <div className="flex items-start gap-2">
                <div className={cn("flex-grow", { "cursor-not-allowed": isPasswordLocked })}>
                  <Input
                    type="password"
                    placeholder="Repeat new password"
                    className={cn(uniformInputStyles, "w-full")}
                    disabled={isPasswordLocked}
                    {...form.register("repeatPassword")}
                  />
                </div>
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 flex-shrink-0 cursor-pointer border-2 border-slate-200 text-slate-400 transition-colors ease-in-out hover:border-green-600 hover:bg-green-100 hover:text-green-600 md:h-10 md:w-10"
                        aria-label="Save"
                      >
                        <PiFloppyDiskBack className="h-5 w-5" />
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
        </form>
      </Form>
    </div>
  );
};

AccountSecurity.displayName = "AccountSecurity";
