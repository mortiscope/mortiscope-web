import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import {
  apiAuthPrefix,
  authRoutes,
  DEFAULT_LOGIN_REDIRECT,
  publicApiRoutes,
  publicRoutes,
} from "@/routes";

/**
 * Shared secret for verifying the temporary auth-session JWT cookie.
 */
const AUTH_SESSION_SECRET = new TextEncoder().encode(process.env.AUTH_SECRET || "fallback-secret");

/**
 * Validates the user's NextAuth session by decoding the JWT directly in Edge Runtime.
 */
async function validateSession(req: NextRequest): Promise<boolean> {
  try {
    const token = await getToken({ req, secret: process.env.AUTH_SECRET });

    if (!token) {
      return false;
    }

    // If the token has a revocable session ID, check the Redis blacklist.
    const sessionToken = token.sessionId as string | undefined;
    if (sessionToken) {
      try {
        const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
        const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

        if (redisUrl && redisToken) {
          // Use the Upstash Redis REST API directly.
          const response = await fetch(`${redisUrl}/sismember/revoked_sessions/${sessionToken}`, {
            headers: { Authorization: `Bearer ${redisToken}` },
          });

          if (response.ok) {
            const data = await response.json();
            // Upstash REST API returns { result: 1 } if the member exists.
            if (data.result === 1) {
              return false;
            }
          }
        }
      } catch {
        // Redis check failed — allow the request through (fail-open, same as before).
      }
    }

    return true;
  } catch {
    // Fallback to cookie-existence check if JWT decoding fails unexpectedly.
    const sessionCookie =
      req.cookies.get("authjs.session-token") || req.cookies.get("__Secure-authjs.session-token");
    return !!sessionCookie;
  }
}

/**
 * Validates the temporary auth-session cookie by verifying the JWT inline with `jose`.
 */
async function validateAuthSession(req: NextRequest): Promise<boolean> {
  try {
    const token = req.cookies.get("auth-session")?.value;

    if (!token) {
      return false;
    }

    // Verify and decode the JWT.
    const { payload } = await jwtVerify(token, AUTH_SESSION_SECRET);

    // Check if the session has expired (mirrors the logic in src/lib/auth.ts).
    const expiresAt = payload.expiresAt as number | undefined;
    if (expiresAt && Date.now() > expiresAt) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * The main middleware function that enforces authentication rules across the application.
 * @param req The incoming Next.js request object.
 */
export default async function middleware(req: NextRequest) {
  const { nextUrl } = req;

  // Categorize the current route to apply specific rules
  const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix);
  const isPublicApiRoute = publicApiRoutes.includes(nextUrl.pathname);
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname);
  const isAuthRoute = authRoutes.includes(nextUrl.pathname);

  // Allow all public API routes to pass through without checks
  if (isApiAuthRoute || isPublicApiRoute) {
    return NextResponse.next();
  }

  // Validate session once for all protected routes
  const isLoggedIn = await validateSession(req);

  // Handle NextAuth error redirects for OAuth 2FA
  if (
    nextUrl.pathname === "/api/auth/error" &&
    nextUrl.searchParams.get("error") === "AccessDenied"
  ) {
    const hasAuthSession = await validateAuthSession(req);
    if (hasAuthSession) {
      return NextResponse.redirect(new URL("/signin/two-factor", nextUrl));
    }
  }

  // Handle authentication-related routes
  if (isAuthRoute) {
    // Special handling for 2FA routes - require valid auth session
    if (nextUrl.pathname === "/signin/two-factor" || nextUrl.pathname === "/signin/recovery") {
      const hasAuthSession = await validateAuthSession(req);
      if (!hasAuthSession) {
        return NextResponse.redirect(new URL("/signin?error=no-session", nextUrl));
      }
      return NextResponse.next();
    }

    // For other auth routes, redirect if already logged in
    if (isLoggedIn) {
      return NextResponse.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl));
    }
    return NextResponse.next();
  }

  // If a logged-in user tries to access a public route, redirect them to the dashboard
  if (isPublicRoute && isLoggedIn) {
    return NextResponse.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl));
  }

  // Protect all non-public routes
  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  // Update session activity for authenticated users on protected routes
  if (isLoggedIn && !isPublicRoute && !isApiAuthRoute && !isPublicApiRoute) {
    // Fire and forget. This doesn't await to avoid blocking the request
    fetch(new URL("/api/session", req.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: req.headers.get("cookie") || "",
      },
      body: JSON.stringify({}),
    }).catch(() => {
      // Session activity update failed, but don't block the request
    });
  }

  return NextResponse.next();
}

/**
 * Configures the middleware to run on specific paths
 */
export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
