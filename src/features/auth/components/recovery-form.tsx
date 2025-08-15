"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import React, { Suspense } from "react";
import { useForm } from "react-hook-form";
import { BeatLoader } from "react-spinners";

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
import { verifySigninRecoveryCode } from "@/features/auth/actions/recovery";
import { clearTwoFactorSession } from "@/features/auth/actions/two-factor";
import {
  type SigninRecoveryCodeFormValues,
  SigninRecoveryCodeSchema,
} from "@/features/auth/schemas/auth";

function RecoveryProcess() {
  // Hook to access URL search parameters and router
  const searchParams = useSearchParams();
  const router = useRouter();
  // Get any error or session info from the URL
  const error = searchParams.get("error");

  // Initialize the form using react-hook-form with Zod for validation
  const form = useForm<SigninRecoveryCodeFormValues>({
    resolver: zodResolver(SigninRecoveryCodeSchema),
    defaultValues: {
      recoveryCode: "",
    },
    mode: "onChange",
  });

  // Recovery code verification mutation
  const {
    mutate: verifyRecoveryCode,
    isPending,
    data,
  } = useMutation({
    mutationFn: async (values: SigninRecoveryCodeFormValues) => {
      return verifySigninRecoveryCode(values.recoveryCode);
    },
    onSuccess: async (result) => {
      if (result.success && result.verified) {
        // Complete the signin process on the client side
        try {
          const signinResult = await signIn("credentials", {
            email: result.email,
            password: "2fa-verified",
            redirect: false,
          });

          if (signinResult?.ok) {
            // Clear the temporary auth session
            await clearTwoFactorSession();
            // Redirect to dashboard on successful verification
            router.push("/dashboard");
          } else {
            console.error("Client-side signin failed:", signinResult?.error);
          }
        } catch (error) {
          console.error("Client-side signin failed:", error);
        }
      }
    },
  });

  // Function to handle form submission
  const onSubmit = (values: SigninRecoveryCodeFormValues) => {
    verifyRecoveryCode(values);
  };

  // Determine if the submit button should be disabled
  const isSubmitDisabled = !form.formState.isValid || isPending;

  // Show error message if user accessed this page without proper session
  if (error === "no-session") {
    return (
      <div className="flex w-full flex-col items-center space-y-4 px-4 py-6 md:space-y-5 md:px-0 md:py-0">
        {/* Logo and link to the homepage */}
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
        {/* Page title and description */}
        <div className="text-center">
          <h1 className="font-plus-jakarta-sans text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Account Recovery
          </h1>
          <p className="font-inter mt-1 text-sm text-slate-600 md:mt-2">
            This page is used to recover your account using a recovery code.
          </p>
        </div>
        {/* Container for feedback and action button */}
        <div className="font-inter w-full max-w-md space-y-3 text-center md:space-y-4">
          <div className="flex min-h-[36px] w-full items-center justify-center rounded-lg md:min-h-[40px]">
            <FormFeedback
              message="This page is used to recover your account using a recovery code."
              type="error"
            />
          </div>
          <Button
            asChild
            className="font-inter relative h-9 w-full cursor-pointer overflow-hidden rounded-lg border-none bg-green-600 text-sm font-normal text-white uppercase transition-all duration-300 ease-in-out before:absolute before:top-0 before:-left-full before:z-[-1] before:h-full before:w-full before:rounded-lg before:bg-gradient-to-r before:from-yellow-400 before:to-yellow-500 before:transition-all before:duration-600 before:ease-in-out hover:scale-100 hover:border-transparent hover:bg-emerald-600 hover:text-white hover:shadow-lg hover:shadow-yellow-500/20 hover:before:left-0 md:h-10 md:text-base"
          >
            <Link href="/signin">Back to Sign In</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    // Main container for the recovery code verification page content
    <div className="flex w-full flex-col items-center space-y-4 px-4 py-6 md:space-y-5 md:px-0 md:py-0">
      {/* Logo and link to the homepage */}
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
      {/* Page title and description */}
      <div className="text-center">
        <h1 className="font-plus-jakarta-sans text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
          Account Recovery
        </h1>
        <p className="font-inter mt-1 text-sm text-slate-600 md:mt-2">
          Enter one of your recovery codes to complete sign-in.
        </p>
      </div>

      {/* Recovery Code Form */}
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="font-inter w-full max-w-md space-y-4"
        >
          {/* Recovery Code input field */}
          <FormField
            control={form.control}
            name="recoveryCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="recoveryCode" className="text-xs font-normal md:text-sm">
                  Recovery Code
                </FormLabel>
                <FormControl>
                  <Input
                    id="recoveryCode"
                    type="text"
                    placeholder="Enter your recovery code"
                    className="h-9 border-2 border-slate-200 text-sm placeholder:text-slate-400 focus-visible:border-green-600 focus-visible:ring-0 md:h-10"
                    {...field}
                    disabled={isPending}
                    autoComplete="off"
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          {/* Error/Success Messages */}
          {data && (
            <div className="flex min-h-[36px] w-full items-center justify-center rounded-lg md:min-h-[40px]">
              <FormFeedback
                message={
                  data.success ? "Recovery successful!" : data.error || "Invalid recovery code."
                }
                type={data.success ? "success" : "error"}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Verify Button */}
            <div className={`inline-block w-full ${isSubmitDisabled ? "cursor-not-allowed" : ""}`}>
              <Button
                type="submit"
                disabled={isSubmitDisabled}
                className={`font-inter relative h-9 w-full overflow-hidden rounded-lg border-none bg-green-600 text-sm font-normal text-white uppercase transition-all duration-300 ease-in-out md:h-10 md:text-base ${
                  isSubmitDisabled
                    ? "opacity-60"
                    : "cursor-pointer before:absolute before:top-0 before:-left-full before:z-[-1] before:h-full before:w-full before:rounded-lg before:bg-gradient-to-r before:from-yellow-400 before:to-yellow-500 before:transition-all before:duration-600 before:ease-in-out hover:scale-100 hover:border-transparent hover:bg-emerald-600 hover:text-white hover:shadow-lg hover:shadow-yellow-500/20 hover:before:left-0"
                }`}
              >
                {isPending ? "Verifying..." : "Verify Code"}
              </Button>
            </div>

            {/* Alternative Options */}
            <p className="font-inter text-center text-xs text-slate-600 md:text-sm">
              Change your mind?{" "}
              <Link
                href="/signin"
                className="relative font-medium text-green-700 after:absolute after:-bottom-1 after:left-0 after:h-[1.5px] after:w-full after:origin-bottom-right after:scale-x-0 after:bg-green-600 after:transition-transform after:duration-500 after:ease-[cubic-bezier(0.65_0.05_0.36_1)] hover:text-green-600 hover:after:origin-bottom-left hover:after:scale-x-100"
              >
                Back to Sign In
              </Link>
            </p>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default function RecoveryForm() {
  return (
    // Suspense provides a fallback interface until its children have finished loading
    <Suspense
      fallback={
        // Fallback interface to show while the component is suspended
        <div className="flex h-40 w-full items-center justify-center">
          <BeatLoader color="#16a34a" size={12} />
        </div>
      }
    >
      <RecoveryProcess />
    </Suspense>
  );
}

RecoveryForm.displayName = "RecoveryForm";
