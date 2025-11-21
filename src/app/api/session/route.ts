import { Redis } from "@upstash/redis";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { db } from "@/db";
import { userSessions } from "@/db/schema";
import { env } from "@/lib/env";

/**
 * A private, module-level variable to cache the singleton Redis client instance.
 */
let _redis: Redis | undefined;

/**
 * A lazy initializer function for the Redis client.
 * @returns The singleton `Redis` client instance.
 */
function getRedis(): Redis {
  return (_redis ??= new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  }));
}

// Throttle activity updates to once every 5 minutes
const ACTIVITY_UPDATE_THROTTLE_MS = 5 * 60 * 1000;

/**
 * Session activity update API endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    let sessionToken = body.sessionToken;

    // If no sessionToken provided, extract it from cookies
    if (!sessionToken) {
      const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
      sessionToken = token?.sessionId as string;
    }

    if (!sessionToken || typeof sessionToken !== "string") {
      return NextResponse.json({ error: "Invalid session token" }, { status: 400 });
    }

    let activityUpdated = false;

    try {
      // Check Redis to see if it recently updated this session
      const throttleKey = `session:activity:${sessionToken}`;
      const redis = getRedis();
      const lastUpdate = await redis.get<number>(throttleKey);
      const now = Date.now();

      // Only update if it haven't updated in the last 5 minutes
      if (!lastUpdate || now - lastUpdate > ACTIVITY_UPDATE_THROTTLE_MS) {
        await db
          .update(userSessions)
          .set({
            lastActiveAt: new Date(),
          })
          .where(eq(userSessions.sessionToken, sessionToken));

        // Set the throttle key with expiration
        await redis.set(throttleKey, now, { ex: Math.floor(ACTIVITY_UPDATE_THROTTLE_MS / 1000) });
        activityUpdated = true;
      }
    } catch (error) {
      console.error("Session activity update failed:", error);
    }

    return NextResponse.json({
      updated: activityUpdated,
    });
  } catch (error) {
    console.error("Session API error:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
