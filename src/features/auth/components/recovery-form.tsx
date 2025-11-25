"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { Suspense } from "react";
import { useForm } from "react-hook-form";
import { BeatLoader } from "react-spinners";

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
import { verifySigninRecoveryCode } from "@/features/auth/actions/recovery";
import { completeTwoFactorSignIn } from "@/features/auth/actions/two-factor";
import { AuthFormHeader } from "@/features/auth/components/auth-form-header";
import { AuthSubmitButton } from "@/features/auth/components/auth-submit-button";
import {
  type SigninRecoveryCodeFormValues,
  SigninRecoveryCodeSchema,
} from "@/features/auth/schemas/auth";

function RecoveryProcess() {
  // Hook to access URL search parameters
  const searchParams = useSearchParams();
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

  // State to track if the user is in the process of redirecting
  const [isRedirecting, setIsRedirecting] = React.useState(false);

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
        // Set redirecting state to keep button disabled
        setIsRedirecting(true);
        // Complete the signin process on the server side.
        try {
          const signinResult = await completeTwoFactorSignIn();
          if (signinResult?.error) {
            console.error("Server-side signin failed:", signinResult.error);
            setIsRedirecting(false);
          }
        } catch (error) {
          // Any other error is a genuine failure.
          console.error("Server-side signin failed:", error);
          setIsRedirecting(false);
        }
      }
    },
  });

  // Function to handle form submission
  const onSubmit = (values: SigninRecoveryCodeFormValues) => {
    verifyRecoveryCode(values);
  };

  // Determine if the submit button should be disabled
  const isSubmitDisabled = !form.formState.isValid || isPending || isRedirecting;

  // Show error message if user accessed this page without proper session
  if (error === "no-session") {
    return (
      <div className="flex w-full flex-col items-center space-y-4 px-4 py-6 md:space-y-5 md:px-0 md:py-0">
        <AuthFormHeader
          title="Account Recovery"
          description="This page is used to recover your account using a recovery code."
        />
        {/* Container for feedback and action button */}
        <div className="font-inter w-full max-w-md space-y-3 text-center md:space-y-4">
          <div className="flex min-h-[36px] w-full items-center justify-center rounded-lg md:min-h-[40px]">
            <FormFeedback
              message="This page is used to recover your account using a recovery code."
              type="error"
            />
          </div>
          <AuthSubmitButton asChild>
            <Link href="/signin">Back to Sign In</Link>
          </AuthSubmitButton>
        </div>
      </div>
    );
  }

  return (
    // Main container for the recovery code verification page content
    <div className="flex w-full flex-col items-center space-y-4 px-4 py-6 md:space-y-5 md:px-0 md:py-0">
      <AuthFormHeader
        title="Account Recovery"
        description="Enter one of your recovery codes to complete sign-in."
      />

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
                    disabled={isPending || isRedirecting}
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
            <AuthSubmitButton
              isDisabled={isSubmitDisabled}
              isPending={isPending || isRedirecting}
              pendingText={isRedirecting ? "Redirecting..." : "Verifying..."}
            >
              Verify Code
            </AuthSubmitButton>

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
