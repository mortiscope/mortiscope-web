"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { forgotPassword } from "@/actions/forgot-password";
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
import { type ForgotPasswordFormValues, ForgotPasswordSchema } from "@/lib/schemas/auth";

export default function ForgotPasswordForm() {
  // State for overall form success or error messages from the server action
  const [error, setError] = useState<string | undefined>("");
  const [success, setSuccess] = useState<string | undefined>("");

  // Handle the pending state of the server action
  const [isPending, startTransition] = useTransition();

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
    // Clear previous messages before a new submission
    setError("");
    setSuccess("");

    // Wrap the server action in a transition to manage pending UI states
    startTransition(() => {
      forgotPassword(values).then((data) => {
        // Set the message based on the response
        setError(data?.error);
        setSuccess(data?.success);
      });
    });
  };

  // Determine if the button should be visually disabled based on form validity and pending state
  const isButtonDisabled = !form.formState.isValid || isPending;

  return (
    // Main container for the forgot password form
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
      {/* Heading and Description for the forgot password page */}
      <div className="text-center">
        <h1 className="font-plus-jakarta-sans text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
          Forgot Password?
        </h1>
        <p className="font-inter mt-1 text-sm text-slate-600 md:mt-2">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>
      </div>

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
                <FormLabel className="text-xs font-normal md:text-sm">Email</FormLabel>
                <FormControl>
                  <Input
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
          <FormFeedback message={success} type="success" />
          <FormFeedback message={error} type="error" />

          {/* Wrapper to apply disabled cursor style to the button */}
          <div className={`inline-block w-full ${isButtonDisabled ? "cursor-not-allowed" : ""}`}>
            {/* Send Reset Link Button */}
            <Button
              type="submit"
              disabled={isButtonDisabled}
              className={`font-inter relative mt-2 h-9 w-full overflow-hidden rounded-lg border-none bg-green-600 text-sm font-normal text-white uppercase transition-all duration-300 ease-in-out md:mt-0 md:h-10 md:text-base ${
                isButtonDisabled
                  ? "opacity-60"
                  : "cursor-pointer before:absolute before:top-0 before:-left-full before:z-[-1] before:h-full before:w-full before:rounded-lg before:bg-gradient-to-r before:from-yellow-400 before:to-yellow-500 before:transition-all before:duration-600 before:ease-in-out hover:scale-100 hover:border-transparent hover:bg-emerald-600 hover:text-white hover:shadow-lg hover:shadow-yellow-500/20 hover:before:left-0"
              }`}
            >
              {isPending ? "Sending..." : "Send Reset Link"}
            </Button>
          </div>
        </form>
      </Form>

      {/* Link back to Sign In page */}
      <p className="font-inter text-center text-xs text-slate-600 md:text-sm">
        Remembered your password?&nbsp;
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
