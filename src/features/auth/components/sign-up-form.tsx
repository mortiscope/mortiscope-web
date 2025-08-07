"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { signIn as socialSignIn } from "next-auth/react";
import React, { useState, useTransition } from "react";
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
import { Separator } from "@/components/ui/separator";
import { signUp } from "@/features/auth/actions/signup";
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

  // State to manage password visibility (show/hide)
  const [showPassword, setShowPassword] = useState(false);
  // State to manage confirm password visibility (show/hide)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Handle the pending state for social OAuth sign-in, which is a separate client-side flow
  const [isSocialPending, startSocialTransition] = useTransition();

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

  // Function to handle OAuth sign-in
  const handleOAuthSignIn = (provider: "google" | "orcid" | "microsoft-entra-id") => {
    startSocialTransition(async () => {
      try {
        await socialSignIn(provider, {
          callbackUrl: "/dashboard",
        });
      } catch (error) {
        console.error("OAuth sign-in error:", error);
      }
    });
  };

  // Function to toggle the password visibility state
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Function to toggle the confirm password visibility state
  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // Determine if the main submit button should be visually disabled
  const isSubmitDisabled = !form.formState.isValid || isCredentialsPending || isSocialPending;
  // Determine if all interactive elements should be disabled during any pending state
  const isAnyActionPending = isCredentialsPending || isSocialPending;

  // Retrieve combined error message for name fields from react-hook-form state
  const nameFieldsError =
    form.formState.errors.firstName?.message || form.formState.errors.lastName?.message;

  return (
    // Main container for the sign-up form
    <div className="flex w-full flex-col items-center space-y-4 px-4 py-6 md:space-y-5 md:px-0 md:py-0">
      {/* Logo section, links to homepage */}
      <div className="mb-1 flex flex-col items-center md:mb-2">
        <Link href="/" aria-label="Go to homepage">
          <div className="flex cursor-pointer items-center">
            <Image
              src="/logos/logo.svg"
              alt="Mortiscope Logo"
              width={60}
              height={60}
              className="md:h-[80px] md:w-[80px]"
            />
          </div>
        </Link>
      </div>
      {/* Heading and Description for the sign-up page */}
      <div className="text-center">
        <h1 className="font-plus-jakarta-sans text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
          Create an account
        </h1>
        <p className="font-inter mt-1 text-sm text-slate-600 md:mt-2">
          Get started by filling the information fields below.
        </p>
      </div>

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
              <FormItem>
                <FormLabel className="text-xs font-normal md:text-sm">Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="h-9 border-2 border-slate-200 pr-10 text-sm placeholder:text-slate-400 focus-visible:border-green-600 focus-visible:ring-0 md:h-10"
                      {...field}
                      disabled={isAnyActionPending}
                    />

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

          {/* Confirm Password input field with visibility toggle */}
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-normal md:text-sm">Confirm Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      className="h-9 border-2 border-slate-200 pr-10 text-sm placeholder:text-slate-400 focus-visible:border-green-600 focus-visible:ring-0 md:h-10"
                      {...field}
                      disabled={isAnyActionPending}
                    />
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
          <FormFeedback message={data?.success} type="success" />

          {/* Sign Up Button */}
          <div className={`inline-block w-full ${isSubmitDisabled ? "cursor-not-allowed" : ""}`}>
            <Button
              type="submit"
              disabled={isSubmitDisabled}
              className={`font-inter relative mt-2 h-9 w-full overflow-hidden rounded-lg border-none bg-green-600 text-sm font-normal text-white uppercase transition-all duration-300 ease-in-out md:mt-0 md:h-10 md:text-base ${
                isSubmitDisabled
                  ? "opacity-60"
                  : "cursor-pointer before:absolute before:top-0 before:-left-full before:z-[-1] before:h-full before:w-full before:rounded-lg before:bg-gradient-to-r before:from-yellow-400 before:to-yellow-500 before:transition-all before:duration-600 before:ease-in-out hover:scale-100 hover:border-transparent hover:bg-emerald-600 hover:text-white hover:shadow-lg hover:shadow-yellow-500/20 hover:before:left-0"
              }`}
            >
              {isCredentialsPending ? "Signing Up..." : "Sign Up"}
            </Button>
          </div>
        </form>
      </Form>

      {/* Separator with text in the middle */}
      <div className="relative w-full pt-2 md:pt-0">
        <Separator />
        <span className="font-inter absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform bg-white px-2 text-xs text-slate-500">
          Or sign up with
        </span>
      </div>

      {/* Social Login Buttons section */}
      <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 md:gap-3">
        {/* Array of social providers, mapped to create buttons */}
        {[
          { src: "/logos/logo-google.svg", alt: "Google", label: "Google" },
          { src: "/logos/logo-linkedin.svg", alt: "LinkedIn", label: "LinkedIn" },
          { src: "/logos/logo-microsoft.svg", alt: "Microsoft", label: "Microsoft" },
          { src: "/logos/logo-orcid.svg", alt: "ORCID", label: "ORCID" },
        ].map((provider) => (
          <Button
            key={provider.label}
            variant="outline"
            onClick={() => {
              const providerName = provider.label.toLowerCase();
              if (providerName === "google") {
                handleOAuthSignIn("google");
              } else if (providerName === "orcid") {
                handleOAuthSignIn("orcid");
              } else if (providerName === "microsoft") {
                handleOAuthSignIn("microsoft-entra-id");
              }
            }}
            disabled={isAnyActionPending}
            className="relative h-9 w-full cursor-pointer overflow-hidden rounded px-5 py-2.5 text-white transition-all duration-500 hover:rounded-sm hover:bg-green-200 hover:ring-2 hover:ring-green-300 hover:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:h-10"
          >
            {/* Social provider logos */}
            <Image
              src={provider.src}
              alt={provider.alt}
              width={18}
              height={18}
              className="relative md:h-5 md:w-5"
            />
          </Button>
        ))}
      </div>

      {/* Link to Sign In page for existing users */}
      <p className="font-inter pt-2 text-center text-xs text-slate-600 md:pt-0 md:text-sm">
        Already have an account?{" "}
        <Link
          href="/signin"
          className="relative font-medium text-green-700 after:absolute after:-bottom-1 after:left-0 after:h-[1.5px] after:w-full after:origin-bottom-right after:scale-x-0 after:bg-green-600 after:transition-transform after:duration-500 after:ease-[cubic-bezier(0.65_0.05_0.36_1)] hover:text-green-600 hover:after:origin-bottom-left hover:after:scale-x-100"
        >
          Sign In
        </Link>
      </p>
    </div>
  );
}
