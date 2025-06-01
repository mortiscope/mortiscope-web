"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { Suspense, useCallback, useEffect, useState, useTransition } from "react";
import { BeatLoader } from "react-spinners";

import { FormFeedback } from "@/components/form-feedback";
import { Button } from "@/components/ui/button";
import { verification } from "@/features/auth/actions/verification";

// Define the possible states for the UI display
type DisplayStatus = "loading" | "success" | "error" | "info";

function VerificationProcess() {
  // Hook to access URL search parameters
  const searchParams = useSearchParams();
  // Get the verification token and type from the URL
  const token = searchParams.get("token");
  const type = searchParams.get("type");

  // Determine if the verification is for an email change
  const isEmailChange = type === "email-change";

  // State to manage the current UI status (loading, success, error, or info)
  const [displayStatus, setDisplayStatus] = useState<DisplayStatus>("loading");
  // State to store the feedback message to be displayed to the user
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");
  // Hook to manage the pending state of the server action
  const [isVerifying, startVerificationTransition] = useTransition();

  // Memoized function to handle the call to the verification server action
  const handleVerification = useCallback((currentToken: string, currentType: string | null) => {
    // Wrap the async operation in a transition to avoid UI blocking
    startVerificationTransition(async () => {
      try {
        // Call the server action with the token and type
        const data = await verification(currentToken, currentType);
        // Update state based on the response from the server action
        setDisplayStatus(data.status);
        setFeedbackMessage(data.message);
      } catch (error) {
        // Handle any unexpected errors during the verification process
        console.error("Verification failed:", error);
        setDisplayStatus("error");
        setFeedbackMessage("An unexpected error occurred during verification.");
      }
    });
  }, []);

  // Effect hook to trigger the verification process on component mount
  useEffect(() => {
    // If a token is present in the URL, attempt verification
    if (token) {
      handleVerification(token, type);
    } else {
      // If no token is found, display an informational message
      setDisplayStatus("info");
      setFeedbackMessage("This page is used to verify email address after signing up.");
    }
    // Dependencies array ensures this effect runs only when these values change
  }, [token, type, handleVerification]);

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
          {isVerifying || displayStatus === "loading" ? (
            <BeatLoader color="#16a34a" size={12} />
          ) : (
            feedbackMessage && (
              <FormFeedback
                message={feedbackMessage}
                type={displayStatus === "success" ? "success" : "error"}
              />
            )
          )}
        </div>
        {/* Button to navigate user after verification */}
        <Button
          asChild
          className="font-inter relative h-9 w-full cursor-pointer overflow-hidden rounded-lg border-none bg-green-600 text-sm font-normal text-white uppercase transition-all duration-300 ease-in-out before:absolute before:top-0 before:-left-full before:z-[-1] before:h-full before:w-full before:rounded-lg before:bg-gradient-to-r before:from-yellow-400 before:to-yellow-500 before:transition-all before:duration-600 before:ease-in-out hover:scale-100 hover:border-transparent hover:bg-emerald-600 hover:text-white hover:shadow-lg hover:shadow-yellow-500/20 hover:before:left-0 md:h-10 md:text-base"
        >
          <Link href={displayStatus === "success" ? "/signin" : "/"}>
            {displayStatus === "success" ? "Proceed to Sign In" : "Back to Homepage"}
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
