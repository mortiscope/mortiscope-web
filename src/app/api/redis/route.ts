import { NextResponse } from "next/server";

import { getRevokedSessionCount, isRedisHealthy } from "@/lib/redis-session";

/**
 * Handles GET requests to the application's health check endpoint.
 * @returns A `NextResponse` with a JSON payload containing the health status.
 */
export async function GET() {
  try {
    // Asynchronously check Redis health and get the revoked session count.
    const healthy = await isRedisHealthy();
    const revokedCount = await getRevokedSessionCount();

    // On success, return a 200 OK response with a detailed status payload.
    return NextResponse.json({
      status: healthy ? "healthy" : "unhealthy",
      redis: {
        connected: healthy,
        revokedSessionCount: revokedCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // If any part of the health check fails, return a 500 Internal Server Error.
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
