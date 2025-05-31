"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import Link from "next/link";
import { signIn as socialSignIn } from "next-auth/react";
import React, { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { PiEye, PiEyeSlash } from "react-icons/pi";

import { signIn } from "@/actions/signin";
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
import { type SignInFormValues, SignInSchema } from "@/lib/schemas/auth";

export default function SignInForm() {
  // State to manage password visibility (show/hide)
  const [showPassword, setShowPassword] = useState(false);

  // State for overall form error messages from the server action
  const [error, setError] = useState<string | undefined>();

  // Handle the pending state of the server action
  const [isPending, startTransition] = useTransition();

  // Initialize the form using react-hook-form with Zod for validation
  const form = useForm<SignInFormValues>({
    resolver: zodResolver(SignInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onChange",
  });

  // Function to handle form submission
  const onSubmit = (values: SignInFormValues) => {
    // Clear previous messages before a new submission
    setError("");

    // Wrap the server action in startTransition to manage pending UI states
    startTransition(() => {
      signIn(values).then((data) => {
        setError(data?.error);
      });
    });
  };

  // Function to handle OAuth sign-in
  const handleOAuthSignIn = (provider: "google" | "orcid") => {
    startTransition(() => {
      socialSignIn(provider, {
        callbackUrl: "/dashboard",
      });
    });
  };

  // Function to toggle the password visibility state
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Determine if the button should be disabled based on form validity and pending state
  const isButtonDisabled = !form.formState.isValid || isPending;

  return (
    // Main container for the sign-in form
    <div className="flex w-full flex-col items-center space-y-4 px-4 py-6 md:space-y-5 md:px-0 md:py-0">
      {/* Logo section, links to homepage */}
      <div className="mb-1 flex flex-col items-center md:mb-2">
        <Link href="/" aria-label="Go to homepage">
          <div className="flex cursor-pointer items-center">
            <Image
              src="/logo.svg"
              alt="Mortiscope Logo"
              width={60}
              height={60}
              className="md:h-[80px] md:w-[80px]"
            />
          </div>
        </Link>
      </div>
      {/* Heading and Description for the sign-in page */}
      <div className="text-center">
        <h1 className="font-plus-jakarta-sans text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
          Welcome back!
        </h1>
        <p className="font-inter mt-1 text-sm text-slate-600 md:mt-2">
          Sign in to access your account and continue your work.
        </p>
      </div>

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
                <FormLabel className="text-xs font-normal md:text-sm">Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    className="h-9 border-2 border-slate-200 text-sm placeholder:text-slate-400 focus-visible:border-green-600 focus-visible:ring-0 md:h-10"
                    {...field}
                    disabled={isPending}
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
                      disabled={isPending}
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
          <div className={`inline-block w-full ${isButtonDisabled ? "cursor-not-allowed" : ""}`}>
            <Button
              type="submit"
              disabled={isButtonDisabled}
              className={`font-inter relative mt-2 h-9 w-full overflow-hidden rounded-lg border-none bg-green-600 text-sm font-normal text-white uppercase transition-all duration-300 ease-in-out md:mt-0 md:h-10 md:text-base ${
                isButtonDisabled
                  ? "opacity-60"
                  : "cursor-pointer before:absolute before:top-0 before:-left-full before:z-[-1] before:h-full before:w-full before:rounded-lg before:bg-gradient-to-r before:from-yellow-400 before:to-yellow-500 before:transition-all before:duration-600 before:ease-in-out hover:scale-100 hover:border-transparent hover:bg-emerald-600 hover:text-white hover:shadow-lg hover:shadow-yellow-500/20 hover:before:left-0"
              }`}
            >
              {isPending ? "Signing In..." : "Sign In"}
            </Button>
          </div>
        </form>

        {/* Displaying form feedback messages */}
        <FormFeedback message={error} type="error" />
      </Form>

      {/* Separator with text in the middle */}
      <div className="relative w-full pt-2 md:pt-0">
        <Separator />
        <span className="font-inter absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform bg-white px-2 text-xs text-slate-500">
          Or sign in with
        </span>
      </div>

      {/* Social Login Buttons section */}
      <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 md:gap-3">
        {/* Array of social providers, mapped to create buttons */}
        {[
          { src: "/logo-google.svg", alt: "Google", label: "Google" },
          { src: "/logo-linkedin.svg", alt: "LinkedIn", label: "LinkedIn" },
          { src: "/logo-microsoft.svg", alt: "Microsoft", label: "Microsoft" },
          { src: "/logo-orcid.svg", alt: "ORCID", label: "ORCID" },
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
              }
            }}
            disabled={isPending}
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

      {/* Link to Sign Up page for new users */}
      <p className="font-inter pt-2 text-center text-xs text-slate-600 md:pt-0 md:text-sm">
        Don&apos;t have an account?&nbsp;
        <Link
          href="/signup"
          className="relative font-medium text-green-700 after:absolute after:-bottom-1 after:left-0 after:h-[1.5px] after:w-full after:origin-bottom-right after:scale-x-0 after:bg-green-600 after:transition-transform after:duration-500 after:ease-[cubic-bezier(0.65_0.05_0.36_1)] hover:text-green-600 hover:after:origin-bottom-left hover:after:scale-x-100"
        >
          Sign Up
        </Link>
      </p>
    </div>
  );
}
