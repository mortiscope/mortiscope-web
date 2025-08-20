import { memo } from "react";
import type { UseFormReturn } from "react-hook-form";
import { HiOutlineLockClosed, HiOutlineLockOpen } from "react-icons/hi2";
import { LuLoaderCircle } from "react-icons/lu";
import { PiPaperPlaneRight } from "react-icons/pi";

import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AccountPasswordInput } from "@/features/account/components/account-password-input";
import { sectionTitle } from "@/features/cases/constants/styles";
import { cn } from "@/lib/utils";

/**
 * Defines the props required by the password verification section component.
 */
interface PasswordVerificationSectionProps {
  /** The `react-hook-form` instance, used to register the current password input. */
  form: UseFormReturn<{ currentPassword: string; newPassword: string; repeatPassword: string }>;
  /** A boolean to control the locked/unlocked state of the input. */
  isPasswordLocked: boolean;
  /** A boolean to enable or disable the submit button for verification. */
  isPasswordSubmitEnabled: boolean;
  /** A boolean indicating if the password verification mutation is in progress. */
  verifyPasswordIsPending: boolean;
  /** A callback function to toggle the locked state of the input. */
  onPasswordLockToggle: () => void;
  /** A callback function to initiate the password verification process. */
  onPasswordVerification: () => void;
  /** A callback function that is invoked on every change to the current password input. */
  onCurrentPasswordChange: (value: string) => string;
}

/**
 * A presentational component that renders the current password input field and its
 * associated actions. It's the first step in the password change process, requiring
 * the user to re-authenticate before proceeding to set a new password.
 */
export const PasswordVerificationSection = memo(
  ({
    form,
    isPasswordLocked,
    isPasswordSubmitEnabled,
    verifyPasswordIsPending,
    onPasswordLockToggle,
    onPasswordVerification,
    onCurrentPasswordChange,
  }: PasswordVerificationSectionProps) => {
    return (
      <FormField
        control={form.control}
        name="currentPassword"
        render={({ field }) => (
          <FormItem className="w-full">
            <FormLabel className={`${sectionTitle} font-inter`}>Change Password</FormLabel>
            <div className="mt-2 flex items-start gap-2">
              <div
                className={cn("flex-grow", {
                  "cursor-not-allowed": isPasswordLocked,
                })}
              >
                <FormControl>
                  <AccountPasswordInput
                    placeholder="Enter current password"
                    disabled={isPasswordLocked}
                    hasError={!!form.formState.errors.currentPassword}
                    focusColor="emerald"
                    className={cn({
                      // Ensures a consistent disabled appearance.
                      "border-slate-200 disabled:opacity-100":
                        isPasswordLocked && !form.formState.errors.currentPassword,
                    })}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      onCurrentPasswordChange(e.target.value);
                    }}
                  />
                </FormControl>
              </div>
              {/* The action buttons for this section. */}
              <div className="flex gap-2">
                {/* Lock/Unlock Button */}
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
                        onClick={onPasswordLockToggle}
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
                {/* Submit for Verification Button */}
                <div className={cn({ "cursor-not-allowed": !isPasswordSubmitEnabled })}>
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
                          onClick={onPasswordVerification}
                          aria-label="Submit"
                        >
                          {verifyPasswordIsPending ? (
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
            {/* Renders the validation message below the input on smaller screens for better layout. */}
            <FormMessage className="font-inter text-xs md:hidden" />
          </FormItem>
        )}
      />
    );
  }
);

PasswordVerificationSection.displayName = "PasswordVerificationSection";
