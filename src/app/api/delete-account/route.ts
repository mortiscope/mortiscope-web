import { NextRequest, NextResponse } from "next/server";

import { inngest } from "@/lib/inngest";

const appUrl = process.env.NEXT_PUBLIC_APP_URL;
if (!appUrl) {
  throw new Error("FATAL: NEXT_PUBLIC_APP_URL is not set in environment variables.");
}

const genericRedirectUrl = new URL("/", appUrl);

/**
 * Handles a GET request to confirm an account deletion via a unique token.
 * It triggers an Inngest event to handle the deletion process asynchronously
 * and then redirects the user to the homepage.
 *
 * @param request The incoming NextRequest containing the token in its search parameters.
 * @returns A NextResponse that redirects the user to a generic page.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  // Redirect immediately if the token is missing from the URL
  if (!token) {
    return NextResponse.redirect(genericRedirectUrl);
  }

  try {
    // Trigger the Inngest function to handle account deletion confirmation
    await inngest.send({
      name: "account/deletion.confirmed",
      data: { token },
    });
  } catch (error) {
    // Log the error but still redirect to avoid leaking information
    if (error instanceof Error) {
      console.error(`Failed to trigger account deletion confirmation: ${error.message}`);
    } else {
      console.error("An unexpected error occurred while triggering account deletion:", error);
    }
  }

  // For security and user experience, redirect to a generic page to avoid leaking information
  return NextResponse.redirect(genericRedirectUrl);
}
