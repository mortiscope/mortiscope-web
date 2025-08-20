import { memo } from "react";
import type { UseFormReturn } from "react-hook-form";
import { HiOutlineLockClosed, HiOutlineLockOpen } from "react-icons/hi2";
import { LuLoaderCircle } from "react-icons/lu";
import { PiFloppyDiskBack } from "react-icons/pi";

import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { sectionTitle, uniformInputStyles } from "@/features/cases/constants/styles";
import { cn } from "@/lib/utils";

/**
 * Defines the props required by the email section component.
 */
interface EmailSectionProps {
  /** The `react-hook-form` instance, used to register the email input. */
  form: UseFormReturn<{ email: string }>;
  /** A boolean indicating if the user is signed in via an OAuth provider. */
  isSocialUser: boolean;
  /** A boolean indicating if the social provider information is still loading. */
  isSocialProviderLoading: boolean;
  /** A boolean to control the locked/unlocked state of the email input. */
  isEmailLocked: boolean;
  /** A boolean to enable or disable the save button. */
  isEmailSaveEnabled: boolean;
  /** A boolean indicating if the email update mutation is in progress. */
  updateEmailIsPending: boolean;
  /** A callback function to toggle the locked state of the input. */
  onEmailLockToggle: () => void;
  /** A callback function to initiate the email update process. */
  onEmailUpdate: () => void;
}

/**
 * A presentational component that renders the email field and its associated actions
 * (lock/unlock, save) for the account security form. It has a distinct, disabled
 * state for users who are signed in via a social (OAuth) provider.
 */
export const EmailSection = memo(
  ({
    form,
    isSocialUser,
    isSocialProviderLoading,
    isEmailLocked,
    isEmailSaveEnabled,
    updateEmailIsPending,
    onEmailLockToggle,
    onEmailUpdate,
  }: EmailSectionProps) => {
    // If the social provider status is not yet determined, render nothing to prevent a layout flash.
    if (isSocialProviderLoading) return null;

    return (
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem className="w-full">
            <FormLabel className={`${sectionTitle} font-inter`}>Email</FormLabel>
            <div className="mt-2 flex items-start gap-2">
              <div
                className={cn("flex-grow", { "cursor-not-allowed": isEmailLocked || isSocialUser })}
              >
                <FormControl>
                  <Input
                    placeholder="Enter email"
                    className={cn(
                      uniformInputStyles,
                      "w-full shadow-none",
                      // Apply error styling if the field has a validation error.
                      form.formState.errors.email && "border-red-500 focus-visible:border-red-500",
                      {
                        "border-slate-200 disabled:opacity-100":
                          (isEmailLocked || isSocialUser) && !form.formState.errors.email,
                      }
                    )}
                    disabled={isEmailLocked || isSocialUser}
                    {...field}
                  />
                </FormControl>
              </div>
              {/* The lock and save action buttons are only rendered for non-social (credential-based) users. */}
              {!isSocialUser && (
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
                            "border-slate-200 shadow-none disabled:opacity-100"
                          )}
                          onClick={onEmailLockToggle}
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
                  {/* Save Button */}
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
                            onClick={onEmailUpdate}
                            aria-label="Save"
                          >
                            {updateEmailIsPending ? (
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
              )}
            </div>
            {/* Renders the validation message below the input on smaller screens for better layout. */}
            <FormMessage className="font-inter text-xs md:hidden" />
          </FormItem>
        )}
      />
    );
  }
);

EmailSection.displayName = "EmailSection";
