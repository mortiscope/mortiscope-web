"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { Suspense } from "react";
import { BeatLoader } from "react-spinners";

import { FormFeedback } from "@/components/form-feedback";
import { Button } from "@/components/ui/button";
import { verification } from "@/features/auth/actions/verification";

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
          {isEmailChange ? "Confirming New Email" : "Email Verification"}
        </h1>
        <p className="font-inter mt-1 text-sm text-slate-600 md:mt-2">
          {isEmailChange
            ? "We are now finalizing the update to your new email address."
            : "This page processes email verification links to confirm your account."}
        </p>
      </div>
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
        <Button
          asChild
          className="font-inter relative h-9 w-full cursor-pointer overflow-hidden rounded-lg border-none bg-green-600 text-sm font-normal text-white uppercase transition-all duration-300 ease-in-out before:absolute before:top-0 before:-left-full before:z-[-1] before:h-full before:w-full before:rounded-lg before:bg-gradient-to-r before:from-yellow-400 before:to-yellow-500 before:transition-all before:duration-600 before:ease-in-out hover:scale-100 hover:border-transparent hover:bg-emerald-600 hover:text-white hover:shadow-lg hover:shadow-yellow-500/20 hover:before:left-0 md:h-10 md:text-base"
        >
          <Link href={data?.status === "success" ? "/signin" : "/"}>
            {data?.status === "success" ? "Proceed to Sign In" : "Back to Homepage"}
          </Link>
        </Button>
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
