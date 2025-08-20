import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { sessions, userSessions } from "@/db/schema";

/**
 * Session validation and activity update API endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionToken, updateActivity = false } = await request.json();

    if (!sessionToken || typeof sessionToken !== "string") {
      return NextResponse.json({ valid: false, error: "Invalid session token" }, { status: 400 });
    }

    // Check if session exists in database
    const sessionExists = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionToken, sessionToken))
      .limit(1);

    const isValid = sessionExists.length > 0;

    // Update session activity if requested and session is valid
    if (isValid && updateActivity) {
      try {
        await db
          .update(userSessions)
          .set({
            lastActiveAt: new Date(),
          })
          .where(eq(userSessions.sessionToken, sessionToken));
      } catch {
        // Session activity update failed, but don't fail the validation
      }
    }

    return NextResponse.json({
      valid: isValid,
      updated: isValid && updateActivity,
    });
  } catch {
    // Return invalid for any errors to maintain security
    return NextResponse.json({ valid: false, error: "Validation failed" }, { status: 500 });
  }
}
