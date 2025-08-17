"use server";

import { createId } from "@paralleldrive/cuid2";
import { and, desc, eq } from "drizzle-orm";
import { UAParser } from "ua-parser-js";

import { db } from "@/db";
import { userSessions } from "@/db/schema";
import { inngest } from "@/lib/inngest";

/**
 * Defines the shape of the result from the `geoip-lite` lookup.
 */
type GeoIPResult = {
  country: string;
  region: string;
  city: string;
  timezone: string;
  ll?: [number, number];
  metro?: number;
  area?: number;
} | null;

/** A promise-based singleton to lazily load the `geoip-lite` module. */
let geoipPromise: Promise<{ lookup(ip: string): GeoIPResult }> | null = null;

/**
 * Asynchronously loads and returns the `geoip-lite` module.
 * This function ensures the module is only imported once, improving performance.
 * It includes a fallback in case the module fails to load.
 */
async function getGeoIP() {
  if (!geoipPromise) {
    geoipPromise = (async () => {
      try {
        // Dynamically import the module.
        const geoipModule = await import("geoip-lite");
        return geoipModule;
      } catch {
        // If the import fails, return a mock object to prevent crashes.
        return {
          lookup: (): GeoIPResult => null,
        };
      }
    })();
  }
  return geoipPromise;
}

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
 * Defines the shape of the parsed session information.
 */
interface ParsedSessionInfo {
  browserName: string;
  browserVersion: string;
  osName: string;
  osVersion: string;
  deviceType: string | null;
  deviceVendor: string | null;
  deviceModel: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
}

/**
 * Normalizes an IP address by removing common prefixes for IPv4-mapped IPv6 addresses.
 * It intentionally does not alter local/private IP addresses.
 * @param ipAddress The raw IP address.
 * @returns A normalized IP address string.
 */
function normalizeIpAddress(ipAddress: string): string {
  // Handle IPv4-mapped IPv6 addresses.
  if (ipAddress.startsWith("::ffff:")) {
    return ipAddress.replace("::ffff:", "");
  }

  // Do not normalize local or private IP ranges.
  if (
    ipAddress === "127.0.0.1" ||
    ipAddress === "::1" ||
    ipAddress.startsWith("192.168.") ||
    ipAddress.startsWith("10.") ||
    ipAddress.startsWith("172.")
  ) {
    return ipAddress;
  }

  return ipAddress;
}

/**
 * Parses a user agent string and IP address to extract detailed session information,
 * including device, browser, OS, and geographical location.
 * @param userAgent The full user agent string from the request.
 * @param ipAddress The user's IP address.
 * @returns A promise resolving to a `ParsedSessionInfo` object.
 */
async function parseSessionInfo(userAgent: string, ipAddress: string): Promise<ParsedSessionInfo> {
  try {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    const normalizedIp = normalizeIpAddress(ipAddress);

    const geoip = await getGeoIP();
    const geo = geoip.lookup(normalizedIp);

    const sessionInfo = {
      browserName: result.browser.name || "Unknown Browser",
      browserVersion: result.browser.version || "",
      osName: result.os.name || "Unknown OS",
      osVersion: result.os.version || "",
      deviceType: result.device.type || null,
      deviceVendor: result.device.vendor || null,
      deviceModel: result.device.model || null,
      country: geo?.country || null,
      region: geo?.region || null,
      city: geo?.city || null,
      timezone: geo?.timezone || null,
    };

    return sessionInfo;
  } catch {
    // Return a default object on any parsing failure to ensure graceful degradation.
    return {
      browserName: "Unknown Browser",
      browserVersion: "",
      osName: "Unknown OS",
      osVersion: "",
      deviceType: null,
      deviceVendor: null,
      deviceModel: null,
      country: null,
      region: null,
      city: null,
      timezone: null,
    };
  }
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
          eq(userSessions.osName, sessionInfo.osName),
          eq(userSessions.ipAddress, data.ipAddress)
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
          ipAddress: data.ipAddress,
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
          ipAddress: data.ipAddress,
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
        ipAddress: data.ipAddress,
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

/**
 * A lightweight server action to update the `lastActiveAt` timestamp for a given session token.
 * This is used to keep a session alive during user activity.
 * @param sessionToken The session token to update.
 * @returns A promise resolving to an object indicating success.
 */
export async function updateSessionActivity(sessionToken: string) {
  try {
    await db
      .update(userSessions)
      .set({
        lastActiveAt: new Date(),
      })
      .where(eq(userSessions.sessionToken, sessionToken));
    return { success: true };
  } catch {
    return { success: false };
  }
}

/**
 * A server action to mark a specific session as the current one for a user.
 * It first resets the flag on all of the user's other sessions.
 * @param sessionToken The token of the session to mark as current.
 * @param userId The ID of the user who owns the session.
 * @returns A promise resolving to an object indicating success.
 */
export async function markCurrentSession(sessionToken: string, userId: string) {
  try {
    // Reset the `isCurrentSession` flag for all of the user's sessions.
    await db
      .update(userSessions)
      .set({ isCurrentSession: false })
      .where(eq(userSessions.userId, userId));

    // Set the `isCurrentSession` flag to true for only the specified session.
    await db
      .update(userSessions)
      .set({ isCurrentSession: true })
      .where(and(eq(userSessions.sessionToken, sessionToken), eq(userSessions.userId, userId)));

    return { success: true };
  } catch (error) {
    console.error("Error occurred:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      userId,
      sessionToken: sessionToken.slice(0, 8) + "...",
    });
    return { success: false };
  }
}
