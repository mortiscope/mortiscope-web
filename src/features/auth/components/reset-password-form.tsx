"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { PiEye, PiEyeSlash } from "react-icons/pi";

import { FormFeedback } from "@/components/form-feedback";
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
import { resetPassword } from "@/features/auth/actions/reset-password";
import { AuthFormHeader } from "@/features/auth/components/auth-form-header";
import { AuthSubmitButton } from "@/features/auth/components/auth-submit-button";
import { type ResetPasswordFormValues, ResetPasswordSchema } from "@/features/auth/schemas/auth";

export default function ResetPasswordForm() {
  // Hook to access URL search parameters
  const searchParams = useSearchParams();
  // Retrieve the password reset token from the URL
  const token = searchParams.get("token");

  // Manages the server state for the password reset action using TanStack Query
  const { mutate, isPending, data } = useMutation({
    // Specifies the server action to be executed
    mutationFn: (variables: { values: ResetPasswordFormValues; token?: string | null }) =>
      resetPassword(variables.values, variables.token),
  });

  // State to manage password visibility (show/hide)
  const [showPassword, setShowPassword] = useState(false);
  // State to manage confirm password visibility (show/hide)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Initialize the form using react-hook-form with Zod for validation
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmNewPassword: "",
    },
    mode: "onChange",
  });

  // Function to handle form submission
  const onSubmit = (values: ResetPasswordFormValues) => {
    // Triggers the mutation, passing the form values and the token as a single object
    mutate({ values, token });
  };

  // Function to toggle the password visibility state
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Function to toggle the confirm password visibility state
  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // Determine if the button should be visually disabled based on form validity and pending state
  const isButtonDisabled = !form.formState.isValid || isPending;

  // Render a message if the reset token is not present in the URL
  if (!token) {
    return (
      <div className="flex w-full flex-col items-center space-y-4 px-4 py-6 md:space-y-5 md:px-0 md:py-0">
        <AuthFormHeader
          title="Reset Password"
          description="You've reached the password reset page. To continue, use the link sent to your email."
        />

        {/* Container for error message and action button */}
        <div className="font-inter w-full max-w-md space-y-3 text-center md:space-y-4">
          {/* Display an error message indicating an invalid link */}
          <div className="flex min-h-[36px] w-full items-center justify-center rounded-lg md:min-h-[40px]">
            <FormFeedback
              type="error"
              message="It looks like this password reset link is invalid."
            />
          </div>

          {/* Button to navigate back to the forgot password page */}
          <AuthSubmitButton asChild>
            <Link href="/forgot-password">Go to Forgot Password</Link>
          </AuthSubmitButton>
        </div>
      </div>
    );
  }

  // Render the main password reset form if a token is present
  return (
    // Main container for the reset password form
    <div className="flex w-full flex-col items-center space-y-4 px-4 py-6 md:space-y-5 md:px-0 md:py-0">
      <AuthFormHeader
        title="Reset Password"
        description={
          !data?.success
            ? "Enter your new password below. Make sure that it meets the security requirements."
            : ""
        }
      />

      {/* Render the form only if the password has not been successfully reset */}
      {!data?.success && (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="font-inter w-full space-y-3 md:space-y-4"
          >
            {/* New password input field with visibility toggle */}
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-normal md:text-sm">New Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your new password"
                        disabled={isPending}
                        className="h-9 border-2 border-slate-200 text-sm placeholder:text-slate-400 focus-visible:border-green-600 focus-visible:ring-0 md:h-10"
                        {...field}
                      />
                      {/* Button to toggle password visibility */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 transform cursor-pointer text-slate-500 hover:bg-transparent hover:text-slate-700 md:right-2"
                        onClick={togglePasswordVisibility}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <PiEye size={18} className="md:h-5 md:w-5" />
                        ) : (
                          <PiEyeSlash size={18} className="md:h-5 md:w-5" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* Confirm new password input field with visibility toggle */}
            <FormField
              control={form.control}
              name="confirmNewPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-normal md:text-sm">
                    Confirm New Password
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your new password"
                        disabled={isPending}
                        className="h-9 border-2 border-slate-200 text-sm placeholder:text-slate-400 focus-visible:border-green-600 focus-visible:ring-0 md:h-10"
                        {...field}
                      />
                      {/* Button to toggle confirm password visibility */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 transform cursor-pointer text-slate-500 hover:bg-transparent hover:text-slate-700 md:right-2"
                        onClick={toggleConfirmPasswordVisibility}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? (
                          <PiEye size={18} className="md:h-5 md:w-5" />
                        ) : (
                          <PiEyeSlash size={18} className="md:h-5 md:w-5" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* Displaying form feedback messages */}
            <FormFeedback message={data?.error} type="error" />

            {/* Reset Password Button */}
            <AuthSubmitButton
              isDisabled={isButtonDisabled}
              isPending={isPending}
              pendingText="Resetting..."
            >
              Reset Password
            </AuthSubmitButton>
          </form>
        </Form>
      )}

      {/* Display success message and link to sign in */}
      {data?.success && (
        <div className="w-full">
          <FormFeedback message={data.success} type="success" />
          <AuthSubmitButton asChild>
            <Link href="/signin">Back to Sign In</Link>
          </AuthSubmitButton>
        </div>
      )}

      {/* Show an alternative link if the form is still active */}
      {!data?.success && (
        <p className="font-inter text-center text-xs text-slate-600 md:text-sm">
          No longer need to reset?{" "}
          <Link
            href="/signin"
            className="relative font-medium text-green-700 after:absolute after:-bottom-1 after:left-0 after:h-[1.5px] after:w-full after:origin-bottom-right after:scale-x-0 after:bg-green-600 after:transition-transform after:duration-500 after:ease-[cubic-bezier(0.65_0.05_0.36_1)] hover:text-green-600 hover:after:origin-bottom-left hover:after:scale-x-100"
          >
            Back to Sign In
          </Link>
        </p>
      )}
    </div>
  );
}

ResetPasswordForm.displayName = "ResetPasswordForm";
