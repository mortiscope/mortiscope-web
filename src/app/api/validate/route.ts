import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { isSessionRevoked } from "@/lib/redis-session";

/**
 * Handles POST requests to validate the current user's session.
 * @param req The incoming NextRequest.
 * @returns A `NextResponse` with a JSON payload.
 */
export async function POST(req: NextRequest) {
  try {
    // Decode and validate the JWT from the request's cookies.
    const token = await getToken({ req, secret: process.env.AUTH_SECRET });

    console.log(
      "[validate] cookies:",
      req.cookies.getAll().map((c) => c.name)
    );
    console.log("[validate] token present:", !!token, "sub:", token?.sub ?? "none");

    // If no valid token can be decoded, the session is definitively invalid.
    if (!token) {
      return NextResponse.json({ isValid: false });
    }

    // Extract the unique session identifier (JTI) from the JWT payload.
    const sessionToken = token.sessionId as string;

    // Handle an edge case where a token might exist but lacks a revocable session identifier.
    if (!sessionToken) {
      // If there is no session token in JWT, but token exists, consider it valid
      return NextResponse.json({ isValid: true });
    }

    // Check the Redis blacklist for the session token.
    const revokedStatus = await isSessionRevoked(sessionToken);

    if (revokedStatus === true) {
      // Case A: Redis confirms the session is in the blacklist. The session is invalid.
      return NextResponse.json({ isValid: false });
    } else if (revokedStatus === false) {
      // Case B: Redis confirms the session is NOT in the blacklist. The session is valid.
      return NextResponse.json({ isValid: true });
    }

    // Case C: `revokedStatus` is `null`, indicating the Redis check failed.
    console.warn("[Session Validation] Redis unavailable. Check Redis connectivity.");
    return NextResponse.json({ isValid: true });
  } catch (error) {
    // Handles unexpected errors during the `getToken` process or other parts of the try block.
    console.error("Session validation error:", error);
    // As a last-resort fallback, perform a simple check for the existence of the session cookie.
    const sessionCookie =
      req.cookies.get("authjs.session-token") || req.cookies.get("__Secure-authjs.session-token");
    return NextResponse.json({ isValid: !!sessionCookie });
  }
}
