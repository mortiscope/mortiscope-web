import { memo } from "react";
import type { UseFormReturn } from "react-hook-form";
import { LuLoaderCircle } from "react-icons/lu";
import { PiFloppyDiskBack } from "react-icons/pi";

import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AccountPasswordInput } from "@/features/account/components/account-password-input";
import { cn } from "@/lib/utils";

/**
 * Defines the props required by the password change section component.
 */
interface PasswordChangeSectionProps {
  /** The `react-hook-form` instance, used to register the password inputs. */
  form: UseFormReturn<{ currentPassword: string; newPassword: string; repeatPassword: string }>;
  /** A boolean indicating if the current password has been verified, which enables these fields. */
  isPasswordVerified: boolean;
  /** A boolean to enable or disable the "Save" button. */
  isNewPasswordSaveEnabled: boolean;
  /** A boolean indicating if the password update mutation is in progress. */
  updatePasswordIsPending: boolean;
  /** An optional error message for cross-field validation, displayed on medium screens and up. */
  newPasswordFieldsError?: string;
  /** A callback function to initiate the password update process. */
  onPasswordUpdate: () => void;
}

/**
 * A presentational component that renders the "New Password" and "Repeat Password" fields,
 * along with the "Save" button, for the password change process. It is designed to be
 * enabled only after the user has successfully verified their current password.
 */
export const PasswordChangeSection = memo(
  ({
    form,
    isPasswordVerified,
    isNewPasswordSaveEnabled,
    updatePasswordIsPending,
    newPasswordFieldsError,
    onPasswordUpdate,
  }: PasswordChangeSectionProps) => {
    return (
      <div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Renders the "New Password" input field. */}
          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem className="w-full">
                <div
                  className={cn("w-full shadow-none", {
                    // Applies a 'not-allowed' cursor if the fields are disabled.
                    "cursor-not-allowed": !isPasswordVerified,
                  })}
                >
                  <FormControl>
                    <AccountPasswordInput
                      placeholder="Enter new password"
                      disabled={!isPasswordVerified}
                      hasError={!!form.formState.errors.newPassword}
                      focusColor="emerald"
                      autoComplete="new-password"
                      className={cn({
                        // Ensures a consistent disabled appearance.
                        "border-slate-200 shadow-none disabled:opacity-100":
                          !isPasswordVerified && !form.formState.errors.newPassword,
                      })}
                      {...field}
                    />
                  </FormControl>
                </div>
                {/* Renders the validation message below the input on smaller screens for better layout. */}
                <FormMessage className="font-inter text-xs md:hidden" />
              </FormItem>
            )}
          />

          {/* Renders the repeat password input field and the save button. */}
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
                      <AccountPasswordInput
                        placeholder="Repeat new password"
                        disabled={!isPasswordVerified}
                        hasError={!!form.formState.errors.repeatPassword}
                        focusColor="emerald"
                        autoComplete="new-password"
                        className={cn({
                          "border-slate-200 disabled:opacity-100":
                            !isPasswordVerified && !form.formState.errors.repeatPassword,
                        })}
                        {...field}
                      />
                    </FormControl>
                  </div>
                  {/* The save button for the new password. */}
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
                            onClick={onPasswordUpdate}
                            aria-label="Save"
                          >
                            {updatePasswordIsPending ? (
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
                {/* Individual validation message for small screens. */}
                <FormMessage className="font-inter text-xs md:hidden" />
              </FormItem>
            )}
          />
        </div>
        {/* Renders a combined error message for cross-field validation only on medium screens and up. */}
        {newPasswordFieldsError && (
          <div className="text-destructive font-inter mt-1 hidden text-xs md:block">
            <p>{newPasswordFieldsError}</p>
          </div>
        )}
      </div>
    );
  }
);

PasswordChangeSection.displayName = "PasswordChangeSection";
