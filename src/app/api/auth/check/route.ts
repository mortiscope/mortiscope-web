import { NextResponse } from "next/server";

import { hasValidAuthSession } from "@/lib/auth";

/**
 * Handles GET requests to validate the temporary authentication session.
 * @returns A `NextResponse` with a JSON payload.
 */
export async function GET() {
  try {
    // Call the server-side utility to check for the presence and validity of the temporary auth session.
    const hasAuthSession = await hasValidAuthSession();

    // Return the validation result to the client.
    return NextResponse.json({ isValid: hasAuthSession });
  } catch (error) {
    // In case of any unexpected errors, log the issue and return a safe invalid response.
    console.error("Auth session validation error:", error);
    return NextResponse.json({ isValid: false });
  }
}
