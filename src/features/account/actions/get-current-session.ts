"use server";

import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { userSessions } from "@/db/schema";
import {
  formatBrowser,
  formatDevice,
  formatLocation,
  formatOperatingSystem,
  isSessionActive,
} from "@/features/account/utils/format-session";
import { decrypt } from "@/lib/crypto";

/**
 * Defines the structured, formatted data shape for a user session
 * that is returned by the server actions in this file.
 */
export interface UserSessionInfo {
  id: string;
  browser: string;
  operatingSystem: string;
  device: string;
  location: string;
  ipAddress: string;
  dateAdded: Date;
  lastActive: Date;
  isCurrentSession: boolean;
  isActiveNow: boolean;
  sessionToken: string;
}

/**
 * A server action to fetch the single most recently active session for a given user ID.
 *
 * @param userId The unique ID of the user.
 * @returns A promise that resolves to a `UserSessionInfo` object, or `null` if no session is found or an error occurs.
 */
export async function getCurrentSession(userId: string): Promise<UserSessionInfo | null> {
  try {
    // Fetch only the most recent session for the user.
    const session = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.userId, userId))
      .orderBy(desc(userSessions.lastActiveAt))
      .limit(1);

    if (session.length === 0) {
      return null;
    }

    const currentSession = session[0]!;

    // Format the single session record.
    return {
      id: currentSession.id,
      browser: formatBrowser(
        currentSession.browserName || "Unknown Browser",
        currentSession.browserVersion || ""
      ),
      operatingSystem: formatOperatingSystem(
        currentSession.osName || "Unknown OS",
        currentSession.osVersion || ""
      ),
      device: formatDevice(
        currentSession.deviceType,
        currentSession.deviceVendor,
        currentSession.deviceModel,
        currentSession.browserName || "Unknown Browser",
        currentSession.osName || "Unknown OS",
        currentSession.userAgent
      ),
      location: formatLocation(currentSession.city, currentSession.region, currentSession.country),
      ipAddress: decrypt(currentSession.ipAddress),
      dateAdded: currentSession.createdAt,
      lastActive: currentSession.lastActiveAt,
      isCurrentSession: currentSession.isCurrentSession,
      isActiveNow: isSessionActive(currentSession.lastActiveAt),
      sessionToken: currentSession.sessionToken,
    };
  } catch {
    // In case of an error, return null gracefully.
    return null;
  }
}
