"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import React from "react";
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
import { signUp } from "@/features/auth/actions/signup";
import { AuthFormContainer } from "@/features/auth/components/auth-form-container";
import { AuthPasswordInput } from "@/features/auth/components/auth-password-input";
import { AuthSocialProvider } from "@/features/auth/components/auth-social-provider";
import { AuthSubmitButton } from "@/features/auth/components/auth-submit-button";
import { type SignUpFormValues, SignUpSchema } from "@/features/auth/schemas/auth";

export default function SignUpForm() {
  // Manages the server state for the credentials sign-up action using TanStack Query
  const {
    mutate: credentialsSignUp,
    isPending: isCredentialsPending,
    data,
  } = useMutation({
    mutationFn: signUp,
  });

  // Initialize the form using react-hook-form with Zod for validation
  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  // Function to handle form submission
  const onSubmit = (values: SignUpFormValues) => {
    // Triggers the mutation with the form's values for the credentials sign-up
    credentialsSignUp(values);
  };

  // Determine if the main submit button should be visually disabled
  const isSubmitDisabled = !form.formState.isValid || isCredentialsPending;
  // Determine if all interactive elements should be disabled during any pending state
  const isAnyActionPending = isCredentialsPending;

  // Retrieve combined error message for name fields from react-hook-form state
  const nameFieldsError =
    form.formState.errors.firstName?.message || form.formState.errors.lastName?.message;

  return (
    <AuthFormContainer
      title="Create an account"
      description="Get started by filling the information fields below."
      footerText="Already have an account?"
      footerLinkText="Sign In"
      footerLinkHref="/signin"
    >
      {/* Sign-up form */}
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="font-inter mt-4 w-full space-y-3 md:space-y-4"
        >
          {/* Name input fields container */}
          <div>
            <div className="flex w-full flex-col gap-3 md:flex-row md:gap-6">
              {/* First Name input field */}
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem className="w-full md:w-1/2">
                    <FormLabel className="text-xs font-normal md:text-sm">First Name</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Enter your first name"
                        className="h-9 border-2 border-slate-200 text-sm placeholder:text-slate-400 focus-visible:border-green-600 focus-visible:ring-0 md:h-10"
                        {...field}
                        disabled={isAnyActionPending}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              {/* Last Name input field */}
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem className="w-full md:w-1/2">
                    <FormLabel className="text-xs font-normal md:text-sm">Last Name</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Enter your last name"
                        className="h-9 border-2 border-slate-200 text-sm placeholder:text-slate-400 focus-visible:border-green-600 focus-visible:ring-0 md:h-10"
                        {...field}
                        disabled={isAnyActionPending}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            {/* Combined validation messages for First Name and Last Name fields */}
            {nameFieldsError && (
              <div className="text-destructive mt-1 text-xs font-medium">
                <p>{nameFieldsError}</p>
              </div>
            )}
          </div>

          {/* Email input field */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-normal md:text-sm">Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    className="h-9 border-2 border-slate-200 text-sm placeholder:text-slate-400 focus-visible:border-green-600 focus-visible:ring-0 md:h-10"
                    {...field}
                    disabled={isAnyActionPending}
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          {/* Password input field with visibility toggle */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <AuthPasswordInput
                field={field}
                label="Password"
                placeholder="Enter your password"
                disabled={isAnyActionPending}
              />
            )}
          />

          {/* Confirm Password input field with visibility toggle */}
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <AuthPasswordInput
                field={field}
                label="Confirm Password"
                placeholder="Confirm your password"
                disabled={isAnyActionPending}
              />
            )}
          />

          {/* Displaying form feedback messages */}
          <FormFeedback message={data?.error} type="error" />
          <FormFeedback message={data?.success} type="success" />

          {/* Sign Up Button */}
          <AuthSubmitButton
            isDisabled={isSubmitDisabled}
            isPending={isCredentialsPending}
            pendingText="Signing Up..."
          >
            Sign Up
          </AuthSubmitButton>
        </form>
      </Form>

      <AuthSocialProvider disabled={isAnyActionPending} separatorText="Or sign up with" />
    </AuthFormContainer>
  );
}

SignUpForm.displayName = "SignUpForm";
