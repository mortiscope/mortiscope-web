"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useId } from "react";
import { useForm } from "react-hook-form";

import { FormFeedback } from "@/components/form-feedback";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { forgotPassword } from "@/features/auth/actions/forgot-password";
import { AuthFormHeader } from "@/features/auth/components/auth-form-header";
import { AuthSubmitButton } from "@/features/auth/components/auth-submit-button";
import { type ForgotPasswordFormValues, ForgotPasswordSchema } from "@/features/auth/schemas/auth";

export default function ForgotPasswordForm() {
  // Generate stable ID for form elements to prevent hydration mismatches
  const formId = useId();

  // Manages the server state for the forgot password action using TanStack Query
  const { mutate, isPending, data } = useMutation({
    // Specifies the server action to be executed when the mutation is triggered
    mutationFn: forgotPassword,
  });

  // Initialize the form using react-hook-form with Zod for validation
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: {
      email: "",
    },
    mode: "onChange",
  });

  // Function to handle form submission
  const onSubmit = (values: ForgotPasswordFormValues) => {
    // Call the mutate function from useMutation, passing the form values
    mutate(values);
  };

  // Determine if the button should be visually disabled based on form validity and pending state
  const isButtonDisabled = !form.formState.isValid || isPending;

  return (
    // Main container for the forgot password form
    <div className="flex w-full flex-col items-center space-y-4 px-4 py-6 md:space-y-5 md:px-0 md:py-0">
      <AuthFormHeader
        title="Forgot Password?"
        description="Enter your email address and we'll send you a link to reset your password."
      />

      {/* Forgot password form */}
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="font-inter w-full space-y-3 md:space-y-4"
        >
          {/* Email input field */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor={`${formId}-email`} className="text-xs font-normal md:text-sm">
                  Email
                </FormLabel>
                <FormControl>
                  <Input
                    id={`${formId}-email`}
                    type="email"
                    placeholder="Enter your email"
                    disabled={isPending}
                    className="h-9 border-2 border-slate-200 text-sm placeholder:text-slate-400 focus-visible:border-green-600 focus-visible:ring-0 md:h-10"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          {/* Form feedback for success or error messages */}
          <FormFeedback message={data?.success} type="success" />
          <FormFeedback message={data?.error} type="error" />

          {/* Send Reset Link Button */}
          <AuthSubmitButton
            isDisabled={isButtonDisabled}
            isPending={isPending}
            pendingText="Sending..."
          >
            Send Reset Link
          </AuthSubmitButton>
        </form>
      </Form>

      {/* Link back to Sign In page */}
      <p className="font-inter text-center text-xs text-slate-600 md:text-sm">
        Remembered your password?{" "}
        <Link
          href="/signin"
          className="relative font-medium text-green-700 after:absolute after:-bottom-1 after:left-0 after:h-[1.5px] after:w-full after:origin-bottom-right after:scale-x-0 after:bg-green-600 after:transition-transform after:duration-500 after:ease-[cubic-bezier(0.65_0.05_0.36_1)] hover:text-green-600 hover:after:origin-bottom-left hover:after:scale-x-100"
        >
          Back to Sign In
        </Link>
      </p>
    </div>
  );
}

ForgotPasswordForm.displayName = "ForgotPasswordForm";
