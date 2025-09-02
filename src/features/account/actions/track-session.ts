"use server";

import { createId } from "@paralleldrive/cuid2";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { userSessions } from "@/db/schema";
import { parseSessionInfo } from "@/features/account/utils/parse-session";
import { encrypt } from "@/lib/crypto";
import { inngest } from "@/lib/inngest";

/**
 * Defines the shape of the incoming data for session tracking.
 */
interface SessionData {
  userId: string;
  sessionToken: string;
  userAgent: string;
  ipAddress: string;
}

/**
 * A server action to track and record a user's session. This is the core logic for session management.
 * @param data The incoming session data.
 * @returns A promise resolving to an object indicating success and the session ID.
 */
export async function trackSession(data: SessionData) {
  try {
    // Parse the user agent and IP to get detailed device and location info.
    const sessionInfo = await parseSessionInfo(data.userAgent, data.ipAddress);

    // Encrypt the IP address for secure storage while allowing decryption for display.
    const encryptedIpAddress = encrypt(data.ipAddress);

    // Dynamically import the `sessions` schema to avoid circular dependency issues.
    const { sessions } = await import("@/db/schema");

    // Ensure a record exists in the core `sessions` table for NextAuth.js.
    const existingSessionRecord = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionToken, data.sessionToken))
      .limit(1);

    if (existingSessionRecord.length === 0) {
      // If the core session is missing, re-create it.
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await db.insert(sessions).values({
        sessionToken: data.sessionToken,
        userId: data.userId,
        expires: expiresAt,
      });
    }

    // Attempt to find an existing session based on device fingerprint.
    const existingDeviceSession = await db
      .select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.userId, data.userId),
          eq(userSessions.browserName, sessionInfo.browserName),
          eq(userSessions.osName, sessionInfo.osName)
        )
      )
      .orderBy(desc(userSessions.lastActiveAt))
      .limit(1);

    // Also, check if a session with the exact same session token already exists.
    const existingSession = await db
      .select()
      .from(userSessions)
      .where(
        and(eq(userSessions.sessionToken, data.sessionToken), eq(userSessions.userId, data.userId))
      )
      .limit(1);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (existingSession.length > 0) {
      // Case A: A record for this exact session token already exists. Update its `lastActiveAt` and other details.
      const existingSessionData = existingSession[0]!;
      await db
        .update(userSessions)
        .set({
          lastActiveAt: now,
          userAgent: data.userAgent,
          ipAddress: encryptedIpAddress,
          country: sessionInfo.country,
          region: sessionInfo.region,
          city: sessionInfo.city,
          timezone: sessionInfo.timezone,
          browserVersion: sessionInfo.browserVersion,
        })
        .where(eq(userSessions.id, existingSessionData.id));
    } else if (existingDeviceSession.length > 0) {
      // Case B: No exact match for the token, but a session from the same device exists.
      const deviceSessionData = existingDeviceSession[0]!;
      await db
        .update(userSessions)
        .set({
          sessionToken: data.sessionToken,
          lastActiveAt: now,
          userAgent: data.userAgent,
          ipAddress: encryptedIpAddress,
          country: sessionInfo.country,
          region: sessionInfo.region,
          city: sessionInfo.city,
          timezone: sessionInfo.timezone,
          browserVersion: sessionInfo.browserVersion,
          expiresAt,
        })
        .where(eq(userSessions.id, deviceSessionData.id));
      return { success: true, sessionId: deviceSessionData.id };
    } else {
      // Case C: This is a completely new session from a new device/fingerprint. Create a new record.
      const sessionId = createId();
      const sessionRecord = {
        id: sessionId,
        userId: data.userId,
        sessionToken: data.sessionToken,
        deviceType: sessionInfo.deviceType,
        deviceVendor: sessionInfo.deviceVendor,
        deviceModel: sessionInfo.deviceModel,
        browserName: sessionInfo.browserName,
        browserVersion: sessionInfo.browserVersion,
        osName: sessionInfo.osName,
        osVersion: sessionInfo.osVersion,
        ipAddress: encryptedIpAddress,
        country: sessionInfo.country,
        region: sessionInfo.region,
        city: sessionInfo.city,
        timezone: sessionInfo.timezone,
        userAgent: data.userAgent,
        isCurrentSession: false,
        createdAt: now,
        lastActiveAt: now,
        expiresAt,
      };
      await db.insert(userSessions).values(sessionRecord);

      // In production, schedule a delayed Inngest job to check for inactivity.
      if (process.env.NODE_ENV === "development") {
      } else {
        try {
          const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          // Schedules an event to be processed 24 hours from now.
          await inngest.send({
            name: "account/session.check-inactivity",
            data: {
              sessionToken: data.sessionToken,
              userId: data.userId,
              lastActiveAt: now.toISOString(),
            },
            ts: oneDayFromNow.getTime(),
          });
        } catch (error) {
          // Log a warning if scheduling fails, but don't fail the entire session tracking operation.
          console.warn(
            "Failed to schedule session inactivity check:",
            error instanceof Error ? error.message : "Unknown error"
          );
        }
      }

      return { success: true, sessionId };
    }
  } catch (error) {
    // Catch and log any unexpected errors during the entire process.
    console.error("Error occurred:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      userId: data.userId,
      sessionToken: data.sessionToken.slice(0, 8) + "...",
    });
    return { success: false, error: "Failed to track session" };
  }
}
