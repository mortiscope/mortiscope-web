import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { getAccountDeletionTokenByToken } from "@/data/account-deletion-token";
import { getUserByEmail } from "@/data/user";
import { db } from "@/db";
import { accountDeletionTokens, users } from "@/db/schema";
import { DELETION_GRACE_PERIOD_DAYS } from "@/lib/config";
import { sendAccountDeletionScheduled } from "@/lib/mail";

const appUrl = process.env.NEXT_PUBLIC_APP_URL;
if (!appUrl) {
  throw new Error("FATAL: NEXT_PUBLIC_APP_URL is not set in environment variables.");
}

const genericRedirectUrl = new URL("/", appUrl);

/**
 * Handles a GET request to confirm an account deletion via a unique token.
 * It validates the token, schedules the user for deletion by setting a grace period,
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
    // Validate the provided token
    const deletionToken = await getAccountDeletionTokenByToken(token);
    if (!deletionToken) {
      throw new Error("Token not found");
    }

    // Check for token expiration
    const hasExpired = new Date(deletionToken.expires) < new Date();
    if (hasExpired) {
      throw new Error("Token has expired");
    }

    // Invalidate the token immediately to prevent reuse
    await db
      .delete(accountDeletionTokens)
      .where(eq(accountDeletionTokens.token, deletionToken.token));

    // Find the user associated with the token
    const existingUser = await getUserByEmail(deletionToken.identifier);

    // Gracefully handle cases where the user is gone or deletion is already pending
    if (!existingUser || existingUser.deletionScheduledAt) {
      // If user doesn't exist or deletion is already scheduled, we don't need to do anything further.
    } else {
      // Calculate the final deletion date based on the grace period
      const deletionDate = new Date();
      deletionDate.setDate(deletionDate.getDate() + DELETION_GRACE_PERIOD_DAYS);

      // Schedule the user for deletion by setting the `deletionScheduledAt` timestamp
      await db
        .update(users)
        .set({ deletionScheduledAt: deletionDate })
        .where(eq(users.id, existingUser.id));

      // After the operations are successful, send a notification email
      try {
        await sendAccountDeletionScheduled(existingUser.email, DELETION_GRACE_PERIOD_DAYS);
      } catch (emailError) {
        console.error(
          `CRITICAL LOG: Account deletion for ${existingUser.email} was scheduled, but the notification email failed to send.`,
          emailError
        );
      }
    }
  } catch (error) {
    // Catch any errors from the database operations and log them.
    if (error instanceof Error) {
      console.error(`Account deletion confirmation failed: ${error.message}`);
    } else {
      console.error("An unexpected error occurred during account deletion confirmation:", error);
    }
  }

  // For security and user experience, redirect to a generic page to avoid leaking information
  return NextResponse.redirect(genericRedirectUrl);
}
