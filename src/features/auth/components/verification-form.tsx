"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { Suspense } from "react";
import { BeatLoader } from "react-spinners";

import { FormFeedback } from "@/components/form-feedback";
import { verification } from "@/features/auth/actions/verification";
import { AuthFormHeader } from "@/features/auth/components/auth-form-header";
import { AuthSubmitButton } from "@/features/auth/components/auth-submit-button";

function VerificationProcess() {
  // Hook to access URL search parameters
  const searchParams = useSearchParams();
  // Get the verification token and type from the URL
  const token = searchParams.get("token");
  const type = searchParams.get("type");

  // Determine if the verification is for an email change
  const isEmailChange = type === "email-change";

  // Manages the server state for the verification action using TanStack Query
  const { data, isLoading, isSuccess } = useQuery({
    // A unique key for this query, which includes the token and type
    queryKey: ["verification", token, type],
    // The function that fetches the data. It calls the server action
    queryFn: () => verification(token, type),
    // Ensures the query only runs if a token is present in the URL
    enabled: !!token,
    // Disables automatic retries on failure, as verification is a one-time action
    retry: false,
    // Prevents re-fetching when the window is refocused
    refetchOnWindowFocus: false,
  });

  return (
    // Main container for the verification page content
    <div className="flex w-full flex-col items-center space-y-4 px-4 py-6 md:space-y-5 md:px-0 md:py-0">
      <AuthFormHeader
        title={isEmailChange ? "Confirming New Email" : "Email Verification"}
        description={
          isEmailChange
            ? "We are now finalizing the update to your new email address."
            : "This page processes email verification links to confirm your account."
        }
      />
      {/* Container for feedback and action button */}
      <div className="font-inter w-full max-w-md space-y-3 text-center md:space-y-4">
        {/* Displays a loading spinner or a feedback message */}
        <div className="flex min-h-[36px] w-full items-center justify-center rounded-lg md:min-h-[40px]">
          {isLoading && <BeatLoader color="#16a34a" size={12} />}

          {!isLoading && !isSuccess && (
            <FormFeedback message="This page is used to verify an email address." type="error" />
          )}

          {isSuccess && data && (
            <FormFeedback
              message={data.message}
              type={data.status === "success" ? "success" : "error"}
            />
          )}
        </div>
        {/* Button to navigate user after verification */}
        <AuthSubmitButton asChild>
          <Link href={data?.status === "success" ? "/signin" : "/"}>
            {data?.status === "success" ? "Proceed to Sign In" : "Back to Homepage"}
          </Link>
        </AuthSubmitButton>
      </div>
    </div>
  );
}

export default function VerificationForm() {
  return (
    // Suspense provides a fallback UI until its children have finished loading
    <Suspense
      fallback={
        // Fallback UI to show while the component is suspended
        <div className="flex h-40 w-full items-center justify-center">
          <BeatLoader color="#16a34a" size={12} />
        </div>
      }
    >
      <VerificationProcess />
    </Suspense>
  );
}

VerificationForm.displayName = "VerificationForm";
