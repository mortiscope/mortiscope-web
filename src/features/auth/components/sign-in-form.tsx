"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { signIn } from "@/features/auth/actions/signin";
import { AuthFormContainer } from "@/features/auth/components/auth-form-container";
import { AuthPasswordInput } from "@/features/auth/components/auth-password-input";
import { AuthSocialProvider } from "@/features/auth/components/auth-social-provider";
import { AuthSubmitButton } from "@/features/auth/components/auth-submit-button";
import { type SignInFormValues, SignInSchema } from "@/features/auth/schemas/auth";

export default function SignInForm() {
  const router = useRouter();

  // State to track if the user is in the process of redirecting
  const [isRedirecting, setIsRedirecting] = React.useState(false);

  // Manages the server state for the credentials sign-in action using TanStack Query
  const {
    mutate: credentialsSignIn,
    isPending: isCredentialsPending,
    data,
  } = useMutation({
    mutationFn: signIn,
    onSuccess: (result) => {
      // Handle 2FA redirect
      if (result?.requiresTwoFactor) {
        setIsRedirecting(true);
        router.push("/signin/two-factor");
      }
    },
  });

  // Initialize the form using react-hook-form with Zod for validation
  const form = useForm<SignInFormValues>({
    resolver: zodResolver(SignInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onChange",
  });

  // Function to handle form submission for credentials
  const onSubmit = (values: SignInFormValues) => {
    // Triggers the mutation with the form's values for the credentials sign-in
    credentialsSignIn(values);
  };

  // Determine if the main submit button should be disabled
  const isSubmitDisabled = !form.formState.isValid || isCredentialsPending || isRedirecting;
  // Determine if social login buttons should be disabled
  const areSocialsDisabled = isCredentialsPending || isRedirecting;

  return (
    <AuthFormContainer
      title="Welcome back!"
      description="Sign in to access your account and continue your work."
      footerText="Don't have an account?"
      footerLinkText="Sign Up"
      footerLinkHref="/signup"
    >
      {/* Sign-in form */}
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="font-inter mt-4 w-full space-y-3 md:space-y-4"
        >
          {/* Email input field */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="email" className="text-xs font-normal md:text-sm">
                  Email
                </FormLabel>
                <FormControl>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    className="h-9 border-2 border-slate-200 text-sm placeholder:text-slate-400 focus-visible:border-green-600 focus-visible:ring-0 md:h-10"
                    {...field}
                    disabled={isCredentialsPending || isRedirecting}
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
                disabled={isCredentialsPending || isRedirecting}
                id="password"
              />
            )}
          />

          {/* Forgot Password anchor link */}
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="relative text-xs font-normal text-slate-600 after:absolute after:-bottom-0.5 after:left-0 after:h-[1.5px] after:w-full after:origin-bottom-right after:scale-x-0 after:bg-slate-800 after:transition-transform after:duration-500 after:ease-[cubic-bezier(0.65_0.05_0.36_1)] hover:text-slate-800 hover:after:origin-bottom-left hover:after:scale-x-100 md:text-sm"
            >
              Forgot Password?
            </Link>
          </div>

          {/* Sign In Button */}
          <AuthSubmitButton
            isDisabled={isSubmitDisabled}
            isPending={isCredentialsPending || isRedirecting}
            pendingText={isRedirecting ? "Redirecting..." : "Signing In..."}
          >
            Sign In
          </AuthSubmitButton>
        </form>

        {/* Displaying form feedback messages from the credentials mutation */}
        <FormFeedback message={data?.error} type="error" />
      </Form>

      <AuthSocialProvider disabled={areSocialsDisabled} separatorText="Or sign in with" />
    </AuthFormContainer>
  );
}

SignInForm.displayName = "SignInForm";
