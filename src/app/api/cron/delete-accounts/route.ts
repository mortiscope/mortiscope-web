import { and, isNotNull, lte } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { sendGoodbyeEmail } from "@/lib/mail";

// Securing endpoint with a secret key from the environment variables
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Handles a POST request to execute the scheduled account deletion task.
 * This endpoint is protected by a secret key and is intended to be called by a cron job.
 * It deletes users whose grace period has expired and sends a final notification email.
 *
 * @param request The incoming NextRequest, expected to contain an authorization header.
 * @returns A NextResponse with a detailed summary of the deletion operation.
 */
export async function POST(request: NextRequest) {
  // Secure the endpoint by verifying the CRON_SECRET from the authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    if (!authHeader) {
      return NextResponse.json(
        { error: "Forbidden: Missing authorization header." },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: "Unauthorized: Invalid secret key." }, { status: 401 });
  }

  try {
    // Atomically delete all user accounts whose grace period has expired
    const deletedUsers = await db
      .delete(users)
      .where(and(isNotNull(users.deletionScheduledAt), lte(users.deletionScheduledAt, new Date())))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
      });

    // Handle the common case where no accounts are due for deletion
    if (deletedUsers.length === 0) {
      console.log("CRON JOB: No accounts due for permanent deletion at this time.");
      return NextResponse.json({ message: "No accounts to delete." });
    }

    console.log(
      `CRON JOB: Successfully and permanently deleted ${deletedUsers.length} accounts from the database.`
    );

    // Concurrently send a "goodbye" email to each deleted user
    const failedNotifications: { email: string; reason: Error }[] = [];
    const emailPromises = deletedUsers.map((user) => sendGoodbyeEmail(user.email, user.name));
    const emailResults = await Promise.allSettled(emailPromises);

    emailResults.forEach((result, index) => {
      if (result.status === "rejected") {
        const user = deletedUsers[index];
        console.error(
          `CRON JOB: Account for ${user.email} was deleted, but the subsequent goodbye email failed to send. Reason: ${result.reason.message}`
        );
        failedNotifications.push({ email: user.email, reason: result.reason });
      }
    });

    if (failedNotifications.length > 0) {
      console.log(
        `CRON JOB: ${failedNotifications.length} of ${deletedUsers.length} goodbye emails failed to send.`
      );
    } else {
      console.log(`CRON JOB: All ${deletedUsers.length} goodbye emails sent successfully.`);
    }

    // Construct a detailed response for logging and monitoring purposes.
    return NextResponse.json({
      message: "Cron job for account deletion completed successfully.",
      successfully_deleted: deletedUsers.length,
      notifications_failed: failedNotifications.length,
      failed_notification_recipients: failedNotifications.map((f) => f.email),
    });
  } catch (error) {
    // Handle critical errors that may occur during the database operation.
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    console.error(
      "CRON JOB FAILED: A critical error occurred during the account deletion process.",
      errorMessage,
      error
    );
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
