"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import React, { Suspense, useState } from "react";
import { BeatLoader } from "react-spinners";

import { FormFeedback } from "@/components/form-feedback";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { clearTwoFactorSession, verifySigninTwoFactor } from "@/features/auth/actions/two-factor";
import { AuthFormHeader } from "@/features/auth/components/auth-form-header";
import { AuthSubmitButton } from "@/features/auth/components/auth-submit-button";
import { cn } from "@/lib/utils";

function TwoFactorProcess() {
  // Hook to access URL search parameters and router
  const searchParams = useSearchParams();
  const router = useRouter();
  // Get any error or session info from the URL
  const error = searchParams.get("error");

  // State for OTP input
  const [otpValue, setOtpValue] = useState("");

  // State to track if the user is in the process of redirecting
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Two-factor verification mutation
  const {
    mutate: verifyTwoFactor,
    isPending,
    data,
  } = useMutation({
    mutationFn: verifySigninTwoFactor,
    onSuccess: async (result) => {
      if (result.success && result.verified) {
        // Set redirecting state to keep button disabled
        setIsRedirecting(true);
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
            setIsRedirecting(false);
          }
        } catch (error) {
          console.error("Client-side signin failed:", error);
          setIsRedirecting(false);
        }
      }
    },
  });

  // Handle OTP value change with number-only filtering
  const handleOtpChange = (value: string) => {
    // Only allow numeric characters
    const numericValue = value.replace(/[^0-9]/g, "");
    setOtpValue(numericValue);
  };

  // Handle form submission
  const handleSubmit = () => {
    if (otpValue.length === 6) {
      verifyTwoFactor(otpValue);
    }
  };

  // Check if verify button should be enabled
  const isVerifyEnabled = otpValue.length === 6 && !isPending && !isRedirecting;

  // Show error message if user accessed this page without proper session
  if (error === "no-session") {
    return (
      <div className="flex w-full flex-col items-center space-y-4 px-4 py-6 md:space-y-5 md:px-0 md:py-0">
        <AuthFormHeader
          title="Two-Factor Authentication"
          description="This page is used to verify your identity with two-factor authentication."
        />
        {/* Container for feedback and action button */}
        <div className="font-inter w-full max-w-md space-y-3 text-center md:space-y-4">
          <div className="flex min-h-[36px] w-full items-center justify-center rounded-lg md:min-h-[40px]">
            <FormFeedback
              message="This page is used to verify your identity with two-factor authentication."
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
    // Main container for the two-factor verification page content
    <div className="flex w-full flex-col items-center space-y-4 px-4 py-6 md:space-y-5 md:px-0 md:py-0">
      <AuthFormHeader
        title="Two-Factor Authentication"
        description="Enter the 6-digit code from your authenticator app to complete sign-in."
      />

      {/* Two-Factor Form */}
      <div className="font-inter w-full max-w-md space-y-4">
        {/* OTP Input */}
        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={otpValue}
            onChange={handleOtpChange}
            containerClassName="gap-2 has-disabled:opacity-50"
            className="font-mono disabled:cursor-not-allowed"
            disabled={isPending || isRedirecting}
          >
            <InputOTPGroup className="gap-2">
              {Array.from({ length: 6 }).map((_, index) => {
                const hasValue = otpValue[index];
                return (
                  <InputOTPSlot
                    key={index}
                    index={index}
                    className={cn(
                      "relative flex h-10 w-10 items-center justify-center rounded-md border-2 font-mono text-sm font-normal shadow-none transition-all duration-600 ease-in-out focus-visible:ring-0 focus-visible:ring-offset-0 data-[active=true]:z-10 data-[active=true]:ring-0 sm:h-12 sm:w-12 sm:text-base",
                      hasValue
                        ? "border-green-600 bg-green-600 text-white"
                        : "border-slate-200 bg-transparent text-slate-800",
                      "focus-visible:border-green-600 data-[active=true]:border-green-600"
                    )}
                  />
                );
              })}
            </InputOTPGroup>
          </InputOTP>
        </div>

        {/* Error/Success Messages */}
        {data && (
          <div className="flex min-h-[36px] w-full items-center justify-center rounded-lg md:min-h-[40px]">
            <FormFeedback
              message={data.success ? "Verification successful!" : "Invalid verification code."}
              type={data.success ? "success" : "error"}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Verify Button */}
          <AuthSubmitButton
            type="button"
            onClick={handleSubmit}
            isDisabled={!isVerifyEnabled}
            isPending={isPending || isRedirecting}
            pendingText={isRedirecting ? "Redirecting..." : "Verifying..."}
          >
            Verify Code
          </AuthSubmitButton>

          {/* Alternative Options */}
          <p className="font-inter text-center text-xs text-slate-600 md:text-sm">
            Forget or missing authentication device?{" "}
            <Link
              href="/signin/recovery"
              className="relative font-medium text-green-700 after:absolute after:-bottom-1 after:left-0 after:h-[1.5px] after:w-full after:origin-bottom-right after:scale-x-0 after:bg-green-600 after:transition-transform after:duration-500 after:ease-[cubic-bezier(0.65_0.05_0.36_1)] hover:text-green-600 hover:after:origin-bottom-left hover:after:scale-x-100"
            >
              Use Recovery Code
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TwoFactorForm() {
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
      <TwoFactorProcess />
    </Suspense>
  );
}

TwoFactorForm.displayName = "TwoFactorForm";
