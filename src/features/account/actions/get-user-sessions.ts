"use server";

import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { userSessions } from "@/db/schema";
import type { UserSessionInfo } from "@/features/account/actions/get-current-session";
import {
  formatBrowser,
  formatDevice,
  formatLocation,
  formatOperatingSystem,
  isSessionActive,
} from "@/features/account/utils/format-session";
import { decrypt } from "@/lib/crypto";

/**
 * A server action to fetch all active sessions for a given user ID.
 * It retrieves the raw session data and formats it into a user-friendly structure.
 *
 * @param userId The unique ID of the user whose sessions are to be retrieved.
 * @returns A promise that resolves to an array of `UserSessionInfo` objects.
 * @throws An error if the database query fails.
 */
export async function getUserSessions(userId: string): Promise<UserSessionInfo[]> {
  try {
    // Fetch all session records for the user, ordered by most recently active.
    const sessions = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.userId, userId))
      .orderBy(desc(userSessions.lastActiveAt));

    // Map the raw database records to the formatted `UserSessionInfo` shape.
    const formattedSessions = sessions.map((session) => {
      const browser = formatBrowser(
        session.browserName || "Unknown Browser",
        session.browserVersion || ""
      );
      const operatingSystem = formatOperatingSystem(
        session.osName || "Unknown OS",
        session.osVersion || ""
      );
      const device = formatDevice(
        session.deviceType,
        session.deviceVendor,
        session.deviceModel,
        session.browserName || "Unknown Browser",
        session.osName || "Unknown OS",
        session.userAgent
      );
      const location = formatLocation(session.city, session.region, session.country);
      const isActiveNow = isSessionActive(session.lastActiveAt);

      return {
        id: session.id,
        browser,
        operatingSystem,
        device,
        location,
        ipAddress: decrypt(session.ipAddress),
        dateAdded: session.createdAt,
        lastActive: session.lastActiveAt,
        isCurrentSession: session.isCurrentSession,
        isActiveNow,
        sessionToken: session.sessionToken,
      };
    });

    return formattedSessions;
  } catch (error) {
    // Catch and log any unexpected errors during the process, then re-throw.
    console.error("Error occurred:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      userId,
    });
    throw new Error("Failed to retrieve user sessions.");
  }
}
