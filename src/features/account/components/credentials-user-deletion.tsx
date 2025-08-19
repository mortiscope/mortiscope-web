import type { UseFormReturn } from "react-hook-form";
import { HiOutlineLockClosed, HiOutlineLockOpen } from "react-icons/hi2";
import { LuLoaderCircle } from "react-icons/lu";
import { PiEye, PiEyeSlash, PiPaperPlaneRight } from "react-icons/pi";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { uniformInputStyles } from "@/features/cases/constants/styles";
import { cn } from "@/lib/utils";

interface CredentialsUserDeletionProps {
  form: UseFormReturn<{ password: string }>;
  isPasswordLocked: boolean;
  showPassword: boolean;
  isPasswordSubmitEnabled: boolean;
  isDeleteEnabled: boolean;
  verifyPasswordIsPending: boolean;
  onPasswordLockToggle: () => void;
  onPasswordVerification: () => void;
  onPasswordChange: (value: string) => string;
  onDeleteAccount: () => void;
  setShowPassword: (show: boolean) => void;
}

/**
 * Credentials user deletion component.
 * Handles password verification and deletion for regular users (non-social).
 */
export const CredentialsUserDeletion = ({
  form,
  isPasswordLocked,
  showPassword,
  isPasswordSubmitEnabled,
  isDeleteEnabled,
  verifyPasswordIsPending,
  onPasswordLockToggle,
  onPasswordVerification,
  onPasswordChange,
  onDeleteAccount,
  setShowPassword,
}: CredentialsUserDeletionProps) => {
  return (
    <>
      {/* Regular User Layout - Password verification required */}
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
                      className={cn("flex-grow", {
                        "cursor-not-allowed": isPasswordLocked,
                      })}
                    >
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter password"
                            disabled={isPasswordLocked}
                            className={cn(
                              uniformInputStyles,
                              "w-full pr-10 shadow-none",
                              form.formState.errors.password &&
                                "border-red-500 focus-visible:border-red-500",
                              {
                                "border-slate-200 disabled:opacity-100":
                                  isPasswordLocked && !form.formState.errors.password,
                              }
                            )}
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              onPasswordChange(e.target.value);
                            }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 transform cursor-pointer text-slate-500 shadow-none hover:bg-transparent hover:text-slate-700 md:right-2"
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
              "font-inter h-9 w-full transition-all duration-300 ease-in-out disabled:opacity-100 md:h-10",
              isDeleteEnabled
                ? "cursor-pointer bg-rose-600 text-white hover:bg-rose-500 hover:shadow-lg hover:shadow-rose-500/20"
                : "cursor-not-allowed bg-rose-400 text-rose-100 hover:bg-rose-400"
            )}
            onClick={onDeleteAccount}
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
    </>
  );
};
