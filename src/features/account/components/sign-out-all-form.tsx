"use client";

import { type UseFormReturn } from "react-hook-form";

import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AccountPasswordInput } from "@/features/account/components/account-password-input";
import { type AccountAllSessionsModalFormValues } from "@/features/account/schemas/account";
import { cn } from "@/lib/utils";

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
 * Props for the SignOutAllForm component.
 */
interface SignOutAllFormProps {
  /** React Hook Form instance */
  form: UseFormReturn<AccountAllSessionsModalFormValues>;
  /** Whether the form is in a signing out state */
  isSigningOut: boolean;
  /** Form submission handler */
  onSubmit: (values: AccountAllSessionsModalFormValues) => Promise<void>;
}

/**
 * A form component that handles the sign-out options and password verification
 * for signing out of all sessions. Includes radio group for sign-out scope
 * and password input for re-authentication.
 */
export const SignOutAllForm = ({ form, isSigningOut, onSubmit }: SignOutAllFormProps) => {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                <AccountPasswordInput
                  {...field}
                  disabled={isSigningOut}
                  focusColor="rose"
                  hasError={!!form.formState.errors.password}
                />
              </FormControl>
              <FormMessage className="font-inter text-xs" />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
};

SignOutAllForm.displayName = "SignOutAllForm";
